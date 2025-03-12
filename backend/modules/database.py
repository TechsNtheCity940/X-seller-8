                                                                   hjimport os
import logging
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

logger = logging.getLogger(__name__)

Base = declarative_base()

class Document(Base):
    __tablename__ = 'documents'

    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    original_path = Column(String(512), nullable=False)
    processed_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default='processed')
    extracted_data = Column(JSON)
    raw_text = Column(Text)
    error = Column(Text)

class Database:
    def __init__(self):
        self.engine = self._create_engine()
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()

    def _create_engine(self):
        """Create database engine based on environment variables"""
        db_host = os.getenv('DB_HOST')
        
        if db_host:
            # PostgreSQL connection
            db_port = os.getenv('DB_PORT', '5432')
            db_name = os.getenv('DB_NAME', 'xseller8')
            db_user = os.getenv('DB_USER', 'postgres')
            db_password = os.getenv('DB_PASSWORD', 'your_secure_password')
            
            connection_string = f'postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}'
            
            return create_engine(
                connection_string,
                poolclass=QueuePool,
                pool_size=5,
                max_overflow=10,
                pool_timeout=30,
                pool_recycle=1800
            )
        else:
            # SQLite fallback for local development
            return create_engine('sqlite:///local.db')

    def test_connection(self):
        """Test database connection"""
        try:
            self.engine.connect()
            return True
        except Exception as e:
            logger.error(f"Database connection error: {str(e)}")
            return False

    def store_document_data(self, filename, original_path, extracted_data, raw_text=None, error=None):
        """Store document data in database"""
        try:
            document = Document(
                filename=filename,
                original_path=original_path,
                extracted_data=extracted_data,
                raw_text=raw_text,
                error=error,
                status='failed' if error else 'processed'
            )
            
            self.session.add(document)
            self.session.commit()
            return document.id
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error storing document data: {str(e)}")
            raise

    def get_document(self, doc_id):
        """Retrieve specific document data"""
        try:
            document = self.session.query(Document).get(doc_id)
            if document:
                return {
                    'id': document.id,
                    'filename': document.filename,
                    'processed_at': document.processed_at.isoformat(),
                    'status': document.status,
                    'extracted_data': document.extracted_data,
                    'error': document.error
                }
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving document {doc_id}: {str(e)}")
            raise

    def get_all_documents(self):
        """Retrieve all documents"""
        try:
            documents = self.session.query(Document).all()
            return [{
                'id': doc.id,
                'filename': doc.filename,
                'processed_at': doc.processed_at.isoformat(),
                'status': doc.status,
                'extracted_data': doc.extracted_data,
                'error': doc.error
            } for doc in documents]
            
        except Exception as e:
            logger.error(f"Error retrieving documents: {str(e)}")
            raise

    def get_statistics(self):
        """Get processing statistics"""
        try:
            total_docs = self.session.query(Document).count()
            successful_docs = self.session.query(Document).filter_by(status='processed').count()
            failed_docs = self.session.query(Document).filter_by(status='failed').count()
            
            # Get processing history (documents per day)
            from sqlalchemy import func, cast, Date
            processing_history = self.session.query(
                cast(Document.processed_at, Date).label('date'),
                func.count(Document.id).label('count')
            ).group_by(cast(Document.processed_at, Date)).all()
            
            return {
                'total_documents': total_docs,
                'successful_documents': successful_docs,
                'failed_documents': failed_docs,
                'success_rate': (successful_docs / total_docs * 100) if total_docs > 0 else 0,
                'processing_history': [
                    {'date': str(date), 'count': count}
                    for date, count in processing_history
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting statistics: {str(e)}")
            raise
