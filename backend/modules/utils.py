import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

def allowed_file(filename, allowed_extensions):
    """Check if a filename has an allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def create_directory(directory_path):
    """Create directory if it doesn't exist"""
    try:
        Path(directory_path).mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.error(f"Error creating directory {directory_path}: {str(e)}")
        raise

def get_file_size(file_path):
    """Get file size in bytes"""
    try:
        return os.path.getsize(file_path)
    except Exception as e:
        logger.error(f"Error getting file size for {file_path}: {str(e)}")
        return 0
