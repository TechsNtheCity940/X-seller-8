 # 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

import requests

API_URL = "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest"
headers = {"Authorization": "Bearer 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"}
payload = {
    "inputs": "Today is a great day",
}

response = requests.post(API_URL, headers=headers, json=payload)
response.json()