import fitz
from PIL import Image
import pytesseract
import os
from typing import Optional, List, Dict, Union
from pathlib import Path
from utils.logger import setup_logger
from prometheus_client import Counter, Histogram, start_http_server
import time
import hashlib
import magic
import concurrent.futures
from tqdm import tqdm
from config import config

# Initialize metrics
CONVERSION_TIME = Histogram('pdf_conversion_duration_seconds', 'Time spent processing PDF')
CONVERSION_ERRORS = Counter('pdf_conversion_errors_total', 'Total conversion errors')
PAGES_PROCESSED = Counter('pdf_pages_processed_total', 'Total pages processed')

# Initialize logger
logger = setup_logger("pdf_conversion")

class PDFConversionError(Exception):
    """Custom exception for PDF conversion errors"""
    def __init__(self, message: str, error_code: str, details: Optional[Dict] = None):
        super().__init__(message)
        self.error_code = error_code
        self.details = details or {}

class SecurityError(Exception):
    """Custom exception for security-related errors"""
    pass

class PDFConverter:
    def __init__(self, tesseract_path: Optional[str] = None):
        """Initialize PDF converter with configuration and metrics"""
        self.config = config.processing.pdf
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        
        self.validate_tesseract()
        self.init_monitoring()
        self.mime = magic.Magic(mime=True)
        self.temp_dir = Path(config.paths.temp)
        self.temp_dir.mkdir(exist_ok=True)

    def init_monitoring(self) -> None:
        """Initialize monitoring if enabled"""
        if config.monitoring.enabled:
            try:
                start_http_server(config.monitoring.metricsPort)
                logger.info(f"Metrics server started on port {config.monitoring.metricsPort}")
            except Exception as e:
                logger.error(f"Failed to start metrics server: {e}")

    def validate_tesseract(self) -> None:
        """Validate Tesseract installation"""
        try:
            pytesseract.get_tesseract_version()
        except Exception as e:
            raise PDFConversionError(
                "Tesseract not properly configured", 
                "TESSERACT_ERROR",
                {"original_error": str(e)}
            )

    def validate_file(self, file_path: Path) -> None:
        """
        Validate file security and content
        
        Args:
            file_path: Path to the file to validate
            
        Raises:
            SecurityError: If file validation fails
        """
        try:
            # Check file size
            if file_path.stat().st_size > self.config.maxFileSize:
                raise SecurityError("File exceeds maximum allowed size")

            # Check file extension
            if file_path.suffix.lower() not in self.config.allowedExtensions:
                raise SecurityError("Invalid file extension")

            # Validate file content type
            mime_type = self.mime.from_file(str(file_path))
            if mime_type != 'application/pdf':
                raise SecurityError(f"Invalid file type: {mime_type}")

            # Basic PDF structure validation
            with fitz.open(file_path) as pdf:
                if not pdf.is_pdf:
                    raise SecurityError("Invalid PDF structure")
                
                if pdf.page_count > self.config.maxPages:
                    raise SecurityError(f"PDF exceeds maximum page limit of {self.config.maxPages}")

        except Exception as e:
            raise SecurityError(f"File validation failed: {str(e)}")

    @CONVERSION_TIME.time()
    def process_pdf(self, pdf_path: Union[str, Path], output_folder: Union[str, Path]) -> List[Path]:
        """
        Process PDF file with comprehensive error handling and logging
        
        Args:
            pdf_path: Path to input PDF
            output_folder: Directory for output images
            
        Returns:
            List of paths to converted images
            
        Raises:
            PDFConversionError: If conversion fails
        """
        pdf_path = Path(pdf_path)
        output_folder = Path(output_folder)
        output_paths = []
        
        try:
            # Validate input
            self.validate_file(pdf_path)
            output_folder.mkdir(parents=True, exist_ok=True)

            with fitz.open(pdf_path) as pdf_document:
                total_pages = pdf_document.page_count
                logger.info(f"Starting conversion of {pdf_path.name} ({total_pages} pages)")
                
                for page_num in range(total_pages):
                    try:
                        output_path = self._process_page(
                            pdf_document, 
                            page_num, 
                            output_folder
                        )
                        if output_path:
                            output_paths.append(output_path)
                            PAGES_PROCESSED.inc()
                            
                    except Exception as e:
                        logger.error(f"Error processing page {page_num + 1}", 
                                   extra={"error": str(e)})
                        CONVERSION_ERRORS.inc()
                        continue

            return output_paths
            
        except Exception as e:
            CONVERSION_ERRORS.inc()
            raise PDFConversionError(
                f"Failed to process PDF {pdf_path}", 
                "CONVERSION_ERROR",
                {"original_error": str(e)}
            )

    def _process_page(self, pdf_document: fitz.Document, page_num: int, 
                     output_folder: Path) -> Optional[Path]:
        """Process a single PDF page"""
        page = pdf_document[page_num]
        pix = page.get_pixmap(dpi=self.config.dpi)
        
        # Generate secure filename
        secure_name = self._generate_secure_filename(
            pdf_document.name, 
            page_num
        )
        
        temp_path = self.temp_dir / f"{secure_name}_temp.png"
        output_path = output_folder / f"{secure_name}.png"
        
        try:
            # Save temporary image
            pix.save(str(temp_path))
            
            # Process with OCR
            with Image.open(temp_path) as img:
                try:
                    orientation_data = pytesseract.image_to_osd(img)
                    rotation_angle = self._get_rotation_angle(orientation_data)
                    
                    if rotation_angle != 0:
                        img = img.rotate(rotation_angle, expand=True)
                    
                    img.save(str(output_path), "PNG")
                    return output_path
                    
                except pytesseract.TesseractError as e:
                    logger.error(f"OCR failed for page {page_num + 1}", 
                               extra={"error": str(e)})
                    return None
                
        finally:
            # Cleanup
            if temp_path.exists():
                temp_path.unlink()

    @staticmethod
    def _generate_secure_filename(pdf_name: str, page_num: int) -> str:
        """Generate a secure filename to prevent path traversal"""
        base = Path(pdf_name).stem
        safe_name = "".join(c for c in base if c.isalnum() or c in "._- ")
        name_hash = hashlib.md5(f"{base}{page_num}".encode()).hexdigest()[:8]
        return f"{name_hash}_{safe_name}_page_{page_num + 1}"

    @staticmethod
    def _get_rotation_angle(orientation_data: str) -> int:
        """Calculate rotation angle from OCR orientation data"""
        if "Rotate: 90" in orientation_data:
            return -90
        elif "Rotate: 180" in orientation_data:
            return 180
        elif "Rotate: 270" in orientation_data:
            return -270
        return 0

def process_all_pdfs_in_folder(folder_path: Union[str, Path], 
                             output_folder: Union[str, Path]) -> Dict[str, Any]:
    """
    Process all PDFs in a folder with detailed reporting
    
    Returns:
        Dictionary containing processing results and statistics
    """
    folder_path = Path(folder_path)
    output_folder = Path(output_folder)
    converter = PDFConverter()
    
    results = {
        'successful': [],
        'failed': [],
        'total_pages': 0,
        'total_files': 0,
        'errors': []
    }
    
    try:
        pdf_files = list(folder_path.glob('*.pdf'))
        results['total_files'] = len(pdf_files)
        logger.info(f"Found {len(pdf_files)} PDF files to process")
        
        for pdf_file in pdf_files:
            try:
                output_paths = converter.process_pdf(pdf_file, output_folder)
                results['successful'].append({
                    'file': pdf_file.name,
                    'pages': len(output_paths),
                    'outputs': [str(p) for p in output_paths]
                })
                results['total_pages'] += len(output_paths)
                
            except (PDFConversionError, SecurityError) as e:
                logger.error(f"Failed to convert {pdf_file.name}", 
                           extra={"error": str(e)})
                results['failed'].append({
                    'file': pdf_file.name,
                    'error': str(e),
                    'error_code': getattr(e, 'error_code', 'UNKNOWN_ERROR')
                })
                
        logger.info("Processing completed", extra={
            'successful': len(results['successful']),
            'failed': len(results['failed']),
            'total_pages': results['total_pages']
        })
        
        return results
            
    except Exception as e:
        logger.error(f"Error processing folder {folder_path}", 
                    extra={"error": str(e)})
        raise

if __name__ == "__main__":
    try:
        folder_path = Path(config.paths.uploads)
        output_folder = Path(config.paths.outputs)
        
        results = process_all_pdfs_in_folder(folder_path, output_folder)
        print(f"Processing completed: {len(results['successful'])} successful, "
              f"{len(results['failed'])} failed")
        
    except Exception as e:
        logger.error(f"Application failed: {e}")
        raise 