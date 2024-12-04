import json
import csv
import os
import re
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

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

def process_all_files_in_folder(input_folder: str, output_json_path: str, output_csv_path: str):
    # Load the existing data from JSON file if it exists
    combined_data = load_existing_data(output_json_path)

    # Iterate through all .txt files in the input folder
    for file_name in os.listdir(input_folder):
        if file_name.endswith('.txt'):
            input_file_path = os.path.join(input_folder, file_name)
            print(f"Processing file: {input_file_path}")

            # Load and parse the text data from the current file
            with open(input_file_path, 'r', encoding='utf-8') as file:
                raw_text = file.read()
            new_data = parse_text_data(raw_text)

            # Deduplicate new data against the combined dataset
            combined_data = deduplicate_data(combined_data, new_data)

    # Save the combined data to JSON and CSV formats
    save_to_json(combined_data, output_json_path)
    save_to_csv(combined_data, output_csv_path)
    print(f"Data parsed, deduplicated, and saved to {output_json_path} and {output_csv_path}")

class DataProcessor:
    def __init__(self, config: Dict[str, str]):
        self.input_folder = config['input_folder']
        self.output_json = config['output_json']
        self.output_csv = config['output_csv']

    def validate_paths(self) -> None:
        """Validate all input and output paths exist."""
        if not os.path.exists(self.input_folder):
            raise ValueError(f"Input folder does not exist: {self.input_folder}")

# Example usage
if __name__ == "__main__":
    input_folder = 'F:/repogit/X-seller-8/frontend/public/outputs/'  # Path to the folder containing input text files
    output_json = 'F:/repogit/X-seller-8/backend/output/ParsedText.json'   # Path to save JSON output
    output_csv = 'F:/repogit/X-seller-8/backend/output/ParsedText.csv'     # Path to save CSV output

    process_all_files_in_folder(input_folder, output_json, output_csv)
