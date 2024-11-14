import json

import re



# File paths

input_file_path = 'F:/repogit/X-seLLer-8/frontend/public/outputs/Raw_Text.txt'

output_file_path = 'F:/repogit/X-seLLer-8/backend/uploads/Structured_Text.json'



# Helper function to parse lines

def parse_line(line):

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

    

    return line_data



# Read input file and process

structured_data = []



with open(input_file_path, "r") as file:

    for line in file:

        if line.strip():  # Ignore empty lines

            parsed_data = parse_line(line)

            if parsed_data:  # Only add non-empty data

                structured_data.append(parsed_data)



# Write output to JSON file

with open(output_file_path, "w") as json_file:

    json.dump(structured_data, json_file, indent=4)



# Output path for the generated JSON file

output_file_path