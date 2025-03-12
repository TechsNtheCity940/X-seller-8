"""
Simplified Flask API for X-Seller-8 Inventory Management System
This version uses simple_scanner.py instead of the full NLP pipeline
"""

from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime
from pathlib import Path
import json
import threading
from queue import Queue
import time
import sys

# Import the simple scanner components
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from simple_scanner import process_document, format_inventory_items

# Initialize Flask application
app = Flask(__name__)

# Configuration
class Config:
    UPLOAD_FOLDER = Path("storage/uploads")
    PROCESSED_FOLDER = Path("storage/processed")
    OUTPUT_FOLDER = Path("output")  # For the simple scanner output
    LOG_FOLDER = Path("logs")
    ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpeg', 'jpg', 'tiff', 'xlsx', 'csv', 'docx', 'txt'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    PROCESSING_TIMEOUT = 300  # 5 minutes
    BATCH_SIZE = 5  # Number of files to process in parallel

# Create required directories
for folder in [Config.UPLOAD_FOLDER, Config.PROCESSED_FOLDER, Config.LOG_FOLDER, Config.OUTPUT_FOLDER]:
    os.makedirs(folder, exist_ok=True)
    print(f"Created or verified directory: {folder}")

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

# Processing queue and status tracking
processing_queue = Queue()
processing_status = {}
processing_thread = None

def allowed_file(filename, allowed_extensions):
    """Check if a filename has an allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

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
        
        # Process document using the simple scanner
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = Config.OUTPUT_FOLDER
        
        # Process document
        try:
            extracted_data = process_document(file_path)
            inventory_items = format_inventory_items(extracted_data)
            
            # Save extracted data
            raw_output_path = output_dir / f"{timestamp}_extracted_data.json"
            with open(raw_output_path, 'w', encoding='utf-8') as f:
                json.dump(extracted_data, f, indent=2)
                
            # Save inventory items
            inventory_output_path = output_dir / f"{timestamp}_inventory_data.json"
            with open(inventory_output_path, 'w', encoding='utf-8') as f:
                json.dump(inventory_items, f, indent=2)
            
            # Save a copy for the Express server to find
            with open('inventory_data.json', 'w', encoding='utf-8') as f:
                json.dump(inventory_items, f, indent=2)
            
            # Store status information
            processing_status[status_key].update({
                'status': 'completed',
                'timestamp': timestamp,
                'extracted_data_path': str(raw_output_path),
                'inventory_data_path': str(inventory_output_path),
                'item_count': len(inventory_items),
                'completion_time': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error processing document: {str(e)}", exc_info=True)
            processing_status[status_key].update({
                'status': 'failed',
                'error': str(e),
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

@app.route('/', methods=['GET'])
def index():
    """Root endpoint providing basic interface and information"""
    return f"""
    <html>
        <head>
            <title>X-Seller-8 Inventory Management System</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }}
                .container {{ max-width: 800px; margin: 0 auto; }}
                h1 {{ color: #2c3e50; }}
                h2 {{ color: #3498db; margin-top: 30px; }}
                pre {{ background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }}
                .endpoint {{ background: #e9f7fe; padding: 10px; margin-bottom: 10px; border-left: 4px solid #3498db; }}
                .endpoint code {{ font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>X-Seller-8 Inventory Management System</h1>
                <p>This is the document processing API for the X-Seller-8 Inventory Management System. It extracts data from uploaded documents and provides structured inventory information.</p>
                
                <h2>Current Status</h2>
                <p>API is running in simple mode (lightweight document processing)</p>
                <p>Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p>Documents in processing queue: {processing_queue.qsize()}</p>
                <p>Processed documents: {len([s for s in processing_status.values() if s.get('status') == 'completed'])}</p>
                
                <h2>Available Endpoints</h2>
                <div class="endpoint">
                    <code>GET /health</code> - Health check endpoint
                </div>
                <div class="endpoint">
                    <code>POST /upload</code> - Upload documents for processing
                </div>
                <div class="endpoint">
                    <code>GET /status/&lt;status_key&gt;</code> - Check processing status
                </div>
                <div class="endpoint">
                    <code>GET /documents</code> - List all processed documents
                </div>
                <div class="endpoint">
                    <code>GET /documents/&lt;doc_id&gt;</code> - Get specific document data
                </div>
                <div class="endpoint">
                    <code>GET /statistics</code> - Get processing statistics
                </div>
                
                <h2>Express Server</h2>
                <p>The Express server providing the web interface is available at: <a href="http://localhost:5001" target="_blank">http://localhost:5001</a></p>
            </div>
        </body>
    </html>
    """

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "queue_size": processing_queue.qsize(),
        "version": "simple"
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
        # Return information about all processed documents
        documents = []
        for key, value in processing_status.items():
            if value.get('status') == 'completed':
                documents.append({
                    'id': key,
                    'filename': value.get('filename'),
                    'processed_at': value.get('completion_time'),
                    'item_count': value.get('item_count', 0),
                    'status': 'completed'
                })
        
        return jsonify({"documents": documents}), 200
    except Exception as e:
        logger.error(f"Error retrieving documents: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/documents/<doc_id>', methods=['GET'])
def get_document(doc_id):
    """Retrieve specific document data"""
    try:
        status = processing_status.get(doc_id)
        if not status or status.get('status') != 'completed':
            return jsonify({"error": "Document not found"}), 404
            
        inventory_path = status.get('inventory_data_path')
        if inventory_path and os.path.exists(inventory_path):
            with open(inventory_path, 'r') as f:
                inventory_data = json.load(f)
                
            return jsonify({
                "id": doc_id,
                "filename": status.get('filename'),
                "processed_at": status.get('completion_time'),
                "extracted_data": {
                    "products": [{"name": item.get("itemName")} for item in inventory_data],
                    "prices": [{"amount": item.get("price")} for item in inventory_data],
                    "quantities": [{"value": item.get("ordered")} for item in inventory_data],
                    "dates": [{"text": status.get('completion_time')}]
                },
                "summary": {
                    "total_prices": sum(item.get("price", 0) for item in inventory_data),
                    "total_quantities": sum(item.get("ordered", 0) for item in inventory_data),
                    "num_products": len(inventory_data),
                    "num_dates": 1
                }
            }), 200
        else:
            return jsonify({"error": "Document data file not found"}), 404
    except Exception as e:
        logger.error(f"Error retrieving document {doc_id}: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/statistics', methods=['GET'])
def get_statistics():
    """Get processing statistics"""
    try:
        completed_docs = [s for s in processing_status.values() if s.get('status') == 'completed']
        
        # Load inventory data
        inventory_items = []
        for doc in completed_docs:
            path = doc.get('inventory_data_path')
            if path and os.path.exists(path):
                try:
                    with open(path, 'r') as f:
                        items = json.load(f)
                        inventory_items.extend(items)
                except:
                    pass
        
        # Calculate statistics
        stats = {
            "total_documents": len(completed_docs),
            "queue_size": processing_queue.qsize(),
            "active_processes": len([s for s in processing_status.values() if s.get('status') == 'processing']),
            "total_prices": sum(item.get("price", 0) for item in inventory_items),
            "total_quantities": sum(item.get("ordered", 0) for item in inventory_items),
            "total_products": len(inventory_items)
        }
        
        return jsonify(stats), 200
    except Exception as e:
        logger.error(f"Error retrieving statistics: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Find an available port
    port = 5000
    while port < 5100:
        try:
            app.run(debug=False, host='0.0.0.0', port=port)
            break
        except OSError:
            port += 1
            print(f"Port {port-1} is busy, trying port {port}...")
