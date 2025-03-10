from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from datetime import datetime
import json
import logging
import os
from typing import Optional, Dict, List
from pydantic import BaseModel, validator
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)

# Pydantic model for data validation
class DocumentData(BaseModel):
    prices: Optional[List[Dict[str, float]]]
    quantities: Optional[List[Dict[str, float]]]
    dates: Optional[List[Dict[str, str]]]
    products: Optional[List[Dict[str, str]]]

    @validator('prices', each_item=True)
    def validate_prices(cls, v):
        if 'amount' not in v:
            raise ValueError('Price must have "amount" field')
        return v

    @validator('quantities', each_item=True)
    def validate_quantities(cls, v):
        if 'value' not in v:
            raise ValueError('Quantity must have "value" field')
        return v

Base = declarative_base()

class Document(Base):
    __tablename__ = 'documents'

    id = Column(Integer, primary_key=True)
    filename = Column(String, nullable=False)
    original_path = Column(String, nullable=False)
    processed_at = Column(DateTime, default=datetime.utcnow)
    extracted_data = Column(JSON)
    
    # Extracted data summary
    total_prices = Column(Float, default=0.0)
    total_quantities = Column(Float, default=0.0)
    num_dates = Column(Integer, default=0)
    num_products = Column(Integer, default=0)

class Database:
    def __init__(self):
        # Use SQLite for local development if no database credentials are provided
        if not os.getenv('DB_HOST'):
            self.engine = create_engine(
                'sqlite:///local.db',
                connect_args={'check_same_thread': False}
            )
        else:
            # Construct connection string from environment variables for PostgreSQL
            db_host = os.getenv('DB_HOST', 'localhost')
            db_port = os.getenv('DB_PORT', '5432')
            db_name = os.getenv('DB_NAME', 'xseller8')
            db_user = os.getenv('DB_USER', 'postgres')
            db_password = quote_plus(os.getenv('DB_PASSWORD', ''))
            
            self.engine = create_engine(
                f'postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}',
                poolclass=QueuePool,
                pool_size=5,
                max_overflow=10,
                pool_timeout=30,
                pool_pre_ping=True,
                pool_recycle=3600,
                connect_args={
                    'sslmode': 'require',
                    'sslrootcert': 'config/ca-certificate.crt'
                }
            )
        
        try:
            Base.metadata.create_all(self.engine)
            self.Session = sessionmaker(bind=self.engine)
            logger.info("Database connection established successfully")
        except Exception as e:
            logger.error(f"Failed to connect to database: {str(e)}")
            raise

    def store_document_data(self, filename: str, original_path: str, extracted_data: dict) -> int:
        """Store document data and return document ID"""
        try:
            # Validate input data
            validated_data = DocumentData(**extracted_data)
            
            session = self.Session()

            # Calculate summary statistics
            total_prices = sum(price['amount'] for price in validated_data.prices or [])
            total_quantities = sum(qty['value'] for qty in validated_data.quantities or [])
            num_dates = len(validated_data.dates or [])
            num_products = len(validated_data.products or [])

            document = Document(
                filename=filename,
                original_path=original_path,
                extracted_data=extracted_data,
                total_prices=total_prices,
                total_quantities=total_quantities,
                num_dates=num_dates,
                num_products=num_products
            )

            session.add(document)
            session.commit()
            doc_id = document.id
            session.close()
            
            return doc_id

        except Exception as e:
            logger.error(f"Error storing document data: {str(e)}", exc_info=True)
            if session:
                session.rollback()
                session.close()
            raise

    def get_document(self, doc_id: int) -> dict:
        """Retrieve document data by ID"""
        try:
            session = self.Session()
            document = session.query(Document).filter(Document.id == doc_id).first()
            
            if not document:
                return None

            result = {
                "id": document.id,
                "filename": document.filename,
                "processed_at": document.processed_at.isoformat(),
                "extracted_data": document.extracted_data,
                "summary": {
                    "total_prices": document.total_prices,
                    "total_quantities": document.total_quantities,
                    "num_dates": document.num_dates,
                    "num_products": document.num_products
                }
            }
            
            session.close()
            return result

        except Exception as e:
            logger.error(f"Error retrieving document: {str(e)}", exc_info=True)
            if session:
                session.close()
            raise

    def get_all_documents(self) -> list:
        """Retrieve all documents with summary data"""
        try:
            session = self.Session()
            documents = session.query(Document).all()
            
            results = []
            for doc in documents:
                results.append({
                    "id": doc.id,
                    "filename": doc.filename,
                    "processed_at": doc.processed_at.isoformat(),
                    "summary": {
                        "total_prices": doc.total_prices,
                        "total_quantities": doc.total_quantities,
                        "num_dates": doc.num_dates,
                        "num_products": doc.num_products
                    }
                })
            
            session.close()
            return results

        except Exception as e:
            logger.error(f"Error retrieving all documents: {str(e)}", exc_info=True)
            if session:
                session.close()
            raise

    def get_statistics(self) -> dict:
        """Get processing statistics"""
        try:
            session = self.Session()
            
            total_documents = session.query(Document).count()
            
            if total_documents == 0:
                return {
                    "total_documents": 0,
                    "total_prices": 0,
                    "total_quantities": 0,
                    "total_products": 0
                }

            stats = session.query(
                Document.total_prices,
                Document.total_quantities,
                Document.num_products
            ).all()
            
            total_prices = sum(doc[0] for doc in stats)
            total_quantities = sum(doc[1] for doc in stats)
            total_products = sum(doc[2] for doc in stats)
            
            session.close()
            
            return {
                "total_documents": total_documents,
                "total_prices": total_prices,
                "total_quantities": total_quantities,
                "total_products": total_products
            }

        except Exception as e:
            logger.error(f"Error retrieving statistics: {str(e)}", exc_info=True)
            if session:
                session.close()
            raise

    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            session = self.Session()
            from sqlalchemy import text
            session.execute(text("SELECT 1"))
            session.close()
            logger.info("Database connection test successful")
            return True
        except Exception as e:
            logger.error(f"Database connection test failed: {str(e)}")
            if session:
                session.close()
            return False
