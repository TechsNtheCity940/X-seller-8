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

// Setup Winston logger with app.log
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(__dirname, 'logs', 'app.log') })
  ]
});

// Function to log structured row data
const logRowData = (header, row) => {
  logger.info(`Header: ${header.join(', ')} | Row Data: ${row.join(', ')}`);
};

// Pattern to identify possible headers
const possibleHeaders = [
  /BRAND|PACKISIZE|PRICE|ORDERED|CONFIRMED|STATUS/i,
  /Brand|Bin|Size|Totals|Unit Cost|Ext Value/i
];

// Function to detect and parse rows of data based on headers
const parseTextRows = (text) => {
  const lines = text.split('\n');
  let currentHeader = [];
  let structuredData = [];
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (possibleHeaders.some(headerRegex => headerRegex.test(trimmedLine))) {
      // Identify new header row
      currentHeader = trimmedLine.split(/\s+/);
      logger.info(`Detected header: ${currentHeader.join(', ')}`);
    } else if (currentHeader.length) {
      // Parse row of data under current header
      const rowData = trimmedLine.split(/\s+/);
      structuredData.push({ header: currentHeader, row: rowData });
      logRowData(currentHeader, rowData); // Log each row with the current header
    }
  });
  return structuredData;
};

// Example of parsing in one extraction function
const extractPdfText = async (pdfFilePath) => {
  const dataBuffer = await readFileAsync(pdfFilePath);
  const data = await pdfParse(dataBuffer);
  const cleanedText = data.text.replace(/[^\w\s]/g, '');
  return parseTextRows(cleanedText); // Process each text row based on headers and log
};

// Function to dynamically import file-type module
const getFileType = async (buffer) => {
  const { fileTypeFromBuffer } = await import('file-type');
  return fileTypeFromBuffer(buffer);
};

// Function to extract text from PDF files
//const extractPdfText = async (pdfFilePath) => {
//  const dataBuffer = await readFileAsync(pdfFilePath);
//  const data = await pdfParse(dataBuffer);
//  return data.text;
//};

// Function to extract text from images using Tesseract OCR
const extractImageText = async (imageFilePath) => {
  try {
    const { data: { text } } = await tesseract.recognize(imageFilePath, 'eng');
    return text;
  } catch (error) {
    throw new Error(`Error processing image with Tesseract: ${error.message}`);
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
  const type = await getFileType(buffer);

  if (!type) {
    console.log(`Could not determine the file type of ${filePath}. Skipping.`);
    return null;
  }

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

// Main function to process files
const processFiles = async (inputFolder, outputFile) => {
  let allText = '';
  const files = await fs.readdir(inputFolder);

  for (const file of files) {
    const filePath = path.join(inputFolder, file);
    
    try {
      const text = await determineFileTypeAndExtract(filePath);
      if (text) {
        // Clean up text and append to allText
        const cleanedText = text.replace(/[^\w\s]/g, '');
        allText += cleanedText + '\n';
      }
    } catch (error) {
      console.error(`Failed to process ${filePath}: ${error.message}`);
    }
  }

  // Save extracted text to the specified output file
  await fs.writeFile(outputFile, allText, 'utf-8');
  console.log(`Text data saved to ${outputFile}`);
};

// Example usage
const inputFolder = 'F:/repogit/X-seLLer-8/frontend/public/testfiles';
const outputFile = 'F:/repogit/X-seLLer-8/frontend/public/testfiles/testesextracted.txt';

processFiles(inputFolder, outputFile).then(() => {
  console.log('Processing complete.');
}).catch((error) => {
  console.error('Error during processing:', error);
});