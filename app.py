from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler
import json
from pathlib import Path

# Import processing modules
from modules.document_processor import DocumentProcessor
from modules.data_extractor import DataExtractor
from modules.database import Database
from modules.utils import allowed_file, create_directory

# Initialize Flask application
app = Flask(__name__)

# Configuration
class Config:
    UPLOAD_FOLDER = Path("storage/uploads")
    PROCESSED_FOLDER = Path("storage/processed")
    LOG_FOLDER = Path("logs")
    ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpeg', 'jpg', 'tiff', 'xlsx', 'csv', 'docx'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    DATABASE_URL = "sqlite:///storage/database.db"

app.config.from_object(Config)

# Ensure required directories exist
for folder in [Config.UPLOAD_FOLDER, Config.PROCESSED_FOLDER, Config.LOG_FOLDER]:
    create_directory(folder)

# Configure logging
logging.basicConfig(
    handlers=[
        RotatingFileHandler(
            Config.LOG_FOLDER / 'app.log',
            maxBytes=10000000,
            backupCount=5
        )
    ],
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Initialize components
document_processor = DocumentProcessor()
data_extractor = DataExtractor()
db = Database(Config.DATABASE_URL)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "timestamp": datetime.utcnow().isoformat()})

@app.route('/upload', methods=['POST'])
def upload_file():
    """
    Handle file uploads and initiate processing
    Returns processed data including extracted text, tables, and metadata
    """
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if not file or not allowed_file(file.filename, Config.ALLOWED_EXTENSIONS):
            return jsonify({"error": "Invalid file type"}), 400

        # Secure the filename and create paths
        filename = secure_filename(file.filename)
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        
        upload_path = Config.UPLOAD_FOLDER / unique_filename
        file.save(upload_path)
        
        logger.info(f"File uploaded successfully: {unique_filename}")

        # Process the document
        processed_data = document_processor.process(upload_path)
        
        # Extract structured data
        extracted_data = data_extractor.extract(processed_data)
        
        # Store results in database
        doc_id = db.store_document_data(
            filename=unique_filename,
            original_path=str(upload_path),
            extracted_data=extracted_data
        )

        return jsonify({
            "message": "File processed successfully",
            "document_id": doc_id,
            "extracted_data": extracted_data
        }), 200

    except Exception as e:
        logger.error(f"Error processing file: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/documents', methods=['GET'])
def get_documents():
    """Retrieve list of processed documents"""
    try:
        documents = db.get_all_documents()
        return jsonify({"documents": documents}), 200
    except Exception as e:
        logger.error(f"Error retrieving documents: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/documents/<doc_id>', methods=['GET'])
def get_document(doc_id):
    """Retrieve specific document data"""
    try:
        document = db.get_document(doc_id)
        if not document:
            return jsonify({"error": "Document not found"}), 404
        return jsonify(document), 200
    except Exception as e:
        logger.error(f"Error retrieving document {doc_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/statistics', methods=['GET'])
def get_statistics():
    """Get processing statistics"""
    try:
        stats = db.get_statistics()
        return jsonify(stats), 200
    except Exception as e:
        logger.error(f"Error retrieving statistics: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
