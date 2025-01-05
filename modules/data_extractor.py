import re
import pandas as pd
from datetime import datetime
import logging
from typing import Dict, List, Any
import spacy
from price_parser import Price
import numpy as np

logger = logging.getLogger(__name__)

class DataExtractor:
    def __init__(self):
        # Load spaCy model for entity recognition
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except:
            logger.warning("Downloading spaCy model...")
            import subprocess
            subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
            self.nlp = spacy.load("en_core_web_sm")

    def extract(self, processed_data: Dict) -> Dict[str, Any]:
        """
        Extract structured data from processed document content
        """
        try:
            doc_type = processed_data.get("type", "")
            extracted_data = {
                "dates": [],
                "prices": [],
                "quantities": [],
                "products": [],
                "tables": [],
                "metadata": {
                    "processing_timestamp": datetime.utcnow().isoformat(),
                    "document_type": doc_type
                }
            }

            if doc_type == "pdf":
                self._extract_from_pdf(processed_data, extracted_data)
            elif doc_type == "image":
                self._extract_from_image(processed_data, extracted_data)
            elif doc_type in ["excel", "csv"]:
                self._extract_from_tabular(processed_data, extracted_data)
            elif doc_type == "docx":
                self._extract_from_docx(processed_data, extracted_data)

            return extracted_data

        except Exception as e:
            logger.error(f"Error in data extraction: {str(e)}", exc_info=True)
            raise

    def _extract_from_pdf(self, processed_data: Dict, extracted_data: Dict):
        """Extract data from PDF content"""
        for page_content in processed_data.get("text_content", []):
            text = page_content.get("text", "") + page_content.get("ocr_text", "")
            self._extract_from_text(text, extracted_data)

    def _extract_from_image(self, processed_data: Dict, extracted_data: Dict):
        """Extract data from image content"""
        text = processed_data.get("text", "")
        self._extract_from_text(text, extracted_data)

    def _extract_from_tabular(self, processed_data: Dict, extracted_data: Dict):
        """Extract data from tabular content (Excel/CSV)"""
        data = processed_data.get("data", [])
        if data:
            df = pd.DataFrame(data)
            extracted_data["tables"].append({
                "data": data,
                "columns": processed_data.get("columns", []),
                "shape": processed_data.get("shape", [])
            })
            
            # Extract from column names and values
            for column in df.columns:
                col_values = df[column].astype(str).tolist()
                combined_text = " ".join([column] + col_values)
                self._extract_from_text(combined_text, extracted_data)

    def _extract_from_docx(self, processed_data: Dict, extracted_data: Dict):
        """Extract data from Word document content"""
        for item in processed_data.get("content", []):
            if item["type"] == "paragraph":
                self._extract_from_text(item["text"], extracted_data)
            elif item["type"] == "table":
                extracted_data["tables"].append({
                    "data": item["data"]
                })
                # Extract from table content
                table_text = " ".join([" ".join(row) for row in item["data"]])
                self._extract_from_text(table_text, extracted_data)

    def _extract_from_text(self, text: str, extracted_data: Dict):
        """Extract various data points from text"""
        if not text.strip():
            return

        # Process with spaCy
        doc = self.nlp(text)

        # Extract dates
        dates = self._extract_dates(text, doc)
        extracted_data["dates"].extend(dates)

        # Extract prices
        prices = self._extract_prices(text)
        extracted_data["prices"].extend(prices)

        # Extract quantities
        quantities = self._extract_quantities(text)
        extracted_data["quantities"].extend(quantities)

        # Extract products
        products = self._extract_products(doc)
        extracted_data["products"].extend(products)

    def _extract_dates(self, text: str, doc) -> List[Dict]:
        """Extract dates from text using multiple methods"""
        dates = []
        
        # Use spaCy's DATE entities
        for ent in doc.ents:
            if ent.label_ == "DATE":
                dates.append({
                    "text": ent.text,
                    "type": "spacy_date"
                })

        # Regular expression patterns for various date formats
        date_patterns = [
            (r'\d{1,2}/\d{1,2}/\d{2,4}', 'mm/dd/yyyy'),
            (r'\d{4}-\d{1,2}-\d{1,2}', 'yyyy-mm-dd'),
            (r'\d{1,2}-\d{1,2}-\d{4}', 'dd-mm-yyyy'),
            (r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b', 'month_name')
        ]

        for pattern, date_type in date_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                dates.append({
                    "text": match.group(),
                    "type": f"regex_{date_type}"
                })

        return dates

    def _extract_prices(self, text: str) -> List[Dict]:
        """Extract prices from text"""
        prices = []
        
        # Use price_parser library
        price_matches = re.finditer(r'\$?\s*\d+(?:,\d{3})*(?:\.\d{2})?(?!\d)', text)
        for match in price_matches:
            price_str = match.group()
            price = Price.fromstring(price_str)
            if price.amount is not None:
                prices.append({
                    "amount": float(price.amount),
                    "currency": price.currency or "USD",
                    "text": price_str
                })

        return prices

    def _extract_quantities(self, text: str) -> List[Dict]:
        """Extract quantities from text"""
        quantities = []
        
        # Pattern for numbers followed by units
        quantity_patterns = [
            (r'\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*(pieces?|pcs?|units?|qty|items?)\b', 'count'),
            (r'\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*(kg|kilos?|pounds?|lbs?|oz|ounces?)\b', 'weight'),
            (r'\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*(liters?|l|gallons?|gal)\b', 'volume')
        ]

        for pattern, qty_type in quantity_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                value, unit = match.groups()
                value = float(value.replace(',', ''))
                quantities.append({
                    "value": value,
                    "unit": unit.lower(),
                    "type": qty_type,
                    "text": match.group()
                })

        return quantities

    def _extract_products(self, doc) -> List[Dict]:
        """Extract product mentions from text"""
        products = []
        
        # Use spaCy's PRODUCT entities
        for ent in doc.ents:
            if ent.label_ in ["PRODUCT", "ORG"]:
                products.append({
                    "name": ent.text,
                    "type": ent.label_
                })

        return products
