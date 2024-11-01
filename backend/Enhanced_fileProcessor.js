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

// Function to detect headers and process following data
const extractHeadersAndData = (text) => {
  const lines = text.split('\n');
  const headersPattern = /^[A-Z\s]+$/;
  let headers = [];
  let dataRows = [];
  let isHeaderRow = false;

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (headersPattern.test(trimmedLine)) {
      headers = trimmedLine.split(/\s+/);
      isHeaderRow = true;
      return;
    }

    if (isHeaderRow) {
      const rowData = trimmedLine.split(/\s+/);
      if (rowData.length === headers.length) {
        const dataObject = {};
        headers.forEach((header, index) => {
          dataObject[header] = rowData[index];
        });
        dataRows.push(dataObject);
      }
    }
  });

  return dataRows;
};

// Convert extracted JSON to dictionary structure
const convertJsonToDictionary = (inputFile, outputFile) => {
  if (!fs.existsSync(inputFile)) {
    logger.warn(`Input file ${inputFile} not found. Skipping dictionary creation.`);
    return;
  }

  const rawData = fs.readFileSync(inputFile, 'utf-8');
  const data = JSON.parse(rawData);
  const availableProducts = {};
  let itemCounter = 1000;

  data.forEach(item => {
    const uniqueId = itemCounter++;
    const itemEntry = {
      "ITEM#": item["ITEM#"] || uniqueId,
      "ITEM NAME": item["ITEM NAME"],
      "BRAND": item["BRAND"],
      "PACKSIZE": item["PACKSIZE"],
      "PRICE": parseFloat(item["PRICE"]),
      "ORDERED": parseInt(item["ORDERED"]),
      "CONFIRMED": parseInt(item["CONFIRMED"]),
      "STATUS": item["STATUS"]
    };
    availableProducts[uniqueId] = itemEntry;
  });

  fs.writeFileSync(outputFile, JSON.stringify(availableProducts, null, 2), 'utf-8');
  logger.info(`Final dictionary data saved to ${outputFile}`);
};

// Main process function
const processExtractedFile = (inputFile, intermediateFile) => {
  if (!fs.existsSync(inputFile)) {
    logger.warn(`Raw text file ${inputFile} not found. Unable to proceed with extraction.`);
    return;
  }

  const rawData = fs.readFileSync(inputFile, 'utf-8');
  const parsedData = extractHeadersAndData(rawData);
  fs.writeFileSync(intermediateFile, JSON.stringify(parsedData, null, 2), 'utf-8');
  logger.info(`Processed data with headers saved to ${intermediateFile}`);
};

// Paths
const inputPath = 'F:/repogit/X-seLLer-8/backend/uploads/StructuredTableData.txt';
const intermediatePath = 'F:/repogit/X-seLLer-8/backend/uploads/StructuredData.json';
const outputPath = 'F:/repogit/X-seLLer-8/frontend/public/outputs/InventoryList.json';

// Final dictionary creation process
const createFinalInventoryList = () => {
  processExtractedFile(inputPath, intermediatePath); // Step 1: Extract headers and save structured data
  convertJsonToDictionary(intermediatePath, outputPath); // Step 2: Convert to dictionary format and save final file
};

// Example usage
createFinalInventoryList();
