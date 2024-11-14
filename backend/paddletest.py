import easyocr
import sys
import os
import pandas as pd
import re

# Force UTF-8 encoding
os.environ["PYTHONIOENCODING"] = "utf-8"

def extract_text(image_path):
    reader = easyocr.Reader(['en'], gpu=True)
    result = reader.readtext(image_path)

    plain_text = []
    table_data = []

    # Regex pattern to detect potential table rows (e.g., containing numbers, prices)
    table_pattern = re.compile(r"^([A-Za-z\s\-'()]+)\s+\$?(\d{1,3}\.\d{2})\s+(\d{1,4})\s*(\d{1,4})?$")

    for text in result:
        line = text[1].strip()
        match = table_pattern.match(line)

        if match:
            # Extract structured data from the matched line
            item_name = match.group(1).strip()
            item_price = float(match.group(2))
            ordered_quantity = int(match.group(3))
            delivered_quantity = int(match.group(4)) if match.group(4) else None

            table_data.append({
                "Item Name": item_name,
                "Price": item_price,
                "Ordered": ordered_quantity,
                "Delivered": delivered_quantity
            })
        else:
            # Append to plain text if not a table row
            plain_text.append(line)

    # Print extracted plain text
    print("Extracted Plain Text:")
    print("\n".join(plain_text))

    # Convert table data to DataFrame if any table rows are detected
    if table_data:
        df = pd.DataFrame(table_data)
        print("\nExtracted Table Data:")
        print(df)

        # Optionally, save the DataFrame to Excel
        output_path = os.path.splitext(image_path)[0] + "_extracted_table.xlsx"
        df.to_excel(output_path, index=False)
        print(f"\nTable data saved to {output_path}")
    else:
        print("\nNo table data detected.")

if __name__ == "__main__":
    image_path = r'F:/repogit/X-seller-8/frontend/public/testfiles/BEK.png'
    extract_text(image_path)
