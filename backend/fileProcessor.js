const fs = require('fs-extra');
const path = require('path');
const pdfParse = require('pdf-parse');
const tesseract = require('tesseract.js');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const docxParser = require('docx-parser');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const winston = require('winston');

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

// Extract text from images with Tesseract
const extractImageText = async (imageFilePath) => {
  try {
    logger.info(`Starting OCR for image file: ${imageFilePath}`);
    const { data: { text: ocrText } } = await tesseract.recognize(imageFilePath, 'eng');
    logger.info(`Extracted Text from Image (${imageFilePath}): ${ocrText.slice(0, 500)}...`);
    return ocrText;
  } catch (error) {
    logger.warn(`Skipping file ${imageFilePath} due to OCR error: ${error.message}`);
    return null;
  }
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

// Determine file type and extract text
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
        return await extractImageText(filePath);
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

// Process files and save as .txt
const processFiles = async (inputFolder, outputFile) => {
  logger.info(`Starting file processing in folder: ${inputFolder}`);
  let extractedContent = [];
  const files = await fs.readdir(inputFolder);

  for (const file of files) {
    const filePath = path.join(inputFolder, file);
    try {
      const fileData = await determineFileTypeAndExtract(filePath);
      if (fileData && fileData.trim()) {
        extractedContent.push(fileData);
        logger.info(`File ${file} successfully processed.`);
      }
    } catch (error) {
      logger.error(`Failed to process file ${filePath}: ${error.message}`);
    }
  }

  // Combine text data for output
  const outputText = extractedContent.join('\n');
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
