"""
Standalone script to test document scanning and inventory creation functionality
This script allows you to process a single document without running the full application
"""

import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("test_scanner")

# Add current directory to Python path to ensure modules can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import core modules
try:
    from modules.document_processor import DocumentProcessor
    from modules.data_extractor import DataExtractor
    logger.info("Successfully imported core modules")
except ImportError as e:
    logger.error(f"Failed to import modules: {str(e)}")
    logger.info("Make sure you have installed all dependencies from requirements.txt")
    sys.exit(1)

def process_document(file_path):
    """Process a single document and return extracted data"""
    try:
        # Initialize components
        document_processor = DocumentProcessor()
        data_extractor = DataExtractor()
        
        logger.info(f"Processing document: {file_path}")
        
        # Process document
        processed_data = document_processor.process(file_path)
        
        logger.info(f"Document processed successfully. Type: {processed_data.get('type', 'unknown')}")
        
        # Extract data
        extracted_data = data_extractor.extract(processed_data)
        
        logger.info(f"Data extracted successfully.")
        logger.info(f"Found {len(extracted_data.get('products', []))} products")
        logger.info(f"Found {len(extracted_data.get('prices', []))} prices")
        logger.info(f"Found {len(extracted_data.get('quantities', []))} quantities")
        logger.info(f"Found {len(extracted_data.get('dates', []))} dates")
        
        return extracted_data
        
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}", exc_info=True)
        raise

def save_results(extracted_data, output_path):
    """Save extracted data to a JSON file"""
    try:
        with open(output_path, 'w') as f:
            json.dump(extracted_data, f, indent=2)
        logger.info(f"Results saved to {output_path}")
    except Exception as e:
        logger.error(f"Error saving results: {str(e)}")
        raise

def format_inventory_items(extracted_data):
    """Convert extracted data to inventory items for display"""
    products = extracted_data.get('products', [])
    prices = extracted_data.get('prices', [])
    quantities = extracted_data.get('quantities', [])
    dates = extracted_data.get('dates', [])
    
    inventory_items = []
    
    # Match products with prices and quantities
    for i, product in enumerate(products):
        item = {
            'id': i + 1,
            'itemNumber': f"ITEM-{1000 + i}",
            'itemName': product.get('name', 'Unknown Product'),
            'brand': 'Unknown Brand',
            'packSize': 'N/A',
            'price': 0,
            'ordered': 0,
            'status': 'Unknown',
            'dateDelivered': 'Unknown'
        }
        
        # Try to find a matching price
        if i < len(prices):
            item['price'] = prices[i].get('amount', 0)
            
        # Try to find a matching quantity
        if i < len(quantities):
            item['ordered'] = quantities[i].get('value', 0)
            item['packSize'] = f"{quantities[i].get('value', 0)} {quantities[i].get('unit', 'units')}"
            item['status'] = 'In Stock' if quantities[i].get('value', 0) > 0 else 'Out of Stock'
            
        # Try to find a date
        if len(dates) > 0:
            item['dateDelivered'] = dates[0].get('text', 'Unknown')
            
        inventory_items.append(item)
    
    return inventory_items

def main():
    if len(sys.argv) < 2:
        logger.error("Usage: python test_scanner.py <path_to_document>")
        sys.exit(1)
    
    file_path = Path(sys.argv[1])
    
    if not file_path.exists():
        logger.error(f"File not found: {file_path}")
        sys.exit(1)
    
    try:
        # Process document
        extracted_data = process_document(file_path)
        
        # Format as inventory items
        inventory_items = format_inventory_items(extracted_data)
        
        # Create output directory if it doesn't exist
        output_dir = Path("output")
        os.makedirs(output_dir, exist_ok=True)
        
        # Save raw extracted data
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        raw_output_path = output_dir / f"{timestamp}_extracted_data.json"
        save_results(extracted_data, raw_output_path)
        
        # Save inventory items
        inventory_output_path = output_dir / f"{timestamp}_inventory_data.json"
        save_results(inventory_items, inventory_output_path)
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"PROCESSED DOCUMENT: {file_path.name}")
        print("=" * 50)
        print(f"Extracted {len(inventory_items)} inventory items:")
        
        for i, item in enumerate(inventory_items[:5]):  # Show first 5 items
            print(f"\n{i+1}. {item['itemName']}")
            print(f"   Price: ${item['price']}")
            print(f"   Quantity: {item['ordered']} ({item['packSize']})")
            print(f"   Status: {item['status']}")
        
        if len(inventory_items) > 5:
            print(f"\n... and {len(inventory_items) - 5} more items")
        
        print("\n" + "=" * 50)
        print(f"Full results saved to:")
        print(f"- {raw_output_path}")
        print(f"- {inventory_output_path}")
        print("=" * 50 + "\n")
        
    except Exception as e:
        logger.error(f"Processing failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
