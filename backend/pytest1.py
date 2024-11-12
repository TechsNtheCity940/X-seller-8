import cv2
import numpy as np
import easyocr
from PIL import Image
import pandas as pd
from transformers import LayoutLMv3Processor, LayoutLMv3ForTokenClassification
import torch
import spacy

# Initialize EasyOCR reader
reader = easyocr.Reader(['en'])

# Load the processor and model with apply_ocr set to False
processor = LayoutLMv3Processor.from_pretrained("microsoft/layoutlmv3-base", apply_ocr=False)
model = LayoutLMv3ForTokenClassification.from_pretrained("microsoft/layoutlmv3-base")

# Initialize spaCy for NER
nlp = spacy.load("en_core_web_sm")

# Step 1: Image Preprocessing
def preprocess_image(image_path):
    # Load the image in grayscale
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

    # Denoising
    image = cv2.fastNlMeansDenoising(image, h=30)

    # Binarization
    _, binary_image = cv2.threshold(image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Skew Correction
    coords = np.column_stack(np.where(binary_image > 0))
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    # Rotate image to correct skew
    (h, w) = binary_image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    corrected_image = cv2.warpAffine(binary_image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    # Convert to RGB format
    rgb_image = cv2.cvtColor(corrected_image, cv2.COLOR_GRAY2RGB)

    # Save the preprocessed image
    preprocessed_path = "F:/repogit/X-seller-8/backend/uploads/BEK_rgb.png"
    cv2.imwrite(preprocessed_path, rgb_image)

    return preprocessed_path

# Step 2: Text Extraction with EasyOCR
def extract_text(image_path):
    results = reader.readtext(image_path)
    text_lines = [text for _, text, _ in results]
    extracted_text = "\n".join(text_lines)
    return extracted_text, results

# Step 3: Extract Words and Bounding Boxes
def extract_words_and_boxes(ocr_results):
    words = []
    boxes = []

    for item in ocr_results:
        bbox, word, confidence = item
        if not word.strip():
            continue

        xmin = int(min([point[0] for point in bbox]))
        ymin = int(min([point[1] for point in bbox]))
        xmax = int(max([point[0] for point in bbox]))
        ymax = int(max([point[1] for point in bbox]))

        words.append(word)
        boxes.append([xmin, ymin, xmax, ymax])

    if not words or not boxes:
        raise ValueError("No valid words or bounding boxes extracted from OCR results.")

    return words, boxes

# Step 4: Layout Analysis with LayoutLMv3
def layout_analysis(image_path):
    image = Image.open(image_path)
    ocr_text, ocr_results = extract_text(image_path)
    words, boxes = extract_words_and_boxes(ocr_results)

    encoding = processor(images=image, words=words, boxes=boxes, truncation=True, max_length=512, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**encoding)

    return outputs

# Step 5: Named Entity Recognition with spaCy
def extract_entities(text):
    doc = nlp(text)
    entities = {ent.label_: ent.text for ent in doc.ents}
    return entities

# Step 6: Structure Data into DataFrame
def structure_data(entities):
    data = {
        "Item": entities.get("ITEM", ""),
        "Price": entities.get("MONEY", ""),
        "Ordered": entities.get("DATE", ""),
        "Delivered": entities.get("DATE", "")
    }
    df = pd.DataFrame([data])
    return df

# Full Pipeline
def full_pipeline(image_path):
    preprocessed_path = preprocess_image(image_path)
    extracted_text, _ = extract_text(preprocessed_path)
    layout_blocks = layout_analysis(preprocessed_path)
    entities = extract_entities(extracted_text)
    structured_data = structure_data(entities)
    return structured_data

# Process a Folder of Images
import os

def process_folder(folder_path):
    all_results = []
    for filename in os.listdir(folder_path):
        if filename.lower().endswith((".png", ".jpg", ".jpeg", ".tiff", ".bmp")):
            image_path = os.path.join(folder_path, filename)
            print(f"Processing image: {image_path}")
            try:
                result = full_pipeline(image_path)
                all_results.append(result)
            except Exception as e:
                print(f"Error processing {image_path}: {e}")

    if all_results:
        combined_df = pd.concat(all_results, ignore_index=True)
        combined_df.to_csv("structured_data.csv", index=False)
        print("Data saved to structured_data.csv.")
    else:
        print("No valid results to save.")

# Example usage
folder_path = "F:/repogit/X-seller-8/frontend/public/uploads"
process_folder(folder_path)
