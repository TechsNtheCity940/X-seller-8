import re

def extract_capitalized_phrases(input_file_path, output_file_path):
    """
    Extracts capitalized phrases from a text file where each phrase starts with a capital letter and contains no numbers.
    Saves each phrase as a separate line in the output file.

    Parameters:
    - input_file_path (str): Path to the input text file.
    - output_file_path (str): Path to the output text file where capitalized phrases will be saved.
    """
    # Regular expression to match sequences of words that start with a capital letter, ignoring segments with numbers
    phrase_pattern = re.compile(r'\b(?:[A-Z][a-z]*\s?)+\b')

    try:
        # Read the raw text from the file
        with open(input_file_path, 'r', encoding='utf8') as f:
            text = f.read()  # Read entire content as a single string for pattern matching

        # Find all capitalized phrases
        capitalized_phrases = phrase_pattern.findall(text)

        # Filter out any phrases that contain numbers
        capitalized_phrases = [phrase.strip() for phrase in capitalized_phrases if not re.search(r'\d', phrase)]

        # Write the extracted capitalized phrases to the output file
        with open(output_file_path, 'w') as output_file:
            for phrase in capitalized_phrases:
                output_file.write(phrase + '\n')
        
        print(f"Capitalized phrases extracted successfully to {output_file_path}")

    except FileNotFoundError:
        print(f"Error: The file '{input_file_path}' was not found.")
    except IOError:
        print(f"Error: Could not read the file '{input_file_path}'.")

# Example usage
input_file_path = r'F:\repogit\X-seller-8\backend\uploads\StructuredTableData.txt'
output_file_path = r'F:\repogit\X-seller-8\backend\uploads\CapitalizedPhrases.txt'
extract_capitalized_phrases(input_file_path, output_file_path)

import re

def extract_all_prices(input_file_path, output_file_path):
    """
    Extracts all prices from a text file, where prices are defined as numeric values prefixed by $
    or in the 12.34 format. Saves the extracted prices to an output file in the order they appear.

    Parameters:
    - input_file_path (str): Path to the input text file.
    - output_file_path (str): Path to the output text file where extracted prices will be saved.
    """
    # Refined pattern to capture entire price amounts, including $ and 12.34 formats
    price_pattern = re.compile(r'\$\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\b\d{1,2}\.\d{2}\b')

    try:
        # Read the raw text from the file
        with open(input_file_path, 'r', encoding='utf-8') as f:
            text = f.read()

        # Find all matches of prices in the text
        prices = price_pattern.findall(text)

        # Write the extracted prices to the output file
        with open(output_file_path, 'w') as output_file:
            for price in prices:
                output_file.write(price + '\n')
        
        print(f"Prices extracted successfully to {output_file_path}")

    except FileNotFoundError:
        print(f"Error: The file '{input_file_path}' was not found.")
    except IOError:
        print(f"Error: Could not read the file '{input_file_path}'.")

# Example usage
input_file_path = r'F:\repogit\X-seller-8\backend\uploads\StructuredTableData.txt'
output_file_path = r'F:\repogit\X-seller-8\backend\uploads\ExtractedPrices.txt'
extract_all_prices(input_file_path, output_file_path)

import re

def clean_text(input_file_path, output_file_path):
    """
    Cleans text by removing specified irrelevant words, single-letter words, and words shorter than three characters.
    Only meaningful phrases are saved in the output.

    Parameters:
    - input_file_path (str): Path to the input text file.
    - output_file_path (str): Path to the output text file where cleaned text will be saved.
    """
    # Define irrelevant words to remove
    irrelevant_words = {
        "Filled", "Customer", "Invoice", "Email", "Branch", "Name", "Total", "Prepared", "Misc", "Commonly",
        "Date", "Sent", "Received", "Special", "Instructions", "Signature", "Prepared", "Pars", "Wines", "Ordered",
        "Company", "Amount", "Notes", "Page", "OK", "TX", "Fille", "Osteen", "Advance", "bek", "Case", "Cases",
        "Whiskey", "Toby", "Keiths", "Total", "Price", "Delivered", "Customer", "Total", "Liquors", "Vodka", "Gin",
        "Champagne", "Prev"
    }
        # Read the input text
    with open(input_file_path, 'r') as file:
        lines = file.readlines()
   # List to hold cleaned lines
    cleaned_lines = []
    
    for line in lines:
        # Remove any line that matches an irrelevant word or is too short
        words = line.strip().split()
        cleaned_words = []
        
        for word in words:
            # Retain word only if:
            # - It is not in the irrelevant words list
            # - It has at least 3 characters
            # - It does not contain numbers
            # - It starts with a capital letter followed by lowercase (not fully uppercase)
            if (word not in irrelevant_words and 
                len(word) >= 3 and 
                not re.search(r'\d', word) and
                not word.isupper() and                # Exclude fully uppercase words
                re.match(r'^[A-Z][a-z]+$', word)):    # Match Capitalized words (First letter uppercase only)
                cleaned_words.append(word)
        
        # Recombine cleaned words into a line if it has valid content
        if cleaned_words:
            cleaned_lines.append(" ".join(cleaned_words))
    
    # Write the cleaned content to the output file
    with open(output_file_path, 'w') as output_file:
        for line in cleaned_lines:
            output_file.write(line + '\n')

    print(f"Text cleaned and saved to {output_file_path}")
# Example usage
input_file_path = r'F:\repogit\X-seller-8\backend\uploads\CapitalizedPhrases.txt'
output_file_path = r'F:\repogit\X-seller-8\backend\uploads\CleanedCapitalizedPhrases.txt'
clean_text(input_file_path, output_file_path)