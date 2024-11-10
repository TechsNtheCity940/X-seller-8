import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer, util
import os
import re

# Initialize the sentence transformer model
model = SentenceTransformer('all-MiniLM-L6-v2')  # Lightweight and fast model

# File paths
inventory_file = 'F:/repogit/X-seLLer-8/frontend/public/output/Inventory.xlsx'
food_inventory_file = "F:/repogit/X-seller-8/frontend/public/FoodInventory.xlsx"
updated_food_inventory_file = 'F:/repogit/X-seLLer-8/frontend/public/output/UpdatedFoodInventory.xlsx'
unmatched_items_file = 'F:/repogit/X-seLLer-8/frontend/public/output/UnmatchedItems.xlsx'

# Normalize text function
def normalize_text(text):
    if not isinstance(text, str):
        return ""
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)  # Remove special characters
    text = text.lower().strip()
    return text

# Generate embeddings for a list of texts
def generate_embeddings(text_list):
    normalized_texts = [normalize_text(text) for text in text_list]
    embeddings = model.encode(normalized_texts, convert_to_tensor=True)
    return embeddings

# Find the best match using cosine similarity
def get_best_match(item_name, item_list_embeddings, item_list):
    item_name_normalized = normalize_text(item_name)
    item_name_embedding = model.encode(item_name_normalized, convert_to_tensor=True)

    # Compute cosine similarity
    similarities = util.cos_sim(item_name_embedding, item_list_embeddings)[0]
    best_match_idx = np.argmax(similarities).item()
    best_match_score = similarities[best_match_idx].item()

    # Set a threshold for minimum similarity score (0.6 is a reasonable starting point)
    if best_match_score >= 0.6:
        return item_list[best_match_idx], best_match_score
    return None, None

# Update inventory function
def update_inventory(inventory_file, existing_inventory_file, updated_inventory_file):
    try:
        # Load inventory data
        inventory_df = pd.read_excel(inventory_file)
        inventory_df.columns = inventory_df.columns.str.lower().str.strip()
        print(f"{inventory_file} Columns:", inventory_df.columns.tolist())

        # Load existing inventory data
        existing_inventory_df = pd.read_excel(existing_inventory_file)
        existing_inventory_df.columns = existing_inventory_df.columns.str.lower().str.strip()
        print(f"{existing_inventory_file} Columns:", existing_inventory_df.columns.tolist())

        # Normalize column names
        item_col_inventory = 'item name'
        price_col_inventory = 'item price'
        delivered_col_inventory = 'delivered'

        item_col_existing = 'item name'
        price_col_existing = 'item price'
        inventory_col_existing = 'inventory'

        # Ensure the inventory column is initialized
        existing_inventory_df[inventory_col_existing] = existing_inventory_df[inventory_col_existing].fillna(0)

        # Generate embeddings for existing item names
        existing_item_names = existing_inventory_df[item_col_existing].tolist()
        existing_item_embeddings = generate_embeddings(existing_item_names)

        # Unmatched items list
        unmatched_items = []

        # Iterate through inventory data
        for _, row in inventory_df.iterrows():
            item_name = row[item_col_inventory]
            new_price = row[price_col_inventory]
            delivered_quantity = row[delivered_col_inventory]

            # Get the best match using embeddings
            matched_item, similarity_score = get_best_match(item_name, existing_item_embeddings, existing_item_names)

            if matched_item:
                # Find the index of the matched item
                matched_index = existing_inventory_df[existing_inventory_df[item_col_existing].str.strip().str.lower() == matched_item.lower()]

                if not matched_index.empty:
                    index = matched_index.index[0]
                    current_price = existing_inventory_df.at[index, price_col_existing]
                    current_inventory = existing_inventory_df.at[index, inventory_col_existing]

                    # Update price and inventory count
                    existing_inventory_df.at[index, price_col_existing] = new_price
                    existing_inventory_df.at[index, inventory_col_existing] = current_inventory + delivered_quantity

                    print(f"Updated {matched_item}: Price = {new_price}, New Inventory = {existing_inventory_df.at[index, inventory_col_existing]}, Similarity Score = {similarity_score:.2f}")
                else:
                    unmatched_items.append(item_name)
            else:
                unmatched_items.append(item_name)

        # Save updated inventory
        existing_inventory_df.to_excel(updated_inventory_file, index=False)
        print(f"Updated inventory saved to {updated_inventory_file}")

        # Save unmatched items
        unmatched_df = pd.DataFrame(unmatched_items, columns=['Unmatched Items'])
        unmatched_df.to_excel(unmatched_items_file, index=False)
        print(f"Unmatched items saved to {unmatched_items_file}")

    except Exception as e:
        print(f"Error updating inventory: {e}")

# Run update for FoodInventory
update_inventory(inventory_file, food_inventory_file, updated_food_inventory_file)