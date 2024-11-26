
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
import pytesseract
from PyPDF2 import PdfReader
import pandas as pd
from openpyxl import Workbook, load_workbook
from datetime import datetime

# Initialize Flask application
app = Flask(__name__)
UPLOAD_FOLDER = "/mnt/data/uploads"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpeg', 'jpg', 'txt', 'xlsx', 'csv'}

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Helper functions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def process_pdfs(file_path):
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text

def process_images(file_path):
    return pytesseract.image_to_string(file_path)

def process_excel(file_path):
    df = pd.read_excel(file_path)
    return df.to_dict(orient="records")

# File upload endpoint
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        return jsonify({"message": "File uploaded successfully", "filepath": filepath}), 200
    else:
        return jsonify({"error": "Invalid file type"}), 400

@app.route('/process', methods=['POST'])
def process_file():
    filepath = request.json.get("filepath")
    if not filepath or not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 400
    file_ext = filepath.rsplit('.', 1)[1].lower()
    if file_ext in ['pdf', 'png', 'jpeg', 'jpg']:
        content = process_pdfs(filepath) if file_ext == 'pdf' else process_images(filepath)
    elif file_ext in ['xlsx']:
        content = process_excel(filepath)
    else:
        return jsonify({"error": "Unsupported file type"}), 400
    return jsonify({"message": "File processed successfully", "content": content}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
