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

// Setup Winston logger to log everything
const logger = winston.createLogger({
  level: 'debug, info, warn, error',// Capture all log levels: debug, info, warn, error
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`),
    winston.format.File({ filename: path.join(__dirname, 'logs', 'app.log') })
  ),
  transports: [
    winston.transports.Console(), // Log to console
    winston.transports.File({ filename: path.join(__dirname, 'logs', 'app.log') }) // Log to app.log file
  ]
});

const logRowData = (header, row) => {
  logger.info(`Extracted Data Row: ${JSON.stringify({ header, row })}`);
};

const possibleHeaders = [
  /BRAND|PACKISIZE|PRICE|ORDERED|CONFIRMED|STATUS/i,
  /Brand|Bin|Size|Totals|Unit Cost|Ext Value/i
];

const parseTextRows = (text) => {
  const lines = text.split('\n');
  let currentHeader = [];
  let jsonData = [];

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
      jsonData.push(rowObject);
      logRowData(currentHeader, rowData);
    }
  });

  return jsonData;
};

// PDF extraction with error handling
const extractPdfText = async (pdfFilePath) => {
  try {
    logger.info(`Starting PDF extraction for file: ${pdfFilePath}`);
    const dataBuffer = await readFileAsync(pdfFilePath);
    const data = await pdfParse(dataBuffer);
    const cleanedText = data.text.replace(/[^\w\s]/g, '');
    logger.debug(`Extracted Text from PDF: ${cleanedText.slice(0, 100)}...`);
    return parseTextRows(cleanedText);
  } catch (error) {
    logger.error(`Failed to extract PDF text from ${pdfFilePath}: ${error.message}`);
    return null; // Skip file and continue
  }
};

// Image extraction with Tesseract and error handling
const extractImageText = async (imageFilePath) => {
  try {
    logger.info(`Starting OCR for image file: ${imageFilePath}`);
    const { data: { text } } = await tesseract.recognize(imageFilePath, 'eng');
    logger.debug(`Extracted Text from Image: ${text.slice(0, 100)}...`);
    return text;
  } catch (error) {
    logger.error(`Failed to extract image text with Tesseract from ${imageFilePath}: ${error.message}`);
    return null; // Skip file and continue
  }
};

// Function to extract text from.docx files
const extractDocxText = async (docxFilePath) => {
  return new Promise((resolve, reject) => {
    docxParser.parseDocx(docxFilePath, (error, data) => {
      if (error) reject(error);
      resolve(data);
    });
  });
};

// Function to extract text from Excel files (.xlsx,.xls)
const extractExcelText = (excelFilePath) => {
  const workbook = XLSX.readFile(excelFilePath);
  let text = '';
  workbook.SheetNames.forEach(sheetName => {
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    sheet.forEach(row => {
      text += row.join(' ') + '\n';
    });
  });
  return text;
};

// Function to extract text from.txt files
const extractTxtText = (txtFilePath) => {
  return fs.readFileSync(txtFilePath, 'utf-8');
};

// Function to extract text from CSV files
const extractCsvText = (csvFilePath) => {
  return new Promise((resolve, reject) => {
    let text = '';
    fs.createReadStream(csvFilePath)
     .pipe(csv())
     .on('data', (row) => {
        text += Object.values(row).join(' ') + '\n';
      })
     .on('end', () => {
        resolve(text);
      })
     .on('error', (error) => {
        reject(error);
      });
  });
};

// Function to extract text from JSON files
const extractJsonText = (jsonFilePath) => {
  const jsonData = fs.readFileSync(jsonFilePath, 'utf-8');
  return JSON.stringify(JSON.parse(jsonData), null, 2);
};

// Determine file type and process accordingly
const determineFileTypeAndExtract = async (filePath) => {
  const buffer = await readFileAsync(filePath);
  const { fileTypeFromBuffer } = await import('file-type');
  const type = await fileTypeFromBuffer(buffer);

  if (!type) {
    console.log(`Could not determine the file type of ${filePath}. Skipping.`);
    return null;
  }

  let extractedData;
    switch (type.mime) {
    case 'application/pdf':
    extractedData = await extractPdfText(filePath);
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
    case 'application/json':
      return extractJsonText(filePath);
    case 'text/plain':
      return extractTxtText(filePath);
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      return extractExcelText(filePath);
      default:
        console.log(`Unsupported file type for ${filePath}: ${type.mime}. Skipping.`);
        return null;
    }
  };
  
  const processFiles = async (inputFolder, outputFile) => {
    let allJsonData = [];
    const files = await fs.readdir(inputFolder);
  
    for (const file of files) {
      const filePath = path.join(inputFolder, file);
      try {
        const fileData = await determineFileTypeAndExtract(filePath);
        if (fileData) {
          allJsonData = allJsonData.concat(fileData);
        }
      } catch (error) {
        console.error(`Failed to process ${filePath}: ${error.message}`);
      }
    }
  
    await fs.writeFile(outputFile, JSON.stringify(allJsonData, null, 2), 'utf-8');
    console.log(`JSON data saved to ${outputFile}`);
  };
  
  // Example usage
  const inputFolder = 'F:/repogit/X-seLLer-8/frontend/public/uploads';
  const outputFile = 'F:/repogit/X-seLLer-8/frontend/public/testfiles/testsextracted.json';
  
  processFiles(inputFolder, outputFile).then(() => {
    console.log('Processing complete.');
  }).catch((error) => {
    console.error('Error during processing:', error);
  });