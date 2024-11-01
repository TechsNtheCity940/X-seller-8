import pandas as pd
import re

# Load your own data
data_path = 'F:/repogit/X-seller-8/backend/output/ParsedItems.csv'  # Update with your actual file path
data = pd.read_csv(data_path)
 
# Example of loading raw data for illustration (replace with actual file path)
data = pd.DataFrame({
    'name': [
        'Mustard Yellow Upside Down Heinz 1611302',
        'Apton Distwashing Clear 34x47 John Ritzerthaler Company EA',
        'T4187 Pepper Red Crushed Mccormick it 9.4 per case',
        'Seasoning Blackened Red Fish Cajun Magic 43407',
        'Salt No Msg Lawry\'s 1518 2 Filled',
    ],
    'price': [31.77, 57.96, 9.4, 536.65, 518.6],
    'quantity': [2, 2, 1, 1, 2]
})

# 1. Remove stray numbers that don't add value (e.g., product codes in `name` field)
data['name'] = data['name'].apply(lambda x: re.sub(r'\b\d{4,}\b', '', x))

# 2. Remove filler words and unnecessary phrases commonly found in the data
filler_words = r'\b(Filled|Outofstock|Case|Status|Company|EA)\b'
data['name'] = data['name'].apply(lambda x: re.sub(filler_words, '', x, flags=re.IGNORECASE))

# 3. Remove leading/trailing whitespace and normalize multiple spaces
data['name'] = data['name'].str.strip().replace(r'\s+', ' ', regex=True)

# 4. Convert `price` to numeric, handling any potential currency symbols or inconsistencies
data['price'] = pd.to_numeric(data['price'], errors='coerce')

# 5. Convert `quantity` to integer for consistent tracking
data['quantity'] = pd.to_numeric(data['quantity'], errors='coerce').fillna(0).astype(int)

# Final Cleaned Data
print("Cleaned Data:")
print(data)

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import re

# Step 1: Advanced Cleaning

# Remove stray numbers (e.g., product codes)
data['name'] = data['name'].apply(lambda x: re.sub(r'\b\d{4,}\b', '', str(x)))

# Remove filler words and unwanted phrases
filler_words = r'\b(Filled|Outofstock|Case|Status|Company|EA|per)\b'
data['name'] = data['name'].apply(lambda x: re.sub(filler_words, '', str(x), flags=re.IGNORECASE))

# Normalize whitespace
data['name'] = data['name'].str.strip().replace(r'\s+', ' ', regex=True)

# Convert price and quantity to numeric formats
data['price'] = pd.to_numeric(data['price'], errors='coerce')
data['quantity'] = pd.to_numeric(data['quantity'], errors='coerce').fillna(0).astype(int)

# Step 2: Data Visualization (Post-Cleaning)

# 1. Price Distribution
plt.figure(figsize=(10, 6))
plt.hist(data['price'], bins=20, edgecolor='black')
plt.title('Price Distribution (Cleaned Data)')
plt.xlabel('Price ($)')
plt.ylabel('Frequency')
plt.show()

# 2. Top 10 Items by Quantity Ordered
top_items = data.groupby('name')['quantity'].sum().nlargest(10)
plt.figure(figsize=(12, 8))
top_items.plot(kind='barh', color='skyblue')
plt.title('Top 10 Items by Quantity Ordered (Cleaned Data)')
plt.xlabel('Total Quantity Ordered')
plt.ylabel('Item Name')
plt.gca().invert_yaxis()
plt.show()

# Step 3: Outlier Detection - Detecting Outliers in Price

# Calculate the IQR for price
Q1 = data['price'].quantile(0.25)
Q3 = data['price'].quantile(0.75)
IQR = Q3 - Q1

# Define outlier range
lower_bound = Q1 - 1.5 * IQR
upper_bound = Q3 + 1.5 * IQR

# Identify outliers
outliers = data[(data['price'] < lower_bound) | (data['price'] > upper_bound)]

# Visualization of Outliers in Price with Boxplot
plt.figure(figsize=(10, 6))
sns.boxplot(x=data['price'])
plt.title('Outlier Detection in Price')
plt.xlabel('Price ($)')
plt.show()

# Display outlier data
print("Detected Outliers in Price:")
print(outliers)