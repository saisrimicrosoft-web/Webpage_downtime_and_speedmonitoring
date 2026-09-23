import logging
import os

def setup_logging():
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Configure root logger
    logging.basicConfig(level=logging.INFO, format=log_format)
    
    # Optionally add file handler
    file_handler = logging.FileHandler('app.log')
    file_handler.setFormatter(logging.Formatter(log_format))
    logging.getLogger().addHandler(file_handler)
    
    # Suppress verbose werkzeug logs
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
