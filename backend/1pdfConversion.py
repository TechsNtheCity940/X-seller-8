import fitz
from PIL import Image
import pytesseract
import os

# Set up Tesseract path if needed (for example, on Windows)
pytesseract.pytesseract.tesseract_cmd = r"C:/Users/wonde/AppData/Local/Programs/Tesseract-OCR/tesseract.exe"

def pdf_to_png(pdf_path, output_folder, dpi=200):
    """
    Converts each page of the PDF to a correctly oriented PNG.
    """
    # Load the PDF
    pdf_document = fitz.open(pdf_path)
    pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
    
    for page_num in range(pdf_document.page_count):
        # Convert each page to an image at the specified dpi
        page = pdf_document[page_num]
        pix = page.get_pixmap(dpi=dpi)
        
        # Save the initial image as a temporary PNG
        temp_img_path = os.path.join(output_folder, f"{pdf_name}_page_{page_num + 1}_temp.png")
        pix.save(temp_img_path)
        
        # Load the image with Pillow for further processing
        img = Image.open(temp_img_path)
        
        # Use OCR to detect orientation
        try:
            text_orientation = pytesseract.image_to_osd(img)
            # Check orientation angle from OCR and correct orientation
            rotation_angle = 0
            if "Rotate: 90" in text_orientation:
                rotation_angle = -90
            elif "Rotate: 180" in text_orientation:
                rotation_angle = 180
            elif "Rotate: 270" in text_orientation:
                rotation_angle = -270
            
            # Rotate image if necessary
            if rotation_angle != 0:
                img = img.rotate(rotation_angle, expand=True)
            
            # Save the correctly oriented PNG
            output_img_path = os.path.join(output_folder, f"{pdf_name}_page_{page_num + 1}.png")
            img.save(output_img_path, "PNG")
            print(f"Saved page {page_num + 1} of {pdf_name} as {output_img_path} with rotation {rotation_angle} degrees.")
        
        except pytesseract.TesseractError as e:
            print(f"OCR failed for page {page_num + 1} of {pdf_name} with error: {e}. Skipping this page.")
        
        # Cleanup temporary file
        os.remove(temp_img_path)
    
    # Close the PDF
    pdf_document.close()

def process_all_pdfs_in_folder(folder_path, output_folder):
    """
    Finds all PDF files in the specified folder and converts each to oriented PNGs.
    """
    # Ensure the output folder exists
    os.makedirs(output_folder, exist_ok=True)
    
    # Iterate over all files in the specified folder
    for filename in os.listdir(folder_path):
        if filename.lower().endswith('.pdf'):
            pdf_path = os.path.join(folder_path, filename)
            print(f"Processing {pdf_path}")
            pdf_to_png(pdf_path, output_folder)

# Example usage
folder_path = r"F:/repogit/X-seller-8/frontend/public/uploads"
output_folder = r"F:/repogit/X-seller-8/frontend/public/uploads"
process_all_pdfs_in_folder(folder_path, output_folder)