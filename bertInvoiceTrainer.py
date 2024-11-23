import pandas as pd
import torch
from datasets import load_dataset
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from transformers import BertTokenizer, BertModel, Trainer, TrainingArguments
import torch.nn as nn
import torch.optim as optim

# Step 1: Load Dataset from Hugging Face
dataset = load_dataset('Wonder-Griffin/invoicetracker')
df = pd.DataFrame(dataset['train'])

# Step 2: Data Cleaning and Preprocessing
df.fillna("", inplace=True)
df['input_name'] = df['description'].astype(str) + " " + df['vendor'].astype(str)
df['correct_name'] = df['item_name'].astype(str)

# Convert numeric fields to float
df['PRICE'] = pd.to_numeric(df['price'], errors='coerce').fillna(0.0)
df['ORDERED'] = pd.to_numeric(df['ordered'], errors='coerce').fillna(0)
df['CONFIRMED'] = pd.to_numeric(df['confirmed'], errors='coerce').fillna(0)

# Encode 'STATUS' (Filled/Out of stock)
status_encoder = LabelEncoder()
df['STATUS'] = status_encoder.fit_transform(df['status'].astype(str))

# Step 3: Split Data
train_texts, val_texts, train_labels, val_labels = train_test_split(
    df['input_name'].tolist(),
    df[['PRICE', 'ORDERED', 'CONFIRMED', 'STATUS']].values.tolist(),
    test_size=0.1,
    random_state=42
)

# Step 4: Tokenization
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
train_encodings = tokenizer(train_texts, truncation=True, padding=True, max_length=128)
val_encodings = tokenizer(val_texts, truncation=True, padding=True, max_length=128)

# Step 5: Create Custom Dataset Class
class MultiTaskDataset(torch.utils.data.Dataset):
    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels

    def __getitem__(self, idx):
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item['labels'] = torch.tensor(self.labels[idx], dtype=torch.float)
        return item

    def __len__(self):
        return len(self.labels)

train_dataset = MultiTaskDataset(train_encodings, train_labels)
val_dataset = MultiTaskDataset(val_encodings, val_labels)

# Step 6: Define Multi-Output Model
class BertMultiOutput(nn.Module):
    def __init__(self):
        super(BertMultiOutput, self).__init__()
        self.bert = BertModel.from_pretrained('bert-base-uncased')
        self.price_head = nn.Linear(self.bert.config.hidden_size, 1)
        self.ordered_head = nn.Linear(self.bert.config.hidden_size, 1)
        self.confirmed_head = nn.Linear(self.bert.config.hidden_size, 1)
        self.status_head = nn.Linear(self.bert.config.hidden_size, 1)

    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled_output = outputs.pooler_output

        price = self.price_head(pooled_output).squeeze(-1)
        ordered = self.ordered_head(pooled_output).squeeze(-1)
        confirmed = self.confirmed_head(pooled_output).squeeze(-1)
        status = torch.sigmoid(self.status_head(pooled_output)).squeeze(-1)

        return price, ordered, confirmed, status

# Initialize the model
model = BertMultiOutput()

# Step 7: Define Loss Function and Optimizer
def compute_loss(model, inputs):
    labels = inputs.pop('labels')
    price_pred, ordered_pred, confirmed_pred, status_pred = model(**inputs)

    price_loss = nn.MSELoss()(price_pred, labels[:, 0])
    ordered_loss = nn.MSELoss()(ordered_pred, labels[:, 1])
    confirmed_loss = nn.MSELoss()(confirmed_pred, labels[:, 2])
    status_loss = nn.BCELoss()(status_pred, labels[:, 3])

    total_loss = price_loss + ordered_loss + confirmed_loss + status_loss
    return total_loss

# Step 8: Training Arguments
training_args = TrainingArguments(
    output_dir='./results',
    num_train_epochs=32,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    evaluation_strategy="epoch",
    save_total_limit=5,
    load_best_model_at_end=True,
    logging_dir='./logs',
    logging_steps=10,
    learning_rate=2e-5,
    weight_decay=0.01
)

# Step 9: Initialize Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    compute_loss=compute_loss
)

# Step 10: Train the Model
trainer.train()

# Step 11: Save the Model
model.save_pretrained('./multi_output_model')
tokenizer.save_pretrained('./multi_output_model')

print("Model and tokenizer saved successfully.")

# Step 12: Inference Function
def predict_values(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
    price_pred, ordered_pred, confirmed_pred, status_pred = model(**inputs)

    status = "Filled" if status_pred.item() > 0.5 else "Out of stock"
    return {
        "Predicted Price": round(price_pred.item(), 2),
        "Predicted Ordered": round(ordered_pred.item()),
        "Predicted Confirmed": round(confirmed_pred.item()),
        "Predicted Status": status
    }

# Example Inference
sample_text = "Heinz Yellow Mustard 16oz"
predicted_values = predict_values(sample_text)
print(f"Predicted Values: {predicted_values}")

