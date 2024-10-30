import os
import re
import csv
import json
import shutil
from pdfminer.high_level import extract_text
import pytesseract
from PIL import Image
import pandas as pd
import docx2txt
import openpyxl
import cv2
import numpy as np
import pdfplumber
import camelot

# Set up Tesseract OCR
pytesseract.pytesseract.tesseract_cmd = r"C:/Users/wonde/AppData/Local/Programs/Tesseract-OCR/tesseract.exe"  # Replace with your Tesseract path

with pdfplumber.open("foo.pdf") as pdf:
    first_page = pdf.pages[0]
    text = first_page.extract_text()
    print(text)

# Function to extract text from PDF files
def extract_pdf_text(pdf_file):
    text = extract_text(pdf_file)
    return text

def extract_pdf_tables(pdf_file):
    tables = camelot.read_pdf(pdf_file, pages='all')
    return tables

tables = camelot.read_pdf('foo.pdf', pages='all')

# Function to extract tables from image files
def extract_image_tables(image_file):
    img = cv2.imread(image_file)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    contours, hierarchy = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    tables = []
    for cnt in contours:
        x,y,w,h = cv2.boundingRect(cnt)
        roi = thresh[y:y+h, x:x+w]
        roi = cv2.resize(roi, (400, 400))
        roi = cv2.dilate(roi, np.ones((1, 1), np.uint8), iterations=1)
        roi = cv2.erode(roi, np.ones((1, 1), np.uint8), iterations=1)
        tables.append(pytesseract.image_to_string(roi, config='--psm 6'))

    return tables

# Function to extract text from image files using OCR
def extract_image_text(image_file):
    img = Image.open(image_file)
    text = pytesseract.image_to_string(img)
    return text

# Function to extract text from.docx files
def extract_docx_text(docx_file):
    text = docx2txt.process(docx_file)
    return text

# Function to extract text from Excel files (.xlsx,.xls)
def extract_excel_text(excel_file):
    xlsx_data = pd.read_excel(excel_file, engine='openpyxl')
    text = xlsx_data.to_string(index=False, header=False)
    return text

# Function to extract text from.txt files
def extract_txt_text(txt_file):
    with open(txt_file, 'r') as file:
        text = file.read()
    return text

# Function to extract text from CSV files
def extract_csv_text(csv_file):
    with open(csv_file, 'r') as file:
        csv_reader = csv.reader(file)
        text = '\n'.join([' '.join(row) for row in csv_reader])
    return text

# Function to extract text from JSON files
def extract_json_text(json_file):
    with open(json_file, 'r') as file:
        json_data = json.load(file)
        text = json.dumps(json_data, sort_keys=True)
    return text

# Main function to process files
def process_files(input_folder, output_folder):
    all_text = ""
    text = ""
    for root, dirs, files in os.walk(input_folder):
        for file in files:
            file_path = os.path.join(root, file)
            file_name, file_extension = os.path.splitext(file_path)

            if file_extension.lower() in ['.pdf']:
                tables = extract_pdf_tables(file_path)
                output_file = os.path.join(output_folder, f"{file_name}.xlsx")
                save_tables_to_excel([tables], output_file)

            elif file_extension.lower() in ['.xlsx', '.xls']:
                output_file = os.path.join(output_folder, f"{file_name}.xlsx")
                extract_excel_data(file_path, output_file)

            elif file_extension.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.img']:
                tables = extract_image_tables(file_path)

            # Clean up text and append to all_text
            text = re.sub(r'[^\w\s]', '', text)
            all_text += text + "\n"

    # Save extracted text to the specified output file
    with open(output_file, 'w') as file:
        file.write(all_text)
    print(f"Text data saved to {output_file}")

tables[0].to_json('foo.json')
tables[0].to_excel('foo.excel')

# Function to save tables to Excel
def save_tables_to_excel(tables, output_file):
    with pd.ExcelWriter(output_file) as writer:
        for i, table in enumerate(tables):
            table.df.to_excel(writer, sheet_name=f'Sheet{i+1}', index=False, header=True)

def extract_excel_data(excel_file, output_file):
    xlsx_data = pd.read_excel(excel_file, engine='openpyxl')
    xlsx_data.to_excel(output_file, index=False, header=True)

# Example usage:
input_folder = "F:/repogit/X-seLLer-8/frontend/public/testfiles"
output_file = "F:/repogit/X-seLLer-8/frontend/public/output/newextracted.txt"
		