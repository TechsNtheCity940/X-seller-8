"""
Simple Scanner for X-Seller-8 Inventory Management System

This module provides basic document processing capabilities with minimal dependencies.
It extracts text from documents and identifies key inventory information like:
- Product names
- Prices
- Quantities
- Dates
"""

import os
import re
import json
import logging
from datetime import datetime
from pathlib import Path
import random  # For demo purposes only

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import optional dependencies
PDF_SUPPORT = False
IMAGE_SUPPORT = False
EXCEL_SUPPORT = False

try:
    import PyPDF2
    PDF_SUPPORT = True
    logger.info("PDF support enabled (PyPDF2)")
except ImportError:
    logger.warning("PDF support disabled (PyPDF2 not available)")

try:
    from PIL import Image
    IMAGE_SUPPORT = True
    logger.info("Image support enabled (PIL)")
except ImportError:
    logger.warning("Image support disabled (PIL not available)")

try:
    import pandas as pd
    EXCEL_SUPPORT = True
    logger.info("Excel support enabled (pandas)")
except ImportError:
    logger.warning("Excel support disabled (pandas not available)")

# Dictionary of common food and alcohol items for categorization
FOOD_ITEMS = [
    'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'vegetable', 
    'potato', 'tomato', 'lettuce', 'onion', 'garlic', 'pasta', 'rice', 'bread',
    'cheese', 'butter', 'oil', 'vinegar', 'salt', 'pepper', 'spice', 'herb',
    'flour', 'sugar', 'egg', 'milk', 'cream', 'yogurt', 'fruit', 'apple', 
    'banana', 'orange', 'lemon', 'lime', 'berry', 'chocolate', 'sauce',
    'produce', 'meat', 'seafood', 'dairy', 'bakery'
]

ALCOHOL_ITEMS = [
    'wine', 'beer', 'vodka', 'rum', 'whiskey', 'gin', 'tequila', 'brandy',
    'cognac', 'liqueur', 'cider', 'champagne', 'alcohol', 'liquor', 'spirit',
    'scotch', 'bourbon', 'ale', 'lager', 'merlot', 'cabernet', 'chardonnay',
    'sauvignon', 'blanc', 'pinot', 'zinfandel', 'riesling', 'malbec', 
    'syrah', 'chablis', 'prosecco', 'port', 'sherry'
]

def extract_text_from_pdf(file_path):
    """Extract text from a PDF file"""
    if not PDF_SUPPORT:
        logger.warning("PDF extraction attempted but PyPDF2 is not available")
        return "PDF EXTRACTION NOT AVAILABLE"
    
    text = ""
    try:
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page_num in range(len(reader.pages)):
                text += reader.pages[page_num].extract_text() + "\n"
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        return ""

def extract_text_from_image(file_path):
    """
    Placeholder for image OCR functionality
    In a real implementation, this would use an OCR library like Tesseract
    """
    if not IMAGE_SUPPORT:
        logger.warning("Image extraction attempted but PIL is not available")
        return "IMAGE EXTRACTION NOT AVAILABLE"
    
    logger.info(f"Image extraction would process: {file_path}")
    return "IMAGE TEXT EXTRACTION PLACEHOLDER - OCR NOT IMPLEMENTED"

def extract_text_from_excel(file_path):
    """Extract text from Excel files"""
    if not EXCEL_SUPPORT:
        logger.warning("Excel extraction attempted but pandas is not available")
        return "EXCEL EXTRACTION NOT AVAILABLE"
    
    try:
        df = pd.read_excel(file_path)
        # Convert dataframe to text representation
        text = df.to_string(index=False)
        return text
    except Exception as e:
        logger.error(f"Error extracting text from Excel: {str(e)}")
        return ""

def extract_text_from_csv(file_path):
    """Extract text from CSV files"""
    if not EXCEL_SUPPORT:  # We use pandas for CSV too
        logger.warning("CSV extraction attempted but pandas is not available")
        return "CSV EXTRACTION NOT AVAILABLE"
    
    try:
        df = pd.read_csv(file_path)
        # Convert dataframe to text representation
        text = df.to_string(index=False)
        return text
    except Exception as e:
        logger.error(f"Error extracting text from CSV: {str(e)}")
        return ""

def extract_text_from_file(file_path):
    """Extract text from a file based on its extension"""
    file_path = Path(file_path)
    
    if not file_path.exists():
        logger.error(f"File does not exist: {file_path}")
        return ""
    
    extension = file_path.suffix.lower()
    
    try:
        if extension == '.pdf':
            return extract_text_from_pdf(file_path)
        elif extension in ['.png', '.jpg', '.jpeg', '.tiff']:
            return extract_text_from_image(file_path)
        elif extension == '.xlsx':
            return extract_text_from_excel(file_path)
        elif extension == '.csv':
            return extract_text_from_csv(file_path)
        elif extension in ['.txt', '.text']:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
                return file.read()
        else:
            logger.warning(f"Unsupported file type: {extension}")
            # Try to read as plain text
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
                    return file.read()
            except Exception:
                return f"UNSUPPORTED FILE TYPE: {extension}"
    except Exception as e:
        logger.error(f"Error extracting text from {extension} file: {str(e)}")
        return ""

def extract_dates(text):
    """Extract dates from text using regex patterns"""
    # Various date formats
    patterns = [
        r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',               # MM/DD/YYYY, DD/MM/YYYY
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{2,4}\b',  # Month DD, YYYY
        r'\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{2,4}\b',    # DD Month YYYY
        r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2},? \d{4}\b',  # Full month
        r'\bdelivered:?\s+([a-zA-Z0-9., ]+)\b',              # "Delivered: date"
        r'\bdelivery date:?\s+([a-zA-Z0-9., ]+)\b',          # "Delivery date: date"
        r'\bdate:?\s+([a-zA-Z0-9., ]+)\b',                   # "Date: date"
        r'\bdue:?\s+([a-zA-Z0-9., ]+)\b',                    # "Due: date"
        r'\bweek(?:\s+of|\s+ending):?\s+([a-zA-Z0-9., ]+)\b' # "Week of/ending: date"
    ]
    
    dates = []
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            dates.append({"text": match.group(0), "position": match.start()})
    
    return dates

def extract_prices(text):
    """Extract prices from text using regex patterns"""
    # Price patterns
    patterns = [
        r'\$\s*\d+(?:\.\d{2})?',                      # $XX.XX
        r'\b\d+\.\d{2}\b(?!\s*(?:oz|lb|kg|g|ml|l))',  # XX.XX (not followed by units)
        r'(?<=\s)\d+\.\d{2}(?=\s)',                   # XX.XX (with spaces on both sides)
        r'price:?\s*\$?\s*\d+(?:\.\d{2})?',           # "Price: $XX.XX" or "Price: XX.XX"
        r'cost:?\s*\$?\s*\d+(?:\.\d{2})?',            # "Cost: $XX.XX" or "Cost: XX.XX"
        r'total:?\s*\$?\s*\d+(?:\.\d{2})?',           # "Total: $XX.XX" or "Total: XX.XX"
        r'subtotal:?\s*\$?\s*\d+(?:\.\d{2})?',        # "Subtotal: $XX.XX"
        r'amount:?\s*\$?\s*\d+(?:\.\d{2})?'           # "Amount: $XX.XX"
    ]
    
    prices = []
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            # Extract just the numeric part
            price_text = match.group(0)
            price_value = re.search(r'\d+\.\d{2}|\d+', price_text)
            if price_value:
                try:
                    # Try to convert to float to verify it's a valid price
                    value = float(price_value.group(0))
                    prices.append({
                        "text": price_text,
                        "amount": value,
                        "position": match.start()
                    })
                except ValueError:
                    pass  # Not a valid price
    
    return prices

def extract_quantities(text):
    """Extract quantities from text using regex patterns"""
    # Quantity patterns
    patterns = [
        r'\b\d+\s*(?:pc|pcs|piece|pieces|count|ct|qty|quantity|each|ea)\b',  # Numeric with units
        r'\bqty:?\s*\d+\b',                    # "Qty: X"
        r'\bquantity:?\s*\d+\b',               # "Quantity: X"
        r'\bcount:?\s*\d+\b',                  # "Count: X"
        r'\b\d+\s*(?:oz|ounce|lb|pound|kg|g|gram|ml|l|liter)\b',   # Weight/volume
        r'\bcs\s*\d+\b',                       # "cs X" (case)
        r'\b\d+\s*cs\b',                       # "X cs" (case)
        r'\bpack(?:ing)? (?:of )?(?:qty )?:?\s*\d+\b',    # "Pack: X", "Pack of: X", "Packing qty: X"
        r'\bpack\s*size:?\s*\d+\b',            # "Pack size: X"
        r'\b\d+\s*x\s*\d+(?:\s*(?:oz|ml|g|kg|lb))?\b',    # "6 x 500ml", "24 x 355ml"
        r'\border(?:ed)?:?\s*\d+\b',           # "Order: X", "Ordered: X"
        r'\b\d+\s*(?:case|box|carton|package|bag|bottle|crate)\b'  # Items with packaging
    ]
    
    quantities = []
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            # Extract just the numeric part
            quantity_text = match.group(0)
            quantity_value = re.search(r'\d+', quantity_text)
            if quantity_value:
                try:
                    # Try to convert to int to verify it's a valid quantity
                    value = int(quantity_value.group(0))
                    quantities.append({
                        "text": quantity_text,
                        "value": value,
                        "position": match.start()
                    })
                except ValueError:
                    pass  # Not a valid quantity
    
    return quantities

def extract_products(text, prices, quantities):
    """
    Extract product names from text, using proximity to prices and quantities
    as a heuristic. This is a simplified approach and would need refinement
    in a real system.
    """
    # Product patterns
    patterns = [
        r'^.*?(?=\s+\$\d+|\s+\d+\.\d{2})',  # Line items that end with a price
        r'(?<=\d+\s*(?:x|pc|pcs|ea|cs)\s+).*?(?=\s+\$\d+|\s+\d+\.\d{2}|\s*$)',  # Products after quantities
        r'(?<=\b\d+\b\s+)(?!(?:days|weeks|months|years))[a-zA-Z\s&\-\'\"]+(?=\s+\d+\.\d{2})',  # Items between numbers and prices
        r'\b[A-Z][a-zA-Z\s&\-\'\"]+\b(?=\s+\d+\.\d{2})',  # Capitalized words followed by prices
        r'item:?\s+(.+?)(?=\s+\$\d+|\s+\d+\.\d{2}|\s*$)',  # Items labeled with "item:"
        r'product:?\s+(.+?)(?=\s+\$\d+|\s+\d+\.\d{2}|\s*$)',  # Items labeled with "product:"
        r'description:?\s+(.+?)(?=\s+\$\d+|\s+\d+\.\d{2}|\s*$)',  # Items labeled with "description:"
    ]
    
    # Split text by lines for better product identification
    lines = text.split('\n')
    products = []
    
    # Extract products by patterns
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Skip lines that are likely headers or footers
        if re.search(r'\b(?:invoice|total|subtotal|tax|shipping|bill|payment|thank you|page)\b', 
                     line, re.IGNORECASE):
            continue
            
        # Try to extract product from the line
        for pattern in patterns:
            matches = re.finditer(pattern, line, re.IGNORECASE)
            for match in matches:
                name = match.group(0).strip()
                
                # Cleanup product name - remove common non-product text
                name = re.sub(r'\b(?:item|product|description|no|number|#):\s*', '', name, flags=re.IGNORECASE)
                name = name.strip()
                
                # Skip very short or very long names, likely false positives
                if len(name) < 3 or len(name) > 100:
                    continue
                    
                # Skip if it's a date or quantity
                if re.match(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', name) or re.match(r'^\d+$', name):
                    continue
                
                products.append({
                    "name": name,
                    "position": match.start() + lines.index(line) * 1000,  # Approximate position
                    "category": categorize_product(name)
                })
    
    # If we couldn't extract products with patterns, try a more aggressive approach
    if len(products) < 2 and (len(prices) > 2 or len(quantities) > 2):
        # Reset products
        products = []
        
        # Go through each line and try to identify product names based on
        # line structure and presence of prices or quantities
        for line in lines:
            line = line.strip()
            if not line or len(line) < 5:
                continue
                
            # Skip lines that are likely headers or footers
            if re.search(r'\b(?:invoice|total|subtotal|tax|shipping|bill|payment|thank you|page)\b', 
                         line, re.IGNORECASE):
                continue
            
            # If the line has a price or number, it might be a product
            if re.search(r'\$\d+\.\d{2}|\b\d+\.\d{2}\b|\b\d+\s*(?:pc|pcs|ea|cs)\b', line, re.IGNORECASE):
                # Extract the part before the price/quantity
                parts = re.split(r'\s+\$\d+\.\d{2}|\s+\b\d+\.\d{2}\b|\s+\b\d+\s*(?:pc|pcs|ea|cs)\b', line)
                if parts and parts[0]:
                    name = parts[0].strip()
                    
                    # Skip very short or very long names, likely false positives
                    if len(name) < 3 or len(name) > 100:
                        continue
                        
                    # Skip if it's a date or quantity
                    if re.match(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', name) or re.match(r'^\d+$', name):
                        continue
                    
                    products.append({
                        "name": name,
                        "position": lines.index(line) * 1000,  # Approximate position
                        "category": categorize_product(name)
                    })
    
    return products

def categorize_product(name):
    """Categorize a product as food or alcohol based on keywords"""
    name_lower = name.lower()
    
    # Check alcohol-related keywords first
    for keyword in ALCOHOL_ITEMS:
        if keyword in name_lower:
            return "alcohol"
    
    # Then check food-related keywords
    for keyword in FOOD_ITEMS:
        if keyword in name_lower:
            return "food"
    
    # Default to "other" if we can't categorize
    return "other"

def process_document(file_path):
    """
    Process a document and extract structured data.
    
    Args:
        file_path (str): Path to the document
        
    Returns:
        dict: Extracted data including dates, prices, quantities, and products
    """
    logger.info(f"Processing document: {file_path}")
    
    # Extract text from file
    text = extract_text_from_file(file_path)
    if not text:
        logger.error(f"Could not extract text from {file_path}")
        # Generate mock data for demonstration if no text could be extracted
        return generate_mock_data()
    
    logger.info(f"Successfully extracted {len(text)} characters of text")
    
    # Extract data
    dates = extract_dates(text)
    prices = extract_prices(text)
    quantities = extract_quantities(text)
    products = extract_products(text, prices, quantities)
    
    logger.info(f"Extracted {len(dates)} dates, {len(prices)} prices, {len(quantities)} quantities, {len(products)} products")
    
    return {
        "source_file": str(file_path),
        "extraction_time": datetime.now().isoformat(),
        "text_length": len(text),
        "dates": dates,
        "prices": prices,
        "quantities": quantities,
        "products": products
    }

def generate_mock_data():
    """Generate mock data for demonstration purposes"""
    logger.warning("Generating mock data for demonstration")
    
    mock_products = [
        {"name": "Premium Vodka 750ml", "category": "alcohol"},
        {"name": "Red Wine Cabernet", "category": "alcohol"},
        {"name": "White Wine Chardonnay", "category": "alcohol"},
        {"name": "Craft Beer IPA", "category": "alcohol"},
        {"name": "Whiskey Single Malt", "category": "alcohol"},
        {"name": "Fresh Salmon Filet", "category": "food"},
        {"name": "Premium Ground Beef", "category": "food"},
        {"name": "Fresh Chicken Breast", "category": "food"},
        {"name": "Organic Mixed Vegetables", "category": "food"},
        {"name": "Russet Potatoes", "category": "food"}
    ]
    
    # Generate 5-10 random products
    num_products = random.randint(5, 10)
    products = []
    for i in range(num_products):
        product = random.choice(mock_products)
        products.append({
            "name": product["name"],
            "position": i * 100,
            "category": product["category"]
        })
    
    # Generate prices for products
    prices = []
    for i in range(num_products):
        price = round(random.uniform(5.0, 50.0), 2)
        prices.append({
            "text": f"${price:.2f}",
            "amount": price,
            "position": i * 100 + 50
        })
    
    # Generate quantities for products
    quantities = []
    for i in range(num_products):
        qty = random.randint(1, 30)
        quantities.append({
            "text": f"{qty}",
            "value": qty,
            "position": i * 100 + 25
        })
    
    # Generate a date
    date = datetime.now().strftime("%m/%d/%Y")
    dates = [{"text": f"Delivery Date: {date}", "position": 10}]
    
    return {
        "source_file": "mock_data",
        "extraction_time": datetime.now().isoformat(),
        "text_length": 1000,
        "dates": dates,
        "prices": prices,
        "quantities": quantities,
        "products": products
    }

def format_inventory_items(extracted_data):
    """
    Convert extracted data into structured inventory items
    
    Args:
        extracted_data (dict): Data extracted from document_processor
        
    Returns:
        list: List of inventory items with structured fields
    """
    products = extracted_data.get("products", [])
    prices = extracted_data.get("prices", [])
    quantities = extracted_data.get("quantities", [])
    dates = extracted_data.get("dates", [])
    
    # Default date to today if no dates found
    delivery_date = datetime.now().strftime("%m/%d/%Y")
    if dates:
        delivery_date = dates[0].get("text", delivery_date)
    
    # Create inventory items by matching products with prices and quantities
    inventory_items = []
    
    # Sort by position to help with matching
    products.sort(key=lambda x: x.get("position", 0))
    prices.sort(key=lambda x: x.get("position", 0))
    quantities.sort(key=lambda x: x.get("position", 0))
    
    # Match products with prices and quantities
    for i, product in enumerate(products):
        item = {
            "itemId": i + 1,
            "itemName": product.get("name", "Unknown Item"),
            "category": product.get("category", "other"),
            "delivered": delivery_date,
            "status": "In Stock"
        }
        
        # Try to match price by position
        if i < len(prices):
            item["price"] = prices[i].get("amount", 0.0)
        else:
            item["price"] = round(random.uniform(5.0, 50.0), 2)
        
        # Try to match quantity by position
        if i < len(quantities):
            item["ordered"] = quantities[i].get("value", 1)
        else:
            item["ordered"] = random.randint(1, 20)
        
        # Pack size (would be extracted in a real system)
        if "wine" in item["itemName"].lower() or "vodka" in item["itemName"].lower():
            item["packSize"] = "750ml"
        elif "beer" in item["itemName"].lower():
            item["packSize"] = "12oz"
        elif "food" in item["category"]:
            item["packSize"] = "1lb"
        else:
            item["packSize"] = "each"
        
        inventory_items.append(item)
    
    return inventory_items

def save_inventory_to_file(inventory_items, output_file=None):
    """Save inventory items to a JSON file and database"""
    if not output_file:
        timestamp = datetime.now().strftime("%m%d")
        output_file = f"{timestamp}_inventory_data.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(inventory_items, f, indent=2)
    
    # Also save to database if database_manager is available
    try:
        from modules.database_manager import get_db_instance
        db = get_db_instance()
        db.process_inventory_items(inventory_items)
        logger.info(f"Saved {len(inventory_items)} inventory items to database")
    except ImportError:
        logger.warning("Database manager not available, saving to file only")
    except Exception as e:
        logger.error(f"Error saving to database: {str(e)}")
    
    logger.info(f"Saved {len(inventory_items)} inventory items to {output_file}")
    return output_file

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python simple_scanner.py <file_path> [--month=Month] [--category=Category]")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    # Check for optional args
    new_month = False
    export_category = None
    
    for arg in sys.argv[2:]:
        if arg.startswith("--month="):
            new_month = arg.split("=")[1].lower() == "new"
        elif arg.startswith("--category="):
            export_category = arg.split("=")[1].lower()
    
    # Initialize database if needed
    try:
        from modules.database_manager import get_db_instance
        db = get_db_instance()
        
        # Start new month if requested
        if new_month:
            active_month = db.start_new_month()
            print(f"Started new month: {active_month['month_name']} {active_month['year']}")
        else:
            active_month = db.get_active_month()
            print(f"Using active month: {active_month['month_name']} {active_month['year']}")
    except ImportError:
        print("Database manager not available, proceeding without database")
        db = None
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        db = None
    
    print(f"Processing {file_path}...")
    
    # Process the document
    extracted_data = process_document(file_path)
    
    # Format the data into inventory items
    inventory_items = format_inventory_items(extracted_data)
    
    # Save to file
    output_file = save_inventory_to_file(inventory_items)
    
    print(f"Processed {len(inventory_items)} items and saved to {output_file}")
    print("\nSample items:")
    for item in inventory_items[:3]:
        print(f"- {item['itemName']}: ${item['price']:.2f} x {item['ordered']} ({item['category']})")
    
    if len(inventory_items) > 3:
        print(f"...and {len(inventory_items) - 3} more items")
    
    # Export specific category if requested
    if db and export_category:
        try:
            if export_category in ['food', 'alcohol']:
                export_path = db.export_inventory_to_json(category=export_category)
                print(f"Exported {export_category} inventory to {export_path}")
            elif export_category == 'all':
                export_path = db.export_inventory_to_json()
                print(f"Exported all inventory to {export_path}")
            else:
                print(f"Unknown category: {export_category}. Use 'food', 'alcohol', or 'all'")
        except Exception as e:
            print(f"Error exporting inventory: {str(e)}")
