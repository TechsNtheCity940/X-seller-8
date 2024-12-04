import logging
import logging.handlers
import os
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

class CustomLogger:
    def __init__(self, name: str, log_dir: str = "logs"):
        self.name = name
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Create logger
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        # Create formatters
        self.file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.json_formatter = JsonFormatter()
        
        # Set up handlers
        self._setup_handlers()
        
        # Track metrics
        self.metrics = {
            'errors': 0,
            'warnings': 0,
            'info': 0
        }

    def _setup_handlers(self):
        # Regular file handler with rotation
        file_handler = logging.handlers.RotatingFileHandler(
            self.log_dir / f"{self.name}.log",
            maxBytes=10485760,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(self.file_formatter)
        
        # JSON file handler for structured logging
        json_handler = logging.handlers.RotatingFileHandler(
            self.log_dir / f"{self.name}_structured.json",
            maxBytes=10485760,
            backupCount=5
        )
        json_handler.setFormatter(self.json_formatter)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(self.file_formatter)
        
        # Error file handler
        error_handler = logging.handlers.RotatingFileHandler(
            self.log_dir / f"{self.name}_errors.log",
            maxBytes=10485760,
            backupCount=5
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(self.file_formatter)
        
        # Add all handlers
        self.logger.addHandler(file_handler)
        self.logger.addHandler(json_handler)
        self.logger.addHandler(console_handler)
        self.logger.addHandler(error_handler)

    def _update_metrics(self, level: str):
        if level.lower() in self.metrics:
            self.metrics[level.lower()] += 1

    def info(self, msg: str, extra: Optional[Dict[str, Any]] = None):
        self._update_metrics('info')
        self.logger.info(msg, extra=extra)

    def warning(self, msg: str, extra: Optional[Dict[str, Any]] = None):
        self._update_metrics('warnings')
        self.logger.warning(msg, extra=extra)

    def error(self, msg: str, extra: Optional[Dict[str, Any]] = None, exc_info=True):
        self._update_metrics('errors')
        self.logger.error(msg, extra=extra, exc_info=exc_info)

    def get_metrics(self) -> Dict[str, int]:
        return self.metrics

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'name': record.name,
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        if hasattr(record, 'extra'):
            log_data['extra'] = record.extra
            
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
            
        return json.dumps(log_data)

# Create logger instance
def setup_logger(name: str, log_dir: str = "logs") -> CustomLogger:
    return CustomLogger(name, log_dir) 