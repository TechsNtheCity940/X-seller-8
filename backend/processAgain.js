const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const winston = require('winston');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

// Setup Winston logger
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(__dirname, 'logs', 'app.log') })
  ]
});

// Function to call EasyOCR Python script
const extractImageTextWithEasyOCR = async (imageFilePath) => {
  return new Promise((resolve, reject) => {
    const script = spawn('python', ['easy_ocr_extractor.py', imageFilePath]);
    let ocrText = '';

    script.stdout.on('data', (data) => {
      ocrText += data.toString();
    });

    script.stderr.on('data', (data) => {
      logger.error(`EasyOCR Error: ${data.toString()}`);
    });

    script.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`EasyOCR exited with code ${code}`));
      } else {
        resolve(ocrText);
      }
    });
  });
};

// Function to call PaddleOCR Python script
const extractImageTextWithPaddleOCR = async (imageFilePath) => {
  return new Promise((resolve, reject) => {
    const script = spawn('python', ['paddle_ocr_extractor.py', imageFilePath]);
    let ocrText = '';

    script.stdout.on('data', (data) => {
      ocrText += data.toString();
    });

    script.stderr.on('data', (data) => {
      logger.error(`PaddleOCR Error: ${data.toString()}`);
    });

    script.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`PaddleOCR exited with code ${code}`));
      } else {
        resolve(ocrText);
      }
    });
  });
};
const determineFileTypeAndExtract = async (filePath) => {
  try {
    const buffer = await readFileAsync(filePath);
    const { fileTypeFromBuffer } = await import('file-type');
    const type = await fileTypeFromBuffer(buffer);

    if (!type) {
      logger.warn(`Could not determine file type for ${filePath}. Skipping.`);
      return null;
    }

    logger.info(`Processing file type ${type.mime} for ${filePath}`);

    switch (type.mime) {
      case 'application/pdf':
        return await extractPdfText(filePath);
      case 'image/jpeg':
      case 'image/png':
      case 'image/bmp':
      case 'image/gif':
      case 'image/tiff':
        // Use EasyOCR for advanced image text extraction
        const easyOcrText = await extractImageTextWithEasyOCR(filePath);
        if (easyOcrText.trim()) return easyOcrText;

        // Fallback to PaddleOCR if EasyOCR fails or returns empty text
        const paddleOcrText = await extractImageTextWithPaddleOCR(filePath);
        return paddleOcrText;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await extractDocxText(filePath);
      case 'text/csv':
        return await extractCsvText(filePath);
      case 'text/plain':
        return extractTxtText(filePath);
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
        return extractExcelText(filePath);
      default:
        logger.warn(`Unsupported file type for ${filePath}: ${type.mime}. Skipping.`);
        return null;
    }
  } catch (error) {
    logger.error(`Error processing ${filePath}: ${error.message}`);
    return null;
  }
};
