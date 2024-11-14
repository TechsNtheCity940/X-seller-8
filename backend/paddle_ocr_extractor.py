# paddle_ocr_extractor.py
from paddleocr import PaddleOCR
import sys

def extract_text(image_path):
    ocr = PaddleOCR(use_angle_cls=True, lang='en')  # Specify the language
    result = ocr.ocr(image_path)
    extracted_text = "\n".join([line[1][0] for line in result[0]])
    print(extracted_text)

if __name__ == "__main__":
    image_path = r"F:\repogit\X-seller-8\frontend\public\testfiles\BEK.png"
    extract_text(image_path)
