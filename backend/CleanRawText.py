import os
import re
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
import logging
from utils.logger import setup_logger

logger = setup_logger("text_cleaner")

@dataclass
class CleaningConfig:
    remove_special_chars: bool = True
    normalize_whitespace: bool = True
    remove_urls: bool = True
    remove_emails: bool = True
    min_word_length: int = 2
    max_word_length: int = 45

class TextCleaningError(Exception):
    """Custom exception for text cleaning errors"""
    pass

class TextCleaner:
    def __init__(self, config: CleaningConfig = None):
        self.config = config or CleaningConfig()
        self._compile_patterns()

    def _compile_patterns(self) -> None:
        """Compile regex patterns for better performance"""
        self.patterns = {
            'url': re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'),
            'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            'special_chars': re.compile(r'[^a-zA-Z0-9\s.,!?-]'),
            'whitespace': re.compile(r'\s+')
        }

    def clean_text(self, text: str) -> str:
        """
        Clean text according to configuration settings.
        
        Args:
            text: Input text to clean
            
        Returns:
            Cleaned text
            
        Raises:
            TextCleaningError: If cleaning fails
        """
        try:
            if not text:
                return ""

            # Apply cleaning steps based on config
            if self.config.remove_urls:
                text = self.patterns['url'].sub(' ', text)
            
            if self.config.remove_emails:
                text = self.patterns['email'].sub(' ', text)
            
            if self.config.remove_special_chars:
                text = self.patterns['special_chars'].sub(' ', text)
            
            if self.config.normalize_whitespace:
                text = self.patterns['whitespace'].sub(' ', text)

            # Filter words by length
            words = text.split()
            words = [w for w in words 
                    if self.config.min_word_length <= len(w) <= self.config.max_word_length]
            
            return ' '.join(words).strip()
            
        except Exception as e:
            raise TextCleaningError(f"Failed to clean text: {str(e)}")

    def process_file(self, input_path: Path, output_path: Path) -> None:
        """Process a single file"""
        try:
            logger.info(f"Processing file: {input_path}")
            
            with open(input_path, 'r', encoding='utf-8') as f:
                text = f.read()
            
            cleaned_text = self.clean_text(text)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(cleaned_text)
                
            logger.info(f"Cleaned text saved to: {output_path}")
            
        except Exception as e:
            logger.error(f"Failed to process file {input_path}: {e}")
            raise TextCleaningError(f"File processing failed: {str(e)}")

    def process_directory(self, input_dir: Path, output_dir: Path, 
                         file_pattern: str = "*.txt") -> List[Dict[str, Any]]:
        """Process all matching files in a directory"""
        results = []
        input_dir = Path(input_dir)
        output_dir = Path(output_dir)
        
        try:
            output_dir.mkdir(parents=True, exist_ok=True)
            
            for input_path in input_dir.glob(file_pattern):
                output_path = output_dir / f"cleaned_{input_path.name}"
                
                try:
                    self.process_file(input_path, output_path)
                    results.append({
                        'file': input_path.name,
                        'status': 'success',
                        'output': output_path.name
                    })
                except Exception as e:
                    results.append({
                        'file': input_path.name,
                        'status': 'error',
                        'error': str(e)
                    })
                    
            return results
            
        except Exception as e:
            logger.error(f"Directory processing failed: {e}")
            raise TextCleaningError(f"Directory processing failed: {str(e)}")

if __name__ == "__main__":
    try:
        config = CleaningConfig(
            remove_special_chars=True,
            normalize_whitespace=True,
            remove_urls=True,
            remove_emails=True
        )
        
        cleaner = TextCleaner(config)
        input_dir = Path("F:/repogit/X-seller-8/frontend/public/uploads")
        output_dir = Path("F:/repogit/X-seller-8/frontend/public/outputs")
        
        results = cleaner.process_directory(input_dir, output_dir)
        
        logger.info("Processing completed successfully")
        logger.info(f"Processed {len(results)} files")
        
    except Exception as e:
        logger.error(f"Application failed: {e}")
        raise
