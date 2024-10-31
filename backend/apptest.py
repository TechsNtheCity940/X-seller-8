import re

# Load the raw text data
file_path = 'F:/repogit/X-seller-8/backend/uploads/RawTextExtract.txt'
with open(file_path, 'r') as file:lines = file.readlines()

# Initialize container for structured data
structured_rows = []

def parse_row(line):
    """
    Splits a line based on sequences of multiple spaces to identify columns.
    Each resulting segment becomes a value in the row.
    """
    columns = re.split(r'\s{2,}', line.strip())  # Split by 2 or more spaces
    return columns

for line in lines:
    line = line.strip()
    
    # Parse each line as a new row in the table
    if line:  # Skip any empty lines
        row_data = parse_row(line)
        structured_rows.append(row_data)

# Save structured data as .txt with tab-separated columns
output_txt_path = 'StructuredTableData.txt'
with open(output_txt_path, 'w') as txt_file:
    for row in structured_rows:
        txt_file.write('\t'.join(row) + '\n')

print(f"Structured data saved to {output_txt_path}")

		