import os
import re
from PIL import Image
from pdf2image import convert_from_path
import pytesseract
from camelot.io import read_pdf
from camelot.core import Table
import pandas as pd
from pdfplumber import open as pdf_open
import openpyxl
import xlrd
import csv

# **Step 1: File Type Detection & Preprocessing**

def detect_file_type(file_path):
    """Identifies the file type and initiates appropriate preprocessing."""
    file_extension = file_path.split('.')[-1].lower()
    if file_extension in ['png', 'jpg', 'jpeg', 'bmp', 'tiff']:  # Images
        return preprocess_image(file_path)
    elif file_extension == 'pdf':  # PDF
        return preprocess_pdf(file_path)
    elif file_extension in ['xlsx', 'xls']:  # Excel
        return preprocess_excel(file_path)
    elif file_extension == 'csv':  # CSV
        return preprocess_csv(file_path)
    elif file_extension == 'txt':  # Text
        return preprocess_txt(file_path)
    else:
        print(f"Unsupported file type: {file_extension}")
        return None

# **Preprocessing Functions for Each File Type**

def preprocess_image(file_path):
    """Extracts text from images using OCR."""
    text = pytesseract.image_to_string(Image.open(file_path))
    return clean_text(text)

def preprocess_pdf(file_path):
    """Extracts text and tables from PDFs."""
    text = ''
    with pdf_open(file_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text()
    tables = extract_tables_from_pdf(file_path)
    return clean_text(text), tables

def preprocess_excel(file_path):
    """Extracts data from Excel files."""
    if file_path.endswith('.xlsx'):
        wb = openpyxl.load_workbook(file_path)
        sheet = wb['Sheet1']
        data = [[cell.value for cell in row] for row in sheet.rows]
    elif file_path.endswith('.xls'):
        wb = xlrd.open_workbook(file_path)
        sheet = wb.sheet_by_index(0)
        data = [[cell.value for cell in row] for row in sheet.get_rows()]
    return data

def preprocess_csv(file_path):
    """Reads data from CSV files."""
    with open(file_path, 'r') as file:
        reader = csv.reader(file)
        data = list(reader)
    return data

def preprocess_txt(file_path):
    """Reads plain text files."""
    with open(file_path, 'r') as file:
        text = file.read()
    return clean_text(text)

# **Shared Functions**

def clean_text(text):
    """Basic text cleaning."""
    return re.sub(r'[\n\r]+', ', text')

def extract_tables_from_pdf(file_path):
    """Uses camelot-py for table extraction from PDFs."""
    try:
        tables = read_pdf(file_path, pages='all')
        return tables
    except Exception as e:
        print(f"Table extraction failed: {e}")
        return []

def process_table(table):
    """Identifies columns and extracts relevant data (same as before)."""
    #... (unchanged code)

# **Main Execution**

def main(file_path):
    data = detect_file_type(file_path)
    if data:
        if isinstance(data, tuple):  # PDF with text and tables
            text, tables = data
            print("Extracted Text:", text)
            for table in tables:
                processed_data = process_table(table.df)
                # Export or process further
                print("Processed Table Data:", processed_data)
        elif isinstance(data, list):  # Excel, CSV, or processed tables
            for item in data:
                if isinstance(item, list):  # Table rows
                    print("Table Row:", item)
                else:
                    print("Data Item:", item)
        else:  # Image or Text
            print("Extracted Text:", data)

if __name__ == "__main__":
    file_path = r'F:/repogit/X-seller-8/frontend/testcodes/tetfiles/BEK.png'  # Update this
    main(file_path)
