import os
import re
from PIL import Image
from pdf2image import convert_from_path
import pytesseract
from camelot.io import read_pdf
import pdfplumber
import pandas as pd
import openpyxl
import xlrd
import csv
from camelot.core import Table
# Set up Tesseract OCR path if needed
pytesseract.pytesseract.tesseract_cmd = r"C:/Users/wonde/AppData/Local/Programs/Tesseract-OCR/tesseract.exe"

# **Step 1: File Type Detection & Preprocessing**
def detect_file_type(file_path):
    """Identifies the file type and initiates appropriate preprocessing."""
    file_extension = file_path.split('.')[-1].lower()
    try:
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
    except Exception as e:
        print(f"Error processing file: {file_path}. Error: {e}")
        return None

# **Preprocessing Functions for Each File Type**
def preprocess_image(file_path):
    """Extracts text from images using OCR."""
    try:
        text = pytesseract.image_to_string(Image.open(file_path))
        return clean_text(text)
    except Exception as e:
        print(f"Error processing image: {e}")
        return None

def preprocess_pdf(file_path):
    """Extracts text and tables from PDFs."""
    text = ''
    tables = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ''
        tables = extract_tables_from_pdf(file_path)
    except Exception as e:
        print(f"Error processing PDF: {e}")
    return clean_text(text), tables

def preprocess_excel(file_path):
    """Extracts data from Excel files."""
    try:
        if file_path.endswith('.xlsx'):
            wb = openpyxl.load_workbook(file_path)
            data = {sheet: [[cell.value for cell in row] for row in wb[sheet].rows] for sheet in wb.sheetnames}
        elif file_path.endswith('.xls'):
            wb = xlrd.open_workbook(file_path)
            data = {sheet: [[cell.value for cell in row] for row in wb.sheet_by_name(sheet)] for sheet in wb.sheet_names()}
        return data
    except Exception as e:
        print(f"Error processing Excel file: {e}")
        return None

def preprocess_csv(file_path):
    """Reads data from CSV files."""
    try:
        with open(file_path, 'r') as file:
            reader = csv.reader(file)
            data = list(reader)
        return data
    except Exception as e:
        print(f"Error processing CSV file: {e}")
        return None

def preprocess_txt(file_path):
    """Reads plain text files."""
    try:
        with open(file_path, 'r') as file:
            text = file.read()
        return clean_text(text)
    except Exception as e:
        print(f"Error processing text file: {e}")
        return None

# **Shared Functions**
def clean_text(text):
    """Basic text cleaning."""
    return re.sub(r'[\n\r]+', ' ', text).strip()

def extract_tables_from_pdf(file_path):
    """Uses Camelot for table extraction from PDFs."""
    try:
        tables = camelot.read_pdf(file_path, pages='1')
        for i, table in enumerate(tables):
            print(f"Table {i}:\n", table.df)
    except Exception as e:
        print(f"Table extraction failed: {e}")
        return []

# **Export Functions**
def save_to_excel(data, output_path):
    """Saves structured data to an Excel file."""
    try:
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            if isinstance(data, dict):  # Multiple sheets
                for sheet_name, sheet_data in data.items():
                    pd.DataFrame(sheet_data).to_excel(writer, sheet_name=sheet_name, index=False)
            elif isinstance(data, list):  # Single sheet
                pd.DataFrame(data).to_excel(writer, index=False)
    except Exception as e:
        print(f"Error saving to Excel: {e}")

# **Main Execution**
def main(file_path):
    data = detect_file_type(file_path)
    if data:
        if isinstance(data, tuple):  # PDF with text and tables
            text, tables = data
            print("Extracted Text:", text[:1000])  # Preview text
            for i, table in enumerate(tables):
                print(f"Table {i}:\n", table)
        elif isinstance(data, dict):  # Excel data (multiple sheets)
            for sheet, rows in data.items():
                print(f"Sheet: {sheet}")
                for row in rows:
                    print(row)
        elif isinstance(data, list):  # CSV or single table
            for row in data:
                print(row)
        else:  # Image or Text
            print("Extracted Text:", data[:1000])  # Preview text

if __name__ == "__main__":
    file_path = r'F:\repogit\X-seller-8\frontend\public\uploads'  # Update this
    main(file_path)

