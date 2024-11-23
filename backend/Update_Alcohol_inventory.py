import pandas as pd
import json
import os
from sentence_transformers import SentenceTransformer, util
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
import nltk
print(nltk.data.path)
import re
nltk.download('punkt')
nltk.download('punkt_tab')
nltk.download('tokenizers/punkt_tab/english')
nltk.download('stopwords')
nltk.download('wordnet')
nltk.download('all')
nltk.data.path.append('C:/Users/wonde/AppData/Roaming/nltk_data')

# Initialize Sentence-BERT model
model = SentenceTransformer('all-MiniLM-L6-v2')

# File paths
parsed_items_file = 'F:/repogit/X-seLLer-8/backend/output/ParsedItems.json'
food_inventory_file = "F:/repogit/X-seLLer-8/frontend/public/FoodInventory.xlsx"
updated_food_inventory_file = 'F:/repogit/X-seLLer-8/frontend/public/output/UpdatedFoodInventory.xlsx'
unmatched_items_file = 'F:/repogit/X-seLLer-8/frontend/public/output/UnmatchedItems.xlsx'

# Text normalization function
def normalize_text(text):
    text = text.lower().strip()
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    text = ' '.join(word for word in word_tokenize(text) if word not in stopwords.words('english'))
    return text

# Function to use Sentence-BERT for item matching
def get_best_match_ml(item_name, item_list):
    item_name_normalized = normalize_text(item_name)
    item_embedding = model.encode(item_name_normalized, convert_to_tensor=True)
    item_list_embeddings = model.encode([normalize_text(name) for name in item_list], convert_to_tensor=True)
    scores = util.pytorch_cos_sim(item_embedding, item_list_embeddings)[0]
    best_match_idx = scores.argmax().item()
    best_match_score = scores[best_match_idx].item()
    return item_list[best_match_idx], best_match_score

# Update inventory with handling for unmatched items
def update_inventory(parsed_items_file, food_inventory_file):
    try:
        # Load ParsedItems.json
        with open(parsed_items_file, 'r') as file:
            parsed_items = json.load(file)

        food_inventory_df = pd.read_excel(food_inventory_file)
        food_inventory_df.columns = food_inventory_df.columns.str.lower().str.strip()

        # Ensure item, price, and inventory columns are identified
        item_col_food = 'item name'
        price_col_food = 'price'
        inventory_col_food = 'stock'

        food_item_names = food_inventory_df[item_col_food].str.strip().str.lower().tolist()
        unmatched_items = []

        for item in parsed_items:
            item_name = str(item['name']).strip().lower()  # Ensure item_name is a string
            new_price = item['price']
            delivered_quantity = item['quantity']

            matched_item, match_score = get_best_match_ml(item_name, food_item_names)

        if match_score >= 0.75:
            index = food_inventory_df[food_inventory_df[item_col_food].astype(str).str.strip().str.lower() == matched_item].index[0]
            current_price = food_inventory_df.at[index, price_col_food]
            current_inventory = food_inventory_df.at[index, inventory_col_food]

            # Update price and inventory
            food_inventory_df.at[index, price_col_food] = new_price
            food_inventory_df.at[index, inventory_col_food] = current_inventory + delivered_quantity

            print(f"Updated {matched_item}: New Price = {new_price}, New Inventory = {current_inventory + delivered_quantity}")
        else:
            unmatched_items.append({'Item Name': item_name, 'Suggested Match': matched_item, 'Match Score': match_score})


        # Save unmatched items to a separate file for manual review
        if unmatched_items:
            unmatched_df = pd.DataFrame(unmatched_items)
            unmatched_df.to_excel(unmatched_items_file, index=False)
            print(f"Unmatched items saved to {unmatched_items_file}")

        # Save updated inventory
        food_inventory_df.to_excel(updated_food_inventory_file, index=False)
        print(f"Updated inventory saved to {updated_food_inventory_file}")

    except Exception as e:
        print(f"Error updating inventory: {e}")

# Main function to update food inventory
if __name__ == "__main__":
    update_inventory(parsed_items_file, food_inventory_file)