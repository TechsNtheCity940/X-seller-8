import easyocr
import sys
import os

# Force UTF-8 encoding
os.environ["PYTHONIOENCODING"] = "utf-8"

def extract_text(image_path):
    reader = easyocr.Reader(['en'], gpu=True)  # Set gpu=True if you have a compatible GPU
    result = reader.readtext(image_path)
    extracted_text = "\n".join([text[1] for text in result])
    print(extracted_text)

if __name__ == "__main__":
    image_path = sys.argv[1]
    extract_text(image_path)