import re
import unicodedata

def clean_cell_text(text):
    """
    Cleans individual cell text within a table structure.
    """
    # Normalize and remove unwanted characters
    text = unicodedata.normalize("NFKD", text)
    text = re.sub(r"[\x00-\x1F\x7F-\x9F]", "", text)
    text = re.sub(r"[`~@#$%^&*_=+<>/\|\\]", "", text)

    # Fix common OCR misrecognitions
    common_misrecognitions = {
        "0": "O",
        "1": "I",
        "l": "I",
        "|": "I",
        "5": "S",
        "6": "G",
    }
    for wrong, correct in common_misrecognitions.items():
        text = text.replace(wrong, correct)
    
    return text.strip()

def clean_ocr_table_text(text, delimiter=r"\s{2,}"):
    """
    Cleans OCR text data while attempting to maintain a table-like structure.

    Parameters:
        text (str): The raw OCR extracted text.
        delimiter (str): Regex pattern for column delimiters, assuming multiple spaces.

    Returns:
        str: The cleaned text with preserved table structure.
    """
    cleaned_lines = []
    
    # Split text into lines to process row by row
    for line in text.splitlines():
        # Split each line into cells based on the delimiter (e.g., two or more spaces)
        cells = re.split(delimiter, line.strip())
        
        # Clean each cell individually to preserve structure
        cleaned_cells = [clean_cell_text(cell) for cell in cells]
        
        # Join cleaned cells with the delimiter (e.g., two spaces) to keep table structure
        cleaned_line = "  ".join(cleaned_cells)
        cleaned_lines.append(cleaned_line)
    
    # Join all cleaned lines with newline to recreate the table-like structure
    return "\n".join(cleaned_lines)

def process_large_table_file(input_path, output_path, delimiter=r"\s{2,}", chunk_size=1024 * 1024):
    """
    Processes a large text file with OCR-extracted tables by cleaning while preserving structure.

    Parameters:
        input_path (str): Path to the input text file.
        output_path (str): Path to the output cleaned text file.
        delimiter (str): Regex pattern for column delimiters, defaulting to two or more spaces.
        chunk_size (int): Size of the chunks to read at a time (default 1MB).
    """
    with open(input_path, 'r', encoding='utf-8', errors='ignore') as infile, \
         open(output_path, 'w', encoding='utf-8') as outfile:
        
        while True:
            chunk = infile.read(chunk_size)
            if not chunk:
                break
            
            # Clean the chunk while preserving table-like structure
            cleaned_chunk = clean_ocr_table_text(chunk, delimiter)
            outfile.write(cleaned_chunk + "\n")

# Example usage
input_file = "F:/repogit/X-seller-8/backend/uploads/RawTextExtract.txt"
output_file = "F:/repogit/X-seller-8/backend/uploads/CleanTextExtract.txt"

process_large_table_file(input_file, output_file)