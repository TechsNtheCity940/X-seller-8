import os
import logging
from modules.database import Database
import pytest
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_connection():
    """Test database connection with both SQLite and PostgreSQL"""
    # Test SQLite connection (default)
    db = Database()
    assert db.test_connection() is True
    logger.info("SQLite connection test passed")

    # Test PostgreSQL connection if credentials are provided
    if os.getenv('DB_HOST'):pip install flask==3.0.0
    pip install werkzeug==3.0.1
    pip install numpy==1.24.3
    pip install Pillow==10.1.0
    pip install pytesseract==0.3.10
    pip install pdf2image==1.16.3
    pip install python-docx==1.0.1
    pip install sqlalchemy==2.0.23
    pip install pydantic==2.5.2
    pip install price-parser==0.3.4
    pip install python-dateutil==2.8.2pip install flask==3.0.0
    pip install werkzeug==3.0.1
    pip install numpy==1.24.3
    pip install Pillow==10.1.0
    pip install pytesseract==0.3.10
    pip install pdf2image==1.16.3
    pip install python-docx==1.0.1
    pip install sqlalchemy==2.0.23
    pip install pydantic==2.5.2
    pip install price-parser==0.3.4
    pip install python-dateutil==2.8.2
        logger.info("Testing PostgreSQL connection...")
        assert db.test_connection() is True
        logger.info("PostgreSQL connection test passed")

def test_document_storage():
    """Test document storage and retrieval"""
    db = Database()
    
    # Sample document data
    test_data = {
        "prices": [
            {"amount": 100.50, "currency": "USD"},
            {"amount": 200.75, "currency": "USD"}
        ],
        "quantities": [
            {"value": 5, "unit": "pieces"},
            {"value": 10, "unit": "kg"}
        ],
        "dates": [
            {"text": "2025-01-05", "type": "invoice_date"},
            {"text": "2025-02-05", "type": "due_date"}
        ],
        "products": [
            {"name": "Product A", "type": "PRODUCT"},
            {"name": "Product B", "type": "PRODUCT"}
        ]
    }

    # Store document
    doc_id = db.store_document_data(
        filename="test_document.pdf",
        original_path="/path/to/test_document.pdf",
        extracted_data=test_data
    )
    assert doc_id is not None
    logger.info(f"Document stored with ID: {doc_id}")

    # Retrieve document
    doc = db.get_document(doc_id)
    assert doc is not None
    assert doc["filename"] == "test_document.pdf"
    assert len(doc["extracted_data"]["prices"]) == 2
    assert len(doc["extracted_data"]["quantities"]) == 2
    logger.info("Document retrieval test passed")

def test_invalid_data():
    """Test data validation"""
    db = Database()
    
    # Test missing required fields
    invalid_data = {
        "prices": [
            {"invalid_field": 100.50}  # Missing 'amount' field
        ]
    }

    with pytest.raises(ValueError):
        db.store_document_data(
            filename="invalid_document.pdf",
            original_path="/path/to/invalid_document.pdf",
            extracted_data=invalid_data
        )
    logger.info("Invalid data validation test passed")

def test_statistics():
    """Test statistics calculation"""
    db = Database()
    
    # Get initial statistics
    initial_stats = db.get_statistics()
    
    # Add test documents
    test_data = {
        "prices": [{"amount": 100.50}],
        "quantities": [{"value": 5}],
        "dates": [],
        "products": [{"name": "Test Product"}]
    }

    # Store multiple documents
    for i in range(3):
        db.store_document_data(
            filename=f"test_doc_{i}.pdf",
            original_path=f"/path/to/test_doc_{i}.pdf",
            extracted_data=test_data
        )

    # Get updated statistics
    final_stats = db.get_statistics()
    
    # Verify statistics
    assert final_stats["total_documents"] >= initial_stats["total_documents"] + 3
    assert final_stats["total_prices"] >= initial_stats["total_prices"] + (100.50 * 3)
    assert final_stats["total_quantities"] >= initial_stats["total_quantities"] + (5 * 3)
    logger.info("Statistics calculation test passed")

if __name__ == "__main__":
    try:
        logger.info("Starting database tests...")
        test_database_connection()
        test_document_storage()
        test_invalid_data()
        test_statistics()
        logger.info("All database tests passed successfully!")
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        raise
