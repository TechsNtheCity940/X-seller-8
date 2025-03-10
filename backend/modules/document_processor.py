import os
from PIL import Image
import pytesseract
from pdf2image import convert_from_path
from docx import Document
import logging

logger = logging.getLogger(__name__)

class DocumentProcessor:
    def __init__(self):
        self.supported_formats = {
            'pdf': self._process_pdf,
            'png': self._process_image,
            'jpg': self._process_image,
            'jpeg': self._process_image,
            'tiff': self._process_image,
            'docx': self._process_docx
        }

    def process(self, file_path):
        """Process a document and extract its text content"""
        try:
            file_extension = os.path.splitext(file_path)[1][1:].lower()
            
            if file_extension not in self.supported_formats:
                raise ValueError(f"Unsupported file format: {file_extension}")
            
            processor = self.supported_formats[file_extension]
            return processor(file_path)
            
        except Exception as e:
            logger.error(f"Error processing document {file_path}: {str(e)}")
            raise

    def _process_pdf(self, file_path):
        """Extract text from PDF files"""
        try:
            # Convert PDF to images
            images = convert_from_path(file_path)
            text = []
            
            # Process each page
            for image in images:
                page_text = pytesseract.image_to_string(image)
                text.append(page_text)
            
            return '\n'.join(text)
            
        except Exception as e:
            logger.error(f"Error processing PDF {file_path}: {str(e)}")
            raise

    def _process_image(self, file_path):
        """Extract text from image files"""
        try:
            image = Image.open(file_path)
            return pytesseract.image_to_string(image)
            
        except Exception as e:
            logger.error(f"Error processing image {file_path}: {str(e)}")
            raise

    def _process_docx(self, file_path):
        """Extract text from DOCX files"""
        try:
            doc = Document(file_path)
            return '\n'.join([paragraph.text for paragraph in doc.paragraphs])
            
        except Exception as e:
            logger.error(f"Error processing DOCX {file_path}: {str(e)}")
            raise
