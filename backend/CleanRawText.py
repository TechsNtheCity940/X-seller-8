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
input_file_path = r'F:\repogit\X-seller-8\Structured_Data.txt'
output_file_path = r'F:\repogit\X-seller-8\backend\uploads\Structured_Phrases.txt'
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
input_file_path = r'F:\repogit\X-seller-8\backend\uploads\Structured_Data.txt'
output_file_path = r'F:\repogit\X-seller-8\backend\uploads\Extracted_Prices.txt'
extract_all_prices(input_file_path, output_file_path)

import re
from rapidfuzz import process, fuzz

def clean_text_with_relevant_words(input_file_path, output_file_path, relevant_words):
    """
    Cleans text by retaining only the relevant words based on a given list of recognized words.
    Advanced fuzzy matching is used for OCR error handling.

    Parameters:
    - input_file_path (str): Path to the input text file.
    - output_file_path (str): Path to the output text file.
    - relevant_words (list): List of recognized relevant words.
    """
    # Normalize the relevant words for fuzzy matching
    normalized_relevant_words = {word.lower(): word for word in relevant_words}

    # Function to normalize and clean word for matching
    def normalize_word(word):
        return re.sub(r'\W+', '', word.lower().strip())

    # Read the input text
    with open(input_file_path, 'r') as file:
        lines = file.readlines()

    # List to hold cleaned lines
    cleaned_lines = []

    for line in lines:
        words = line.strip().split()
        cleaned_words = []

        for word in words:
            # Normalize the word
            normalized_word = normalize_word(word)

            # Use fuzzy matching to find the closest relevant word
            best_match = process.extractOne(normalized_word, normalized_relevant_words.keys(), scorer=fuzz.ratio)

            if best_match and best_match[1] >= 85:  # Threshold for matching accuracy
                matched_relevant_word = normalized_relevant_words[best_match[0]]
                cleaned_words.append(matched_relevant_word)

        # Recombine cleaned words into a line if it has valid content
        if cleaned_words:
            cleaned_lines.append(" ".join(cleaned_words))

    # Write the cleaned content to the output file
    with open(output_file_path, 'w') as output_file:
        for line in cleaned_lines:
            output_file.write(line + '\n')

    print(f"Text cleaned and saved to {output_file_path}")

# Example usage
input_file_path = r'F:\repogit\X-seller-8\backend\uploads\Structured_Phrases.txt'
output_file_path = r'F:\repogit\X-seller-8\backend\uploads\Cleaned_Structured_Phrases.txt'

# List of relevant words you provided
relevant_words=[
    "BUTTER SOLID USDA AA SLTD", "BUTTERMILK FRESH 1%", "CHEESE AMERICAN SLICES", "CHEESE CHEDDAR BLOCK",
    "CHEESE PARMESAN SHRD FINE NL", "CHEESE SWISS AMERICAN", "CREAM SOUR CULTURED", "CREAM WHIPPING HVY",
    "CREAMER HALF N HALF", "CREAMER NON-DAIRY FRENCH VAN", "EGG HARDBOILED WHL PEEL (10LB)",
    "EGG HARDBOILED WHL PEEL SEL (25LB)", "EGG SHELL MED GR AA USDA WHT", "EGG WHITE LIQ W/TEC",
    "MARGERINE BUTTER WHIP EURO", "MILK HOMOGENIZED (CHOC)", "MILK HOMOGENIZED (WHITE)", "MILK HOMOGENIZED (GALLON)",
    "BACON LAYFLAT E/E 18/22 COB GF", "BEEF GROUND SMSHPTY 80\20 VAC6", "BEEF ROAST POT CKD OLD FASH",
    "BEEF STEAK FNGR BTRMLK BRD RAW", "BEEF STEAK PHILLY MAR FLAT", "HAM BUFFET", "HAM STEAK BONE IN 5 OZ",
    "PORK CHOP CC BI", "SAUSAGE BULK MILD WHL HOG (6/2LB)", "SAUSAGE PATTY", "STEAK CUBE PECTORAL",
    "CATFISH FIL IQF 4-5 OZ", "CATFISH FIL SHANK 7-9 OZ USA", "CHICKEN BRST BNLS SKLS 6OZ MAR",
    "CHICKEN BRST TNDR BUTRMILK BRD", "CHICKEN CVP BREAST", "CHICKEN WING SECTNS CAJN GLZD",
    "CORN DOG TURKEY HNY BTR 4X1", "TURKEY BREAST SMOKED", "BLUEBERRY CULT", "BREAD HOAGIE SOFT 6\"",
    "POTATO FRY 1/4 SS GR A NW", "LEMON", "LETTUCE ROMAINE CROWN", "DR PEPPER", "DIET DR PEPPER",
    "LEMONADE", "MOUNTAIN DEW", "PEPSI", "DIET PEPSI", "ROOT BEER", "SIERRA MIST", "TEA BREW FILTER PACK",
    "White claw mango 12ml", "Angostura Bitters 4oz", "Bluebird Grapefruit 11.5oz", "Cherry Maraschino Gallon 1gal",
    "Finest Call Grenadine Syrup 1L", "Finest Call Margarita Mix 1L", "Finest Call Old Fashioned Mix 1L",
    "Finest Call Peach Puree Mix 1L", "Finest Call Watermelon Puree 1L", "Ginger Ale 8oz", "Gosling's Ginger Beer 12oz",
    "Juice Cranberry Lyons 46oz", "Juice Sun Berry Cranberry juice 1L", "Juice Sun Berry Orange juice 1L",
    "Juice Sun Berry Pineapple juice 1L", "Juice Tomato 6oz", "MIX COCKTAIL Bloody Mary 1L",
    "MIX COCKTAIL Triple Sec 1L", "Mix Finest Call Pina Colada Mix 1L", "Mix Finest Call Strawberry Puree 1L",
    "Mix Finest Call Sweet & Sour 1L", "Monin Agave Nectar 1L", "Monin Red Sangria Mix 1L",
    "Monin Spicy Mango 1L", "Ocean Spray White graoefruit juice 7.2oz", "Real Blueberry Syrup 16.9oz",
    "Ronson Stuffed Olives 1gal", "White Rock Tonic Water 10oz", "Barton Long Island Tea 1L",
    "Bacardi Superior Light Rum 1L", "Barbarossa Silver Rum 1L", "Captain Morgan Spiced Rum 1L",
    "Conciere Silver Rum 1L", "Malibu Coconut Rum 1L", "Myers 1L", "RumChata Liqueur 1L",
    "Basil Hayden's Bourbon 1L", "Bulleit Rye Whiskey 1L", "Canadian Club 1858 1L", "Conciere Blended Whiskey 1L",
    "Crown Apple 1L", "Crown Peach 1L", "Crown Royal Canadian Whisky 1L", "Crown Vanilla 1L",
    "Fireball Cinnamon Whiskey 1L", "Gentleman Jack Whiskey 1L", "Jack Daniel's Apple 750ml",
    "Jack Daniel's Old No 7 Whiskey 1L", "Jack Daniel's Tennessee Fire 1L", "Jack Daniel's Tennessee Honey Whiskey 1L",
    "Jack Daniels Apple 1L", "Jameson Irish Whiskey 1L", "Jameson Orange 1L", "Jim Beam 1L",
    "Kentucky Dale Blended Whiskey 1L", "Knob Creek Rye 1L", "Maker's Mark Bourbon 1L",
    "Old Forester Bourbon 1L", "Pendleton Whiskey 1L", "Seagram's 7 Crown American Whiskey 1L",
    "Skrewball Peanut Butter Whiskey 1L", "Southern Comfort 1L", "TX Blended Whiskey 750ml",
    "Woodford Reserve Bourbon 1L", "Courvoisier VSOP Cognac 1L", "Hennessy VS Cognac 1L",
    "Bombay Sapphire Gin 1L", "Concierce Gin 1L", "Hendrick's Gin 1L", "Taaka Gin 1L",
    "Tanqueray Gin 1L", "Amaretto Disaronno 1L", "Bailey's Irish Cream 1L", "Campari 1L",
    "Chambord Liqueur 750ml", "Cointreau Liq. 1L", "DeKuyper Buttershots Schnapps 1L",
    "DeKuyper Melon 1L", "DeKuyper Razzamatazz Schnapps 1L", "DeKuyper Sour Apple Pucker Schnapps 1L",
    "E&J Brandy 1L", "Frangelico 750ml", "Grand Marnier 1L", "Jagermeister 1L",
    "Kahlua 1L", "Midori Melon 1L", "Mr Boston Amaretto 1L"
]
clean_text_with_relevant_words(input_file_path, output_file_path, relevant_words)