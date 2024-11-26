import re
import pandas as pd

# Function to parse a single invoice text block
def parse_invoice(invoice_text):
    # Extract basic details using regex
    invoice_number = re.search(r"Invoice\s*[#:]?\s*(\d+)", invoice_text, re.IGNORECASE)
    date = re.search(r"Invoice Date[:\s]*(\d{1,2}/\d{1,2}/\d{2,4})", invoice_text, re.IGNORECASE)
    vendor = re.search(r"Deliver To[:\s]*([^\n]+)", invoice_text, re.IGNORECASE)

    # Extract items as a list of dictionaries
    item_pattern = re.compile(
        r"(?P<description>.+?)\s+(?P<quantity>\d+)\s+(?P<unit_price>\d+\.\d{2})\s+(?P<total_price>\d+\.\d{2})",
        re.MULTILINE
    )
    items = [
        match.groupdict()
        for match in item_pattern.finditer(invoice_text)
    ]

    # Compile invoice data
    parsed_data = []
    for item in items:
        parsed_data.append({
            "Invoice Number": invoice_number.group(1) if invoice_number else "Unknown",
            "Date": date.group(1) if date else "Unknown",
            "Vendor Name": vendor.group(1) if vendor else "Unknown",
            "Item Description": item['description'],
            "Quantity": int(item['quantity']),
            "Unit Price": float(item['unit_price']),
            "Total Price": float(item['total_price']),
            "Notes/Adjustments": ""
        })
    return parsed_data

# Function to process all invoices in a text file
def process_invoices(input_file):
    with open(input_file, 'r', encoding='utf-8') as file:
        raw_data = file.read()

    # Split the file by invoice sections
    invoices = raw_data.split("ORIGINAL INVOICE")  # Assuming this separates each invoice
    all_data = []

    for invoice_text in invoices:
        parsed_data = parse_invoice(invoice_text)
        all_data.extend(parsed_data)

    return all_data

# Save data to Excel
def save_to_excel(data, output_file):
    df = pd.DataFrame(data)
    df.to_excel(output_file, index=False)

# Example usage
input_file = r"F:/repogit/X-seller-8/structured_data.txt"  # Path to your uploaded file
output_file = r"F:/repogit/X-seller-8/structured_data.xlsx"   # Output Excel file

invoice_data = process_invoices(input_file)
save_to_excel(invoice_data, output_file)
print(f"Data has been saved to {output_file}")