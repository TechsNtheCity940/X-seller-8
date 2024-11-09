const fs = require('fs-extra');
const path = require('path');
const pdfParse = require('pdf-parse');
const tesseract = require('tesseract.js');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const docxParser = require('docx-parser');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const { spawn } = require('child_process');
const winston = require('winston');

// Setup Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
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

const logRowData = (header, row) => {
  logger.info(`Extracted Data Row: ${JSON.stringify({ header, row })}`);
};

const possibleHeaders = [
  /BRAND|PACKISIZE|PRICE|ORDERED|CONFIRMED|STATUS/i,
  /Brand|Bin|Size|Totals|Unit Cost|Ext Value/i
];

// Parse text rows based on headers
const parseTextRows = (rawText) => {
  const lines = rawText.split('\n');
  let currentHeader = [];
  let parsedText = [];

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (possibleHeaders.some(headerRegex => headerRegex.test(trimmedLine))) {
      currentHeader = trimmedLine.split(/\s+/);
      logger.info(`Detected Header Row: ${currentHeader.join(', ')}`);
    } else if (currentHeader.length) {
      const rowData = trimmedLine.split(/\s+/);
      const rowObject = {};
      currentHeader.forEach((key, index) => {
        rowObject[key.toLowerCase().replace(/[^a-z0-9_]/gi, '_')] = rowData[index] || '';
      });
      parsedText.push(rowObject);
      logRowData(currentHeader, rowData);
    }
  });
  return parsedText;
};

// Extract text from PDF files
const extractPdfText = async (pdfFilePath) => {
  try {
    logger.info(`Starting PDF extraction for file: ${pdfFilePath}`);
    const dataBuffer = await readFileAsync(pdfFilePath);
    const data = await pdfParse(dataBuffer);
    const cleanedText = data.text.replace(/[^\w\s]/g, '');
    logger.info(`Extracted Text from PDF (${pdfFilePath}): ${cleanedText.slice(0, 500)}...`);
    return parseTextRows(cleanedText);
  } catch (error) {
    logger.warn(`Skipping file ${pdfFilePath} due to PDF parsing error: ${error.message}`);
    return null;
  }
};

process.env.PYTHONIOENCODING = 'utf-8';

const extractImageText = async (imageFilePath) => {
  let combinedText = '';

  // 1. Run Tesseract OCR
  try {
    logger.info(`Running Tesseract OCR for image: ${imageFilePath}`);
    const { data: { text: tesseractText } } = await tesseract.recognize(imageFilePath, 'eng');
    logger.info(`Tesseract OCR extracted text: ${tesseractText.slice(0, 500)}...`);
    combinedText += `\n[Tesseract OCR]\n${tesseractText.trim()}`;
  } catch (error) {
    logger.warn(`Tesseract OCR failed for ${imageFilePath}: ${error.message}`);
  }

  // 2. Run EasyOCR
  try {
    logger.info(`Running EasyOCR for image: ${imageFilePath}`);
    const easyOcrText = await extractImageTextWithEasyOCR(imageFilePath);
    logger.info(`EasyOCR extracted text: ${easyOcrText.slice(0, 500)}...`);
    combinedText += `\n[EasyOCR]\n${easyOcrText.trim()}`;
  } catch (error) {
    logger.warn(`EasyOCR failed for ${imageFilePath}: ${error.message}`);
  }

  // 3. Run PaddleOCR
  try {
    logger.info(`Running PaddleOCR for image: ${imageFilePath}`);
    const paddleOcrText = await extractImageTextWithPaddleOCR(imageFilePath);
    logger.info(`PaddleOCR extracted text: ${paddleOcrText.slice(0, 500)}...`);
    combinedText += `\n[PaddleOCR]\n${paddleOcrText.trim()}`;
  } catch (error) {
    logger.warn(`PaddleOCR failed for ${imageFilePath}: ${error.message}`);
  }

  return combinedText.trim();
};

// Extract text from Excel files
const extractExcelText = (excelFilePath) => {
  try {
    logger.info(`Starting extraction on Excel file: ${excelFilePath}`);
    const workbook = XLSX.readFile(excelFilePath);
    let excelText = '';

    workbook.SheetNames.forEach(sheetName => {
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
      sheet.forEach((row, rowIndex) => {
        const formattedRow = row.join(' ');
        excelText += `Row ${rowIndex + 1}: ${formattedRow}\n`;
      });
    });

    logger.info(`Extracted Text from Excel (${excelFilePath}): ${excelText.slice(0, 500)}...`);
    return excelText;
  } catch (error) {
    logger.warn(`Skipping file ${excelFilePath} due to error: ${error.message}`);
    return null;
  }
};

// Extract text from DOCX files
const extractDocxText = async (docxFilePath) => {
  try {
    logger.info(`Starting DOCX extraction for file: ${docxFilePath}`);
    const text = await promisify(docxParser.parseDocx)(docxFilePath);
    logger.info(`Extracted Text from DOCX (${docxFilePath}): ${text.slice(0, 500)}...`);
    return text;
  } catch (error) {
    logger.warn(`Skipping file ${docxFilePath} due to DOCX parsing error: ${error.message}`);
    return null;
  }
};

// Extract text from CSV files
const extractCsvText = (csvFilePath) => {
  return new Promise((resolve, reject) => {
    logger.info(`Starting CSV extraction for file: ${csvFilePath}`);
    let csvText = '';
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        csvText += Object.values(row).join(' ') + '\n';
      })
      .on('end', () => {
        logger.info(`Extracted Text from CSV (${csvFilePath}): ${csvText.slice(0, 500)}...`);
        resolve(csvText);
      })
      .on('error', (error) => {
        logger.warn(`Skipping file ${csvFilePath} due to CSV parsing error: ${error.message}`);
        reject(error);
      });
  });
};

// Extract text from TXT files
const extractTxtText = async (txtFilePath) => {
  try {
    logger.info(`Starting TXT extraction for file: ${txtFilePath}`);
    const text = await readFileAsync(txtFilePath, 'utf-8');
    logger.info(`Extracted Text from TXT (${txtFilePath}): ${text.slice(0, 500)}...`);
    return text;
  } catch (error) {
    logger.warn(`Skipping file ${txtFilePath} due to TXT reading error: ${error.message}`);
    return null;
  }
};

const determineFileTypeAndExtract = async (filePath, existingText = '') => {
  try {
    const buffer = await readFileAsync(filePath);
    const { fileTypeFromBuffer } = await import('file-type');
    const type = await fileTypeFromBuffer(buffer);

    if (!type) {
      logger.warn(`Could not determine file type for ${filePath}. Skipping.`);
      return existingText;
    }

    logger.info(`Processing file type ${type.mime} for ${filePath}`);
    let extractedText = '';

    switch (type.mime) {
      case 'application/pdf':
        extractedText = await extractPdfText(filePath);
        break;
      case 'image/jpeg':
      case 'image/png':
      case 'image/bmp':
      case 'image/gif':
      case 'image/tiff':
        const tesseractText = await extractImageText(filePath);
        const easyOcrText = await extractImageTextWithEasyOCR(filePath);
        const paddleOcrText = await extractImageTextWithPaddleOCR(filePath);
          // Combine the results from all three OCR engines
        extractedText = `${tesseractText}\n[EasyOCR]\n${easyOcrText}\n[PaddleOCR]\n${paddleOcrText}`;
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        extractedText = await extractDocxText(filePath);
        break;
      case 'text/csv':
        extractedText = await extractCsvText(filePath);
        break;
      case 'text/plain':
        extractedText = await extractTxtText(filePath);
        break;
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
        extractedText = await extractExcelText(filePath);
        break;
      default:
        logger.warn(`Unsupported file type for ${filePath}: ${type.mime}. Skipping.`);
        return existingText;
    }

    // Combine the newly extracted text with the existing text
    return `${existingText}\n${extractedText}`.trim();
  } catch (error) {
    logger.error(`Error processing ${filePath}: ${error.message}`);
    return existingText;
  }
};

const processFiles = async (inputFolder, outputFile) => {
  logger.info(`Starting file processing in folder: ${inputFolder}`);
  let extractedContent = [];
  const files = await fs.readdir(inputFolder);

  // Read existing content from the output file (if it exists)
  let existingText = '';
  if (fs.existsSync(outputFile)) {
    existingText = await readFileAsync(outputFile, 'utf-8');
    logger.info(`Loaded existing extracted text from ${outputFile}`);
  }

  // Process each file and append new extracted text
  for (const file of files) {
    const filePath = path.join(inputFolder, file);
    try {
      const fileData = await determineFileTypeAndExtract(filePath, existingText);
      if (fileData && fileData.trim()) {
        extractedContent.push(fileData);
        logger.info(`File ${file} successfully processed.`);
      }
    } catch (error) {
      logger.error(`Failed to process file ${filePath}: ${error.message}`);
    }
  }

  // Combine the new extracted content with the existing text
  const outputText = extractedContent.join('\n').trim();
  await fs.writeFile(outputFile, outputText, 'utf-8');
  logger.info(`Data written to ${outputFile}`);
};


// Example usage
const inputFolder = 'F:/repogit/X-seLLer-8/frontend/public/uploads';
const outputFile = 'F:/repogit/X-seLLer-8/backend/uploads/RawTextExtract.txt';

processFiles(inputFolder, outputFile).then(() => {
  logger.info('Processing complete.');
}).catch((error) => {
  logger.error(`Unexpected error during file processing: ${error.message}`);
});
