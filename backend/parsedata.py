import re
import pandas as pd
import json
import csv

def parse_invoice_data(raw_text):
    pattern = re.compile(
        r"(?P<name>[A-Za-z\s\-'()]+)"
        r"(?:\s*\d{0,6})?\s+\$(?P<price>\d+\.\d{2})"
        r"\s+(?P<ordered>\d+)\s+(?P<delivered>\d+)?"
    )

    parsed_items = []
    for match in pattern.finditer(raw_text):
        item_name = re.sub(r"\b\d{3,}\b", "", match.group("name")).strip()
        price = float(match.group("price"))
        ordered = int(match.group("ordered"))
        delivered = int(match.group("delivered") or 0)

        parsed_items.append({
            "Item Name": item_name,
            "Unit Price": price,
            "Ordered Quantity": ordered,
            "Delivered Quantity": delivered,
        })

    return parsed_items

def save_data_to_files(data, json_path, csv_path):
    df = pd.DataFrame(data)
    df.to_json(json_path, orient='records', indent=4)
    df.to_csv(csv_path, index=False)

def main(input_text_path, json_output_path, csv_output_path):
    with open(input_text_path, 'r', encoding='utf-8') as file:
        raw_text = file.read()

    parsed_data = parse_invoice_data(raw_text)
    save_data_to_files(parsed_data, json_output_path, csv_output_path)
    print(f"Data saved to {json_output_path} and {csv_output_path}")

if __name__ == "__main__":
    main('F:/repogit/x-seller-8/structured_data.txt', 'F:/repogit/x-seller-8/backend/structured_data.json', 'F:/repogit/x-seller-8/backend/structured_data.csv')
