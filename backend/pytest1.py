import cv2
import numpy as np
import easyocr
from PIL import Image
import pandas as pd
import json
from transformers import LayoutLMv3Processor, LayoutLMv3ForTokenClassification
import torch
import spacy
from paddleocr import PaddleOCR
import os

# Initialize PaddleOCR
ocr = PaddleOCR(use_angle_cls=True, lang='en')

# Initialize EasyOCR reader
reader = easyocr.Reader(['en'])

# Load the processor and model with apply_ocr set to False
processor = LayoutLMv3Processor.from_pretrained("microsoft/layoutlmv3-base", apply_ocr=True)
model = LayoutLMv3ForTokenClassification.from_pretrained("microsoft/layoutlmv3-base")

# Initialize spaCy for NER
nlp = spacy.load("en_core_web_sm")

def resize_image(image_path):
    try:
        image = Image.open(image_path)
        max_size = (2000, 2000)
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        resized_image_path = "resized_image.png"
        image.save(resized_image_path)
        return resized_image_path
    except Exception as e:
        print(f"Error resizing image: {e}")
        return image_path

def preprocess_image(image_path):
    image = cv2.imread(image_path)
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_image = clahe.apply(gray_image)
    adaptive_thresh = cv2.adaptiveThreshold(
        enhanced_image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, blockSize=11, C=2
    )
    blurred = cv2.GaussianBlur(adaptive_thresh, (3, 3), 0)
    edges = cv2.Canny(blurred, 50, 150)
    combined = cv2.bitwise_or(adaptive_thresh, edges)
    rgb_image = cv2.cvtColor(combined, cv2.COLOR_GRAY2RGB)
    preprocessed_path = "F:/repogit/X-seller-8/backend/uploads/BEK_rgb.png"
    cv2.imwrite(preprocessed_path, rgb_image)
    return preprocessed_path

def full_pipeline(image_path):
    try:
        image = Image.open(image_path).convert("RGB")
        ocr_results = ocr.ocr(image_path)
        if not ocr_results:
            print(f"Error: No OCR results found for {image_path}")
            return None

        raw_text = " ".join([result[1][0] for line in ocr_results for result in line])
        encoding = processor(text=raw_text, images=image, truncation=True, max_length=512, return_tensors="pt")
        outputs = model(**encoding)
        return raw_text

    except Exception as e:
        print(f"Error during processing of {image_path}: {e}")
        return None

def extract_entities(text):
    doc = nlp(text)
    entities = {ent.label_: ent.text for ent in doc.ents}
    return entities

def structure_data(entities):
    data = {
        "Item": entities.get("ITEM", ""),
        "Price": entities.get("MONEY", ""),
        "Ordered": entities.get("DATE", ""),
        "Delivered": entities.get("AMOUNT", "")
    }
    df = pd.DataFrame([data])
    return df

def save_data(dataframe, json_data, raw_text):
    # Save as CSV
    dataframe.to_csv("structured_data.csv", index=False)
    print("Data saved to structured_data.csv.")

    # Save as JSON
    with open("structured_data.json", "w") as json_file:
        json.dump(json_data, json_file, indent=4)
    print("Data saved to structured_data.json.")

    # Save as TXT
    with open("structured_data.txt", "w") as txt_file:
        txt_file.write(raw_text)
    print("Data saved to structured_data.txt.")

def process_folder(folder_path):
    all_data = []
    all_json_data = []
    all_raw_text = []

    for filename in os.listdir(folder_path):
        if filename.lower().endswith((".png", ".jpg", ".jpeg", ".tiff", ".bmp")):
            image_path = os.path.join(folder_path, filename)
            print(f"Processing image: {image_path}")
            try:
                raw_text = full_pipeline(image_path)
                if raw_text:
                    entities = extract_entities(raw_text)
                    structured_df = structure_data(entities)
                    all_data.append(structured_df)
                    all_json_data.append(entities)
                    all_raw_text.append(raw_text)
            except Exception as e:
                print(f"Error processing {image_path}: {e}")

    if all_data:
        combined_df = pd.concat(all_data, ignore_index=True)
        combined_raw_text = "\n\n".join(all_raw_text)
        save_data(combined_df, all_json_data, combined_raw_text)
    else:
        print("No valid results to save.")

# Example usage
folder_path = "F:/repogit/X-seller-8/frontend/public/uploads"
process_folder(folder_path)

