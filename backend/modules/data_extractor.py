import re
from datetime import datetime
from price_parser import Price
import logging

logger = logging.getLogger(__name__)

class DataExtractor:
    def __init__(self):
        self.patterns = {
            'invoice_number': r'(?i)invoice\s*#?\s*([A-Z0-9-]+)',
            'date': r'(?i)date:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
            'total_amount': r'(?i)total:?\s*[\$£€]?\s*(\d+[.,]\d{2})',
            'vendor': r'(?i)vendor:?\s*([A-Za-z0-9\s&]+(?:LLC|Inc|Ltd|Limited|Corp|Corporation)?)',
        }

    def extract(self, text):
        """Extract relevant information from document text"""
        try:
            extracted_data = {
                'invoice_number': self._extract_invoice_number(text),
                'date': self._extract_date(text),
                'total_amount': self._extract_total_amount(text),
                'vendor': self._extract_vendor(text),
                'items': self._extract_items(text),
            }
            
            return extracted_data
            
        except Exception as e:
            logger.error(f"Error extracting data: {str(e)}")
            raise

    def _extract_invoice_number(self, text):
        """Extract invoice number from text"""
        match = re.search(self.patterns['invoice_number'], text)
        return match.group(1) if match else None

    def _extract_date(self, text):
        """Extract date from text"""
        match = re.search(self.patterns['date'], text)
        if match:
            date_str = match.group(1)
            try:
                # Try different date formats
                for fmt in ['%m/%d/%Y', '%m-%d-%Y', '%d/%m/%Y', '%d-%m-%Y']:
                    try:
                        return datetime.strptime(date_str, fmt).isoformat()
                    except ValueError:
                        continue
            except Exception as e:
                logger.warning(f"Could not parse date {date_str}: {str(e)}")
        return None

    def _extract_total_amount(self, text):
        """Extract total amount from text"""
        match = re.search(self.patterns['total_amount'], text)
        if match:
            price_str = match.group(1)
            price = Price.fromstring(price_str)
            return float(price.amount) if price.amount else None
        return None

    def _extract_vendor(self, text):
        """Extract vendor name from text"""
        match = re.search(self.patterns['vendor'], text)
        return match.group(1).strip() if match else None

    def _extract_items(self, text):
        """Extract line items from text"""
        items = []
        
        # Look for patterns that might indicate line items
        lines = text.split('\n')
        for line in lines:
            # Skip empty lines
            if not line.strip():
                continue
                
            # Try to find price in the line
            price_match = Price.fromstring(line)
            if price_match.amount:
                # Try to extract quantity and description
                quantity_match = re.search(r'(\d+)\s*[xX]?\s*', line)
                quantity = int(quantity_match.group(1)) if quantity_match else 1
                
                # Remove quantity and price from line to get description
                description = line
                if quantity_match:
                    description = description.replace(quantity_match.group(0), '')
                description = description.replace(str(price_match.amount), '')
                description = re.sub(r'[\$£€]', '', description).strip()
                
                items.append({
                    'description': description,
                    'quantity': quantity,
                    'unit_price': float(price_match.amount),
                    'total_price': float(price_match.amount) * quantity
                })
        
        return items
