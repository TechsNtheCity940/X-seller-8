from pathlib import Path
import os
import logging

logger = logging.getLogger(__name__)

def allowed_file(filename: str, allowed_extensions: set) -> bool:
    """Check if a filename has an allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def create_directory(directory: Path) -> None:
    """Create directory if it doesn't exist"""
    try:
        os.makedirs(directory, exist_ok=True)
        logger.info(f"Created directory: {directory}")
    except Exception as e:
        logger.error(f"Error creating directory {directory}: {str(e)}", exc_info=True)
        raise

def get_file_size(file_path: Path) -> int:
    """Get file size in bytes"""
    try:
        return os.path.getsize(file_path)
    except Exception as e:
        logger.error(f"Error getting file size for {file_path}: {str(e)}", exc_info=True)
        return 0

def clean_text(text: str) -> str:
    """Clean and normalize text"""
    if not text:
        return ""
    
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    # Remove special characters but keep basic punctuation
    text = ''.join(char for char in text if char.isprintable())
    
    return text.strip()
