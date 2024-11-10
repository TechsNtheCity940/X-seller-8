import pandas as pd
from transformers import BertTokenizer, BertForSequenceClassification, Trainer, TrainingArguments
import torch
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# Load dataset
df = pd.read_csv('item_matching_data.csv')
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')

# Encode labels
label_encoder = LabelEncoder()
df['correct_name'] = label_encoder.fit_transform(df['correct_name'])

# Prepare data
train_texts, val_texts, train_labels, val_labels = train_test_split(
    df['input_name'].tolist(),
    df['correct_name'].tolist(),
    test_size=0.2,
    random_state=42
)

# Tokenize data
train_encodings = tokenizer(train_texts, truncation=True, padding=True, max_length=128)
val_encodings = tokenizer(val_texts, truncation=True, padding=True, max_length=128)

class InventoryDataset(torch.utils.data.Dataset):
    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels

    def __getitem__(self, idx):
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item['labels'] = torch.tensor(self.labels[idx])
        return item

    def __len__(self):
        return len(self.labels)

train_dataset = InventoryDataset(train_encodings, train_labels)
val_dataset = InventoryDataset(val_encodings, val_labels)

# Load model
model = BertForSequenceClassification.from_pretrained('bert-base-uncased', num_labels=len(label_encoder.classes_))

# Define Trainer
training_args = TrainingArguments(
    output_dir='./results',
    num_train_epochs=10,
    per_device_train_batch_size=16,
    evaluation_strategy="epoch",
    save_total_limit=2,
    load_best_model_at_end=True,
    logging_dir='./logs',
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
)

# Train model
trainer.train()

# Save the fine-tuned model
model.save_pretrained('./fine_tuned_model')
tokenizer.save_pretrained('./fine_tuned_model')
