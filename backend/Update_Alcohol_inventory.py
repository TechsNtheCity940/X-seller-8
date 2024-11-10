import pandas as pd
import numpy as np
import os
import re
import nltk
from sklearn.ensemble import IsolationForest
from sentence_transformers import SentenceTransformer, util
from fuzzywuzzy import fuzz
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

nltk.download('stopwords')
nltk.download('punkt')

# Initialize Sentence-BERT model
model = SentenceTransformer('all-MiniLM-L6-v2')

# File paths
inventory_file = 'F:/repogit/X-seLLer-8/frontend/public/output/Inventory.xlsx'
food_inventory_file = "F:/repogit/X-seller-8/frontend/public/FoodInventory.xlsx"
updated_food_inventory_file = 'F:/repogit/X-seLLer-8/frontend/public/output/UpdatedFoodInventory.xlsx'
unmatched_items_file = 'F:/repogit/X-seLLer-8/frontend/public/output/UnmatchedItems.xlsx'
raw_text_file = 'F:/repogit/X-seLLer-8/backend/uploads/RawTextExtract.txt'

# Text normalization function
def normalize_text(text):
    text = text.lower().strip()
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    text = ' '.join(word for word in word_tokenize(text) if word not in stopwords.words('english'))
    return text

# Helper function to find column names
def find_column_name(columns, possible_names):
    for col in columns:
        col_lower = col.strip().lower()
        for name in possible_names:
            if name.lower() in col_lower:
                return col
    return None

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
def update_inventory(inventory_df, food_inventory_file, item_col_inventory, price_col_inventory, delivered_col_inventory):
    try:
        food_inventory_df = pd.read_excel(food_inventory_file)
        food_inventory_df.columns = food_inventory_df.columns.str.lower().str.strip()

        item_col_food = find_column_name(food_inventory_df.columns, ['item', 'item name'])
        price_col_food = find_column_name(food_inventory_df.columns, ['price', 'item price'])
        inventory_col_food = find_column_name(food_inventory_df.columns, ['inventory', 'stock'])

        food_item_names = food_inventory_df[item_col_food].str.strip().str.lower().tolist()
        unmatched_items = []

        for _, row in inventory_df.iterrows():
            item_name = row[item_col_inventory].strip().lower()
            new_price = row[price_col_inventory]
            delivered_quantity = row[delivered_col_inventory]

            matched_item, match_score = get_best_match_ml(item_name, food_item_names)

            if match_score >= 0.75:
                index = food_inventory_df[food_inventory_df[item_col_food].str.strip().str.lower() == matched_item].index[0]
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

        # Delete RawTextExtract.txt after processing
        #if os.path.exists(raw_text_file):
        #    os.remove(raw_text_file)
        #    print("Deleted RawTextExtract.txt")

    except Exception as e:
        print(f"Error updating inventory: {e}")

# Main function to update both food and alcohol inventory
def update_all_inventories():
    try:
        # Update Food Inventory
        print("Updating Food Inventory...")
        inventory_df = pd.read_excel(inventory_file)
        inventory_df.columns = inventory_df.columns.str.lower().str.strip()

        item_col_inventory = find_column_name(inventory_df.columns, ['item', 'item name'])
        price_col_inventory = find_column_name(inventory_df.columns, ['price', 'item price'])
        delivered_col_inventory = find_column_name(inventory_df.columns, ['delivered'])

        update_inventory(inventory_df, food_inventory_file, item_col_inventory, price_col_inventory, delivered_col_inventory)

        print("Food Inventory updated successfully.")

    except Exception as e:
        print(f"Error updating Food Inventory: {e}")

if __name__ == "__main__":
    update_all_inventories()
