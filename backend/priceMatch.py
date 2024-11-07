import pandas as pd
import re
from rapidfuzz import process, fuzz

# Function to normalize item names for better comparison
def normalize_name(name):
    return re.sub(r'\s+', ' ', re.sub(r'[^\w\s]', '', name.lower())).strip()

# Function to load lines from a file
def load_file_lines(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        return [line.strip() for line in file.readlines()]

# Function to match items with prices, ordered, and delivered quantities using fuzzy matching
def extract_item_prices(item_names, structured_data, extracted_prices, threshold=85):
    result = []
    structured_dict = {}

    # Normalize structured data into a dictionary
    for line in structured_data:
        parts = line.split('\t')
        if len(parts) >= 4:  # Ensure the line has enough parts for price, ordered, and delivered
            item_name = normalize_name(parts[0].strip())
            try:
                item_price = float(parts[1].strip().replace('$', ''))
                ordered = int(parts[2].strip())
                delivered = int(parts[3].strip())
                structured_dict[item_name] = {'price': item_price, 'ordered': ordered, 'delivered': delivered}
            except ValueError:
                continue

    # Iterate over item names to match and extract data
    for i, item in enumerate(item_names):
        normalized_item = normalize_name(item)
        match_data = None

        # Fuzzy matching to find the best match in structured data
        best_match = process.extractOne(normalized_item, structured_dict.keys(), scorer=fuzz.ratio)
        
        if best_match:
            match_name, score, _ = best_match
            if score >= threshold:
                match_data = structured_dict[match_name]
        elif i < len(extracted_prices):
            try:
                price = float(extracted_prices[i].replace('$', '').strip())
                match_data = {'price': price, 'ordered': None, 'delivered': None}
            except ValueError:
                match_data = None

        if match_data is not None:
            result.append({
                'Item Name': item,
                'Item Price': match_data['price'],
                'Ordered': match_data['ordered'],
                'Delivered': match_data['delivered']
            })

    return result

def main():
    # File paths
    phrases_file = r"F:/repogit/X-seller-8/backend/uploads/CleanedCapitalizedPhrases.txt"
    prices_file = r'F:/repogit/X-seller-8/backend/uploads/ExtractedPrices.txt'
    structured_file = r'F:/repogit/X-seller-8/backend/uploads/StructuredTableData.txt'
    output_excel = r'F:/repogit/X-seller-8/frontend/public/output/Inventory.xlsx'

    # Load data from files
    item_names = load_file_lines(phrases_file)
    extracted_prices = load_file_lines(prices_file)
    structured_data = load_file_lines(structured_file)

    # Extract and match prices with enhanced accuracy, including ordered and delivered quantities
    matched_data = extract_item_prices(item_names, structured_data, extracted_prices)

    # Create a DataFrame and export to Excel
    df = pd.DataFrame(matched_data)
    df.to_excel(output_excel, index=False, sheet_name='Item Prices')

    print(f"Excel file created at {output_excel}")

if __name__ == "__main__":
    main()
