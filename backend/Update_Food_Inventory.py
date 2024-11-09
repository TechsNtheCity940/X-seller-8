import pandas as pd
from fuzzywuzzy import process

# File paths
inventory_file = 'F:/repogit/X-seLLer-8/frontend/public/output/Inventory.xlsx'
food_inventory_file = "F:/repogit/X-seller-8/frontend/public/FoodInventory.xlsx"
updated_food_inventory_file = 'F:/repogit/X-seLLer-8/frontend/public/output/UpdatedFoodInventory.xlsx'

def find_column_name(columns, possible_names):
    """Helper function to find the correct column name."""
    for col in columns:
        col_lower = col.strip().lower()
        for name in possible_names:
            if name.lower() in col_lower:
                return col
    return None

def get_best_match(item_name, item_list):
    """Use fuzzy matching to find the best match for an item name."""
    best_match, score = process.extractOne(item_name, item_list)
    return best_match if score >= 80 else None  # Only accept matches with a score of 80 or higher

def update_food_inventory():
    # Load Inventory.xlsx (new scanned data)
    try:
        inventory_df = pd.read_excel(inventory_file)
        print("Inventory.xlsx Columns:", inventory_df.columns.tolist())
    except Exception as e:
        print(f"Error reading {inventory_file}: {e}")
        return

    # Load FoodInventory.xlsx (existing data)
    try:
        food_inventory_df = pd.read_excel(food_inventory_file)
        print("FoodInventory.xlsx Columns:", food_inventory_df.columns.tolist())
    except Exception as e:
        print(f"Error reading {food_inventory_file}: {e}")
        return

    # Normalize column names
    inventory_df.columns = inventory_df.columns.str.lower().str.strip()
    food_inventory_df.columns = food_inventory_df.columns.str.lower().str.strip()

    # Detect correct column names
    item_col_inventory = find_column_name(inventory_df.columns, ['item', 'item name'])
    price_col_inventory = find_column_name(inventory_df.columns, ['price', 'item price'])
    delivered_col_inventory = find_column_name(inventory_df.columns, ['delivered'])

    item_col_food = find_column_name(food_inventory_df.columns, ['item', 'item name'])
    price_col_food = find_column_name(food_inventory_df.columns, ['price', 'item price'])
    inventory_col_food = find_column_name(food_inventory_df.columns, ['inventory', 'stock'])

    # Check if all required columns are found
    if not all([item_col_inventory, price_col_inventory, delivered_col_inventory]):
        print("Error: Could not find required columns in Inventory.xlsx.")
        return

    if not all([item_col_food, price_col_food, inventory_col_food]):
        print("Error: Could not find required columns in FoodInventory.xlsx.")
        return

    # Get list of item names from FoodInventory.xlsx for fuzzy matching
    food_item_names = food_inventory_df[item_col_food].str.strip().str.lower().tolist()

    # Iterate over each row in Inventory.xlsx
    for _, row in inventory_df.iterrows():
        item_name = row[item_col_inventory].strip().lower()
        new_price = row[price_col_inventory]
        delivered_quantity = row[delivered_col_inventory]

        # Find the best fuzzy match for the item name
        matched_item = get_best_match(item_name, food_item_names)

        if matched_item:
            # Get the index of the matched item in FoodInventory.xlsx
            index = food_inventory_df[food_inventory_df[item_col_food].str.strip().str.lower() == matched_item].index[0]
            current_price = food_inventory_df.at[index, price_col_food]
            current_inventory = food_inventory_df.at[index, inventory_col_food]

            # Update the price with the most recent price
            food_inventory_df.at[index, price_col_food] = new_price

            # Update the inventory count by adding the delivered quantity
            food_inventory_df.at[index, inventory_col_food] = current_inventory + delivered_quantity

            print(f"Updated {matched_item}: Price = {new_price}, New Inventory = {food_inventory_df.at[index, inventory_col_food]}")
        else:
            print(f"No suitable match found for '{item_name}'. Skipping.")

    # Save the updated FoodInventory.xlsx
    try:
        food_inventory_df.to_excel(updated_food_inventory_file, index=False)
        print(f"Updated FoodInventory saved to {updated_food_inventory_file}")
    except Exception as e:
        print(f"Error saving updated food inventory: {e}")

if __name__ == "__main__":
    update_food_inventory()