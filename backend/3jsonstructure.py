import json
import os
import re
from dataclasses import dataclass
from typing import List, Dict, Optional

# Helper function to parse lines
def parse_line(line: str) -> ParsedData:
    """
    Extract relevant information from a line using regex patterns.
    """
    line_data = {}
    # Regex patterns for matching various fields
    date_pattern = r"\d{2}/\d{2}/\d{4}"
    money_pattern = r"\$\d+[\.\d+]?"
    quantity_pattern = r"\bQty\s*:\s*\d+"
    product_code_pattern = r"\b[A-Z0-9]{5,}\b"
    product_name_pattern = r"[A-Z][a-zA-Z\s]+(?:[A-Z][a-zA-Z\s]+)*"

    # Extract using patterns
    date_match = re.search(date_pattern, line)
    money_match = re.search(money_pattern, line)
    quantity_match = re.search(quantity_pattern, line)
    product_code_match = re.search(product_code_pattern, line)
    product_name_match = re.search(product_name_pattern, line)

    # Assign extracted values
    if date_match:
        line_data["DATE"] = date_match.group()
    if money_match:
        line_data["MONEY"] = money_match.group()
    if quantity_match:
        line_data["QUANTITY"] = quantity_match.group().split(":")[-1].strip()
    if product_code_match:
        line_data["PRODUCT_CODE"] = product_code_match.group()
    if product_name_match:
        line_data["PRODUCT_NAME"] = product_name_match.group()

    try:
        return ParsedData(**line_data)
    except Exception as e:
        logger.error(f"Error parsing line: {e}")
        return ParsedData()

# Function to find the next available filename in sequence
def get_next_output_filename(output_folder):
    existing_files = [f for f in os.listdir(output_folder) if f.startswith("Structured_Text") and f.endswith(".json")]
    existing_numbers = []

    # Extract numbers from existing filenames
    for filename in existing_files:
        number_part = filename[len("Structured_Text"):].replace(".json", "")
        if number_part.isdigit():
            existing_numbers.append(int(number_part))

    # Determine the next available number
    next_number = max(existing_numbers, default=0) + 1
    return f"Structured_Text{next_number}.json"

# Main function to process all files in a folder
def process_all_files_in_folder(input_folder, output_folder):
    # Ensure the output folder exists
    os.makedirs(output_folder, exist_ok=True)

    # Iterate through all .txt files in the input folder
    for file_name in os.listdir(input_folder):
        if file_name.endswith('.txt'):
            input_file_path = os.path.join(input_folder, file_name)
            print(f"Processing file: {input_file_path}")

            # Read input file and process lines
            structured_data = []
            with open(input_file_path, "r", encoding="utf-8") as file:
                for line in file:
                    if line.strip():  # Ignore empty lines
                        parsed_data = parse_line(line)
                        if parsed_data:  # Only add non-empty data
                            structured_data.append(parsed_data)

            # Determine the next output file name
            output_file_name = get_next_output_filename(output_folder)
            output_file_path = os.path.join(output_folder, output_file_name)

            # Write output to JSON file
            with open(output_file_path, "w", encoding="utf-8") as json_file:
                json.dump(structured_data, json_file, indent=4)

            print(f"Structured data saved to: {output_file_path}")

# Example usage
if __name__ == "__main__":
    input_folder = 'F:/repogit/X-seLLer-8/frontend/public/outputs/'  # Folder containing input text files
    output_folder = 'F:/repogit/X-seLLer-8/backend/uploads/'        # Folder to save JSON outputs

    process_all_files_in_folder(input_folder, output_folder)
