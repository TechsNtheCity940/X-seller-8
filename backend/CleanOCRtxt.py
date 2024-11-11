import re
import unicodedata

def clean_ocr_text(text, fix_misrecognitions=True):
    """
    Cleans raw OCR text data with advanced techniques.

    Parameters:
        text (str): The raw OCR extracted text.
        fix_misrecognitions (bool): If True, correct common OCR misrecognitions.

    Returns:
        str: The cleaned text.
    """
    
    # Step 1: Normalize Unicode characters
    text = unicodedata.normalize("NFKD", text)

    # Step 2: Remove unwanted characters (non-printable, control characters)
    text = re.sub(r"[\x00-\x1F\x7F-\x9F]", "", text)

    # Step 3: Remove excessive whitespace and newlines
    text = re.sub(r"\s+", " ", text).strip()

    # Step 4: Remove common OCR artifacts (e.g., stray punctuation and special symbols)
    text = re.sub(r"[`~@#$%^&*_=+<>/\|\\]", "", text)

    # Step 5: Fix common OCR misrecognitions (e.g., '1' -> 'I', '0' -> 'O')
    if fix_misrecognitions:
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

    # Step 6: Final cleanup of any extra spaces
    text = re.sub(r"\s+", " ", text).strip()

    return text

def process_large_file(input_path, output_path, chunk_size=1024 * 1024):
    """
    Processes a large text file by reading in chunks, cleaning the text, and writing the result.

    Parameters:
        input_path (str): Path to the input text file.
        output_path (str): Path to the output cleaned text file.
        chunk_size (int): Size of the chunks to read at a time (default 1MB).
    """
    with open(input_path, 'r', encoding='utf-8', errors='ignore') as infile, \
         open(output_path, 'w', encoding='utf-8') as outfile:
        
        while True:
            chunk = infile.read(chunk_size)
            if not chunk:
                break
            cleaned_chunk = clean_ocr_text(chunk)
            outfile.write(cleaned_chunk + "\n")

# Example usage
input_file = "F:/repogit/X-seller-8/backend/uploads/RawTextExtract.txt"
output_file = "F:/repogit/X-seller-8/backend/uploads/CleanTextExtract.txt"

process_large_file(input_file, output_file)