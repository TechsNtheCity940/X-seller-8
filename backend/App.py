import json
import csv
import os
import re
from typing import List, Dict, Tuple

def parse_text_data(raw_text: str) -> List[Dict[str, str]]:
    parsed_items = []
    
    # Regular expression for parsing item details
    pattern = re.compile(
        r"(?P<name>[A-Za-z\s\-'()]+)"
        r"(?:\s*\d{0,6})?"
        r"\s+\$?(?P<price>\d{1,2}\.\d{2})"
        r"(?:\s*(?:per case|per pound)?)?"
        r"\s+(?P<quantity>\d{1,3})"
    )
    
    for match in pattern.finditer(raw_text):
        item_name = match.group("name").strip()
        item_price = float(match.group("price").replace("$", ""))
        item_quantity = int(match.group("quantity"))

        # Clean the item name
        item_name = re.sub(r"\b\d{3,}\b", "", item_name)
        item_name = re.sub(r"\b(Filled|Outofstock|Case|Status)\b", "", item_name, flags=re.IGNORECASE)
        item_name = ' '.join(item_name.split())
        
        parsed_items.append({
            "name": item_name,
            "price": item_price,
            "quantity": item_quantity,
        })
    
    return parsed_items

def load_existing_data(file_path: str) -> List[Dict[str, str]]:
    if os.path.exists(file_path):
        with open(file_path, 'r') as file:
            return json.load(file)
    return []

def save_to_json(data: List[Dict[str, str]], output_json_path: str):
    with open(output_json_path, 'w') as file:
        json.dump(data, file, indent=4)
        
def save_to_csv(data: List[Dict[str, str]], output_path: str):
    with open(output_path, 'w', newline='') as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=["name", "price", "quantity"])
        writer.writeheader()
        writer.writerows(data)

def deduplicate_data(existing_data: List[Dict[str, str]], new_data: List[Dict[str, str]]) -> List[Dict[str, str]]:
    # Create a set of unique identifiers (e.g., name and price) for existing items
    existing_identifiers = {(item["name"], item["price"]) for item in existing_data}
    
    # Filter new_data to only include items that are not in existing_identifiers
    unique_new_data = [item for item in new_data if (item["name"], item["price"]) not in existing_identifiers]
    
    # Append unique new data to existing data
    combined_data = existing_data + unique_new_data
    return combined_data

def main(input_path: str, output_json_path: str, output_csv_path: str):
    # Load the existing data from JSON file if it exists
    existing_data = load_existing_data(output_json_path)
    
    # Load new raw text data for parsing with UTF-8 encoding
    with open(input_path, 'r', encoding='utf-8') as file:
        raw_text = file.read()
    
    # Parse the new data
    new_data = parse_text_data(raw_text)
    
    # Deduplicate new data against existing data
    combined_data = deduplicate_data(existing_data, new_data)
    
    # Save to JSON and CSV formats
    save_to_json(combined_data, output_json_path)
    save_to_csv(combined_data, output_csv_path)
    print(f"Data parsed, deduplicated, and saved to {output_json_path}")

# Example usage
if __name__ == "__main__":
    input_file = 'F:/repogit/X-seller-8/frontend/public/output/TextExtract.txt'  # Path to the extracted text file


    
    output_json = 'F:/repogit/X-seller-8/backend/output/ParsedText.json'   # Path to save JSON output
    output_csv = 'F:/repogit/X-seller-8/backend/output/ParsedText.csv'     # Path to save CSV output
    main(input_file, output_json, output_csv)