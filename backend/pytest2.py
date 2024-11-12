from paddleocr import PaddleOCR

# Initialize PaddleOCR
ocr = PaddleOCR(use_angle_cls=True, lang='en')

def extract_text(image_path):
    # Perform OCR
    result = ocr.ocr(image_path, cls=True)

    # Extract text lines
    text_lines = []
    for line in result:
        for word in line:
            text_lines.append(word[1][0])

    extracted_text = "\n".join(text_lines)
    return extracted_text

# Example usage
extracted_text = extract_text(preprocessed_image_path)
print("Extracted Text:", extracted_text)
