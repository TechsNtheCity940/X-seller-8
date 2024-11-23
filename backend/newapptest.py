import os
import re
import json
import shutil
from pdfminer.high_level import extract_text
import pytesseract
from PIL import Image
import pandas as pd
import docx2txt
import openpyxl
import cv2
import pdfplumber

# Set up Tesseract OCR
pytesseract.pytesseract.tesseract_cmd = r"C:/Users/wonde/AppData/Local/Programs/Tesseract-OCR/tesseract.exe"

# PDF Table Extraction
def extract_pdf_tables(pdf_file):
    with pdfplumber.open(pdf_file) as pdf:
        tables = []
        for page in pdf.pages:
            table = page.extract_table()
            if table:
                tables.append(pd.DataFrame(table[1:], columns=table[0]))
    return tables

# OCR on Image
def extract_image_text(image_file):
    img = Image.open(image_file)
    return pytesseract.image_to_string(img)

def extract_image_tables(image_file):
    img = cv2.imread(image_file)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    tables = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        roi = thresh[y:y+h, x:x+w]
        roi_text = pytesseract.image_to_string(roi, config='--psm 6')
        tables.append(roi_text.strip())
    return tables

# Save tables to Excel
def save_tables_to_excel(tables, output_file):
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        for i, table in enumerate(tables):
            table.to_excel(writer, sheet_name=f'Sheet{i+1}', index=False)

# Process Files
def process_files(input_folder, output_folder):
    os.makedirs(output_folder, exist_ok=True)
    all_text = ""

    for root, dirs, files in os.walk(input_folder):
        for file in files:
            file_path = os.path.join(root, file)
            file_name, file_extension = os.path.splitext(file)
            output_file = os.path.join(output_folder, f"{file_name}_processed.xlsx")

            try:
                if file_extension.lower() == '.pdf':
                    tables = extract_pdf_tables(file_path)
                    save_tables_to_excel(tables, output_file)

                elif file_extension.lower() in ['.jpg', '.jpeg', '.png']:
                    tables = extract_image_tables(file_path)
                    save_tables_to_excel([pd.DataFrame(tables)], output_file)

                all_text += f"Processed {file}\n"

            except Exception as e:
                print(f"Error processing {file}: {e}")

    text_output_file = os.path.join(output_folder, "all_extracted_text.txt")
    with open(text_output_file, 'w') as file:
        file.write(all_text)
    print(f"All processed text saved to {text_output_file}")

# Example usage:
input_folder = r'F:/repogit/X-seller-8/frontend/public/uploads/invoices 9.24.22.pdf'
output_file = r'F:/repogit/X-seller-8/frontend/testcodes/tetfiles/BEKextracted.txt'
process_files(input_folder, output_file)