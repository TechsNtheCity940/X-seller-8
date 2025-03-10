from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime
from pathlib import Path
import json
from typing import Optional, List
import threading
from queue import Queue
import time

# Import our modules
from modules.document_processor import DocumentProcessor
from modules.data_extractor import DataExtractor
from modules.database import Database
from modules.utils import allowed_file, create_directory, get_file_size

# Initialize Flask application
app = Flask(__name__)

# Configuration
class Config:
    UPLOAD_FOLDER = Path("storage/uploads")
    PROCESSED_FOLDER = Path("storage/processed")
    LOG_FOLDER = Path("logs")
    ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpeg', 'jpg', 'tiff', 'xlsx', 'csv', 'docx'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    PROCESSING_TIMEOUT = 300  # 5 minutes
    BATCH_SIZE = 10  # Number of files to process in parallel

# Create required directories
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
db = Database()

# Processing queue and status tracking
processing_queue = Queue()
processing_status = {}
processing_thread = None

def process_queue():
    """Background thread for processing documents"""
    while True:
        try:
            if not processing_queue.empty():
                batch = []
                batch_size = min(Config.BATCH_SIZE, processing_queue.qsize())
                
                # Collect batch of files
                for _ in range(batch_size):
                    if not processing_queue.empty():
                        batch.append(processing_queue.get())

                # Process batch in parallel
                threads = []
                for file_info in batch:
                    thread = threading.Thread(
                        target=process_single_document,
                        args=(file_info,)
                    )
                    thread.start()
                    threads.append(thread)

                # Wait for all threads to complete
                for thread in threads:
                    thread.join()

            time.sleep(1)  # Prevent CPU overuse
        except Exception as e:
            logger.error(f"Error in processing queue: {str(e)}", exc_info=True)

def process_single_document(file_info):
    """Process a single document"""
    try:
        file_path = file_info['file_path']
        status_key = file_info['status_key']
        
        processing_status[status_key]['status'] = 'processing'
        
        # Process document
        processed_data = document_processor.process(file_path)
        extracted_data = data_extractor.extract(processed_data)
        
        # Store in database
        doc_id = db.store_document_data(
            filename=file_info['filename'],
            original_path=str(file_path),
            extracted_data=extracted_data
        )
        
        processing_status[status_key].update({
            'status': 'completed',
            'document_id': doc_id,
            'completion_time': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error processing document {file_path}: {str(e)}", exc_info=True)
        processing_status[status_key].update({
            'status': 'failed',
            'error': str(e),
            'completion_time': datetime.utcnow().isoformat()
        })

# Start processing thread
processing_thread = threading.Thread(target=process_queue, daemon=True)
processing_thread.start()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "queue_size": processing_queue.qsize(),
        "database_status": "connected" if db.test_connection() else "disconnected"
    })

@app.route('/upload', methods=['POST'])
def upload_files():
    """Handle single or multiple file uploads"""
    try:
        if 'files' not in request.files:
            return jsonify({"error": "No files provided"}), 400
        
        files = request.files.getlist('files')
        if not files:
            return jsonify({"error": "No files selected"}), 400

        results = []
        for file in files:
            if file and allowed_file(file.filename, Config.ALLOWED_EXTENSIONS):
                filename = secure_filename(file.filename)
                timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
                unique_filename = f"{timestamp}_{filename}"
                
                file_path = Config.UPLOAD_FOLDER / unique_filename
                file.save(file_path)
                
                # Generate status key
                status_key = f"{timestamp}_{filename}"
                processing_status[status_key] = {
                    'status': 'queued',
                    'filename': filename,
                    'upload_time': datetime.utcnow().isoformat()
                }
                
                # Add to processing queue
                processing_queue.put({
                    'file_path': file_path,
                    'filename': filename,
                    'status_key': status_key
                })
                
                results.append({
                    'filename': filename,
                    'status_key': status_key,
                    'status': 'queued'
                })
            else:
                results.append({
                    'filename': file.filename,
                    'status': 'rejected',
                    'reason': 'Invalid file type'
                })

        return jsonify({
            "message": "Files uploaded successfully",
            "results": results
        }), 200

    except Exception as e:
        logger.error(f"Error in file upload: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/status/<status_key>', methods=['GET'])
def get_status(status_key):
    """Get processing status for a specific file"""
    status = processing_status.get(status_key)
    if not status:
        return jsonify({"error": "Status key not found"}), 404
    return jsonify(status), 200

@app.route('/documents', methods=['GET'])
def get_documents():
    """Retrieve list of processed documents with optional filtering"""
    try:
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        status = request.args.get('status')
        
        documents = db.get_all_documents()
        
        # Apply filters if provided
        if start_date:
            documents = [d for d in documents if d['processed_at'] >= start_date]
        if end_date:
            documents = [d for d in documents if d['processed_at'] <= end_date]
        if status:
            documents = [d for d in documents if d.get('status') == status]
            
        return jsonify({"documents": documents}), 200
    except Exception as e:
        logger.error(f"Error retrieving documents: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

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
        return jsonify({"error": str(e)}), 500

@app.route('/statistics', methods=['GET'])
def get_statistics():
    """Get processing statistics"""
    try:
        stats = db.get_statistics()
        stats.update({
            "queue_size": processing_queue.qsize(),
            "active_processes": len([s for s in processing_status.values() 
                                  if s['status'] == 'processing'])
        })
        return jsonify(stats), 200
    except Exception as e:
        logger.error(f"Error retrieving statistics: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
