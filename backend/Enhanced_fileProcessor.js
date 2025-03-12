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

// Parse text to extract product details
const extractProductDetails = (text) => {
  const products = [];
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  // Common patterns in invoices
  const productRegex = /([A-Za-z0-9\s.&'-]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/;
  const dateRegex = /([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i;
  const priceRegex = /\$([\d,]+\.\d{2})/;
  const quantityRegex = /qty:?\s*(\d+)|(\d+)\s*units/i;
  const packSizeRegex = /(\d+)\s*ml|\s+(\d+)\s*oz|\s+(\d+)ct|\s+(\d+)\s*lb/i;
  
  let currentDate = null;
  
  // Try to find a delivery date in the text
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    currentDate = dateMatch[1];
    logger.info(`Detected date: ${currentDate}`);
  }
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip header lines or irrelevant content
    if (line.match(/invoice|customer|page|total|subtotal|tax/i)) {
      continue;
    }
    
    // Try to extract product information
    const productMatch = line.match(productRegex);
    if (productMatch) {
      const product = {
        name: productMatch[1].trim(),
        quantity: parseFloat(productMatch[2]),
        price: parseFloat(productMatch[3]),
        total: parseFloat(productMatch[4]),
        date: currentDate || 'Unknown',
        category: categorizeProduct(productMatch[1].trim()),
        packSize: 'Standard'
      };
      
      // Try to extract pack size from the current line or next line
      const packSizeMatch = line.match(packSizeRegex) || 
                          (i+1 < lines.length ? lines[i+1].match(packSizeRegex) : null);
      if (packSizeMatch) {
        const packSize = packSizeMatch.find(match => match && match !== packSizeMatch[0]);
        if (packSize) {
          product.packSize = packSize + (packSizeMatch[0].includes('ml') ? 'ml' : 
                                          packSizeMatch[0].includes('oz') ? 'oz' : 
                                          packSizeMatch[0].includes('ct') ? 'ct' : 'lb');
        }
      }
      
      products.push(product);
      logger.info(`Extracted product: ${JSON.stringify(product)}`);
    }
    // Also check for alternate formats often found in invoices
    else if (line.match(/[A-Za-z]/) && line.match(/\d/) && !line.match(/invoice|page|date/i)) {
      const namePart = line.replace(/\s{2,}/g, ' ').trim();
      const priceParts = line.match(priceRegex);
      const quantityParts = line.match(quantityRegex);
      
      if (priceParts) {
        const product = {
          name: namePart.replace(priceRegex, '').replace(/\s+$/, ''),
          price: parseFloat(priceParts[1].replace(',', '')),
          quantity: quantityParts ? parseInt(quantityParts[1] || quantityParts[2]) : 1,
          date: currentDate || 'Unknown',
          category: categorizeProduct(namePart),
          packSize: 'Standard'
        };
        
        // Try to calculate total if not directly available
        product.total = product.price * product.quantity;
        
        // Try to extract pack size
        const packSizeMatch = line.match(packSizeRegex) || 
                            (i+1 < lines.length ? lines[i+1].match(packSizeRegex) : null);
        if (packSizeMatch) {
          const packSize = packSizeMatch.find(match => match && match !== packSizeMatch[0]);
          if (packSize) {
            product.packSize = packSize + (packSizeMatch[0].includes('ml') ? 'ml' : 
                                            packSizeMatch[0].includes('oz') ? 'oz' : 
                                            packSizeMatch[0].includes('ct') ? 'ct' : 'lb');
          }
        }
        
        products.push(product);
        logger.info(`Extracted product (alternate format): ${JSON.stringify(product)}`);
      }
    }
  }
  
  return products;
};

// Categorize product as food or alcohol
const categorizeProduct = (productName) => {
  const alcoholKeywords = [
    'vodka', 'gin', 'rum', 'whiskey', 'whisky', 'tequila', 'brandy', 'cognac', 
    'scotch', 'bourbon', 'wine', 'beer', 'ale', 'lager', 'stout', 'cider', 
    'champagne', 'liqueur', 'schnapps', 'vermouth', 'port', 'sherry', 'mezcal', 
    'absinthe', 'sake', 'merlot', 'cabernet', 'chardonnay', 'IPA', 'pilsner'
  ];
  
  const lowerCaseName = productName.toLowerCase();
  
  // Check if product name contains any alcohol keywords
  if (alcoholKeywords.some(keyword => lowerCaseName.includes(keyword))) {
    return 'alcohol';
  }
  
  // Default to food category
  return 'food';
};

const logRowData = (header, row) => {
  logger.info(`Extracted Data Row: ${JSON.stringify({ header, row })}`);
};

const possibleHeaders = [
  /BRAND|PACKISIZE|PRICE|ORDERED|CONFIRMED|STATUS/i,
  /Brand|Bin|Size|Totals|Unit Cost|Ext Value/i,
  /Product|Item|Description|Quantity|Price|Amount/i
];

// Parse text rows based on headers
const parseTextRows = (rawText) => {
  const lines = rawText.split('\n');
  let currentHeader = [];
  let parsedText = [];
  let currentDate = null;
  const dateRegex = /([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i;

  // Try to find a delivery date in the text
  const dateMatch = rawText.match(dateRegex);
  if (dateMatch) {
    currentDate = dateMatch[1];
    logger.info(`Detected date: ${currentDate}`);
  }

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (possibleHeaders.some(headerRegex => headerRegex.test(trimmedLine))) {
      currentHeader = trimmedLine.split(/\s+/);
      logger.info(`Detected Header Row: ${currentHeader.join(', ')}`);
    } else if (currentHeader.length) {
      const rowData = trimmedLine.split(/\s+/);
      if (rowData.length >= Math.floor(currentHeader.length * 0.7)) { // At least 70% of headers
        const rowObject = {};
        currentHeader.forEach((key, index) => {
          rowObject[key.toLowerCase().replace(/[^a-z0-9_]/gi, '_')] = rowData[index] || '';
        });
        
        // Add date information if available
        if (currentDate) {
          rowObject.date = currentDate;
        }
        
        // Add category information based on product name
        if (rowObject.brand || rowObject.product || rowObject.item || rowObject.description) {
          const productName = rowObject.brand || rowObject.product || rowObject.item || rowObject.description;
          rowObject.category = categorizeProduct(productName);
        }
        
        parsedText.push(rowObject);
        logRowData(currentHeader, rowData);
      }
    }
  });
  
  // If no headers were detected, try direct product extraction
  if (parsedText.length === 0) {
    const products = extractProductDetails(rawText);
    if (products.length > 0) {
      parsedText = products;
    }
  }
  
  return parsedText;
};

// Extract text from PDF files
const extractPdfText = async (pdfFilePath) => {
  try {
    logger.info(`Starting PDF extraction for file: ${pdfFilePath}`);
    const dataBuffer = await readFileAsync(pdfFilePath);
    const data = await pdfParse(dataBuffer);
    logger.info(`Extracted Raw Text from PDF (${pdfFilePath}): ${data.text.slice(0, 500)}...`);
    
    // First try to parse using the structured approach
    const structuredData = parseTextRows(data.text);
    
    // If that yields results, return it
    if (structuredData.length > 0) {
      logger.info(`Successfully parsed ${structuredData.length} rows of structured data from PDF`);
      return structuredData;
    }
    
    // Otherwise try the direct product extraction approach
    const products = extractProductDetails(data.text);
    if (products.length > 0) {
      logger.info(`Extracted ${products.length} products using direct extraction from PDF`);
      return products;
    }
    
    // If all else fails, return the raw text for further processing
    logger.warn(`Could not parse structured data from PDF. Returning raw text.`);
    return data.text;
  } catch (error) {
    logger.warn(`Skipping file ${pdfFilePath} due to PDF parsing error: ${error.message}`);
    return null;
  }
};

process.env.PYTHONIOENCODING = 'utf-8';

const extractImageText = async (imageFilePath) => {
  try {
    logger.info(`Running image OCR for: ${imageFilePath}`);
    let bestText = '';
    let bestScore = 0;
    
    // 1. Run Tesseract OCR
    try {
      logger.info(`Running Tesseract OCR for image: ${imageFilePath}`);
      const { data: { text: tesseractText } } = await tesseract.recognize(imageFilePath, 'eng');
      logger.info(`Tesseract OCR extracted text: ${tesseractText.slice(0, 500)}...`);
      
      // Score the text quality (count of alphanumeric characters)
      const tesseractScore = (tesseractText.match(/[a-zA-Z0-9]/g) || []).length;
      if (tesseractScore > bestScore) {
        bestText = tesseractText;
        bestScore = tesseractScore;
      }
    } catch (error) {
      logger.warn(`Tesseract OCR failed for ${imageFilePath}: ${error.message}`);
    }

    // 2. Run EasyOCR
    try {
      logger.info(`Running EasyOCR for image: ${imageFilePath}`);
      const easyOcrText = await extractImageTextWithEasyOCR(imageFilePath);
      logger.info(`EasyOCR extracted text: ${easyOcrText.slice(0, 500)}...`);
      
      // Score the text quality
      const easyOcrScore = (easyOcrText.match(/[a-zA-Z0-9]/g) || []).length;
      if (easyOcrScore > bestScore) {
        bestText = easyOcrText;
        bestScore = easyOcrScore;
      }
    } catch (error) {
      logger.warn(`EasyOCR failed for ${imageFilePath}: ${error.message}`);
    }

    // 3. Run PaddleOCR
    try {
      logger.info(`Running PaddleOCR for image: ${imageFilePath}`);
      const paddleOcrText = await extractImageTextWithPaddleOCR(imageFilePath);
      logger.info(`PaddleOCR extracted text: ${paddleOcrText.slice(0, 500)}...`);
      
      // Score the text quality
      const paddleOcrScore = (paddleOcrText.match(/[a-zA-Z0-9]/g) || []).length;
      if (paddleOcrScore > bestScore) {
        bestText = paddleOcrText;
        bestScore = paddleOcrScore;
      }
    } catch (error) {
      logger.warn(`PaddleOCR failed for ${imageFilePath}: ${error.message}`);
    }

    // Process the best text we got
    if (bestText) {
      // First try to parse using the structured approach
      const structuredData = parseTextRows(bestText);
      
      // If that yields results, return it
      if (structuredData.length > 0) {
        logger.info(`Successfully parsed ${structuredData.length} rows of structured data from image`);
        return structuredData;
      }
      
      // Otherwise try the direct product extraction approach
      const products = extractProductDetails(bestText);
      if (products.length > 0) {
        logger.info(`Extracted ${products.length} products using direct extraction from image`);
        return products;
      }
      
      // If all else fails, return the raw text for further processing
      logger.warn(`Could not parse structured data from image. Returning raw text.`);
      return bestText;
    }
    
    return "No text could be extracted from the image.";
  } catch (error) {
    logger.error(`Error during image text extraction for ${imageFilePath}: ${error.message}`);
    return null;
  }
};

// Extract text from Excel files
const extractExcelText = (excelFilePath) => {
  try {
    logger.info(`Starting extraction on Excel file: ${excelFilePath}`);
    const workbook = XLSX.readFile(excelFilePath);
    let extractedData = [];

    workbook.SheetNames.forEach(sheetName => {
      // Convert sheet to JSON with header row
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
      
      // Find header row
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(10, sheet.length); i++) {
        const row = sheet[i];
        if (row && row.length > 3 && possibleHeaders.some(headerRegex => 
          row.some(cell => cell && headerRegex.test(cell.toString())))) {
          headerRowIndex = i;
          break;
        }
      }
      
      if (headerRowIndex >= 0) {
        const headers = sheet[headerRowIndex];
        
        // Process data rows
        for (let i = headerRowIndex + 1; i < sheet.length; i++) {
          const row = sheet[i];
          if (row && row.length >= Math.floor(headers.length * 0.7)) { // At least 70% of headers
            const rowObject = {};
            headers.forEach((header, index) => {
              if (header) {
                rowObject[header.toString().toLowerCase().replace(/[^a-z0-9_]/gi, '_')] = 
                  index < row.length ? row[index] : '';
              }
            });
            
            // Add category information based on product name
            if (rowObject.brand || rowObject.product || rowObject.item || rowObject.description) {
              const productName = rowObject.brand || rowObject.product || rowObject.item || rowObject.description;
              rowObject.category = categorizeProduct(productName.toString());
            }
            
            extractedData.push(rowObject);
          }
        }
      } else {
        // No header found, try to make sense of the data directly
        // Skip first few rows which might be title/metadata
        const startRow = sheet.findIndex(row => row && row.length >= 3 && row.some(cell => 
          cell && typeof cell === 'string' && cell.match(/[A-Za-z]/)));
        
        if (startRow >= 0) {
          // Process remaining rows as potential product data
          for (let i = startRow; i < sheet.length; i++) {
            const row = sheet[i];
            if (row && row.length >= 3) {
              // Try to identify what each column might be
              const productName = row.find(cell => cell && typeof cell === 'string' && 
                cell.toString().length > 5 && !cell.toString().match(/^\d+(\.\d+)?$/));
              
              const priceValue = row.find(cell => cell && 
                (typeof cell === 'number' || cell.toString().match(/^\$?\d+\.\d{2}$/)));
              
              const quantityValue = row.find(cell => cell && 
                (typeof cell === 'number' || cell.toString().match(/^\d+$/)));
              
              if (productName) {
                const product = {
                  name: productName.toString(),
                  price: priceValue ? parseFloat(priceValue.toString().replace('$', '')) : 0,
                  quantity: quantityValue ? parseInt(quantityValue.toString()) : 1,
                  category: categorizeProduct(productName.toString()),
                  packSize: 'Standard',
                  date: new Date().toLocaleDateString()
                };
                
                // Try to calculate total if not directly available
                product.total = product.price * product.quantity;
                
                extractedData.push(product);
              }
            }
          }
        }
      }
    });

    logger.info(`Extracted ${extractedData.length} items from Excel (${excelFilePath})`);
    return extractedData.length > 0 ? extractedData : null;
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
    
    // Try structured parsing first
    const structuredData = parseTextRows(text);
    
    // If that yields results, return it
    if (structuredData.length > 0) {
      logger.info(`Successfully parsed ${structuredData.length} rows of structured data from DOCX`);
      return structuredData;
    }
    
    // Otherwise try direct product extraction
    const products = extractProductDetails(text);
    if (products.length > 0) {
      logger.info(`Extracted ${products.length} products using direct extraction from DOCX`);
      return products;
    }
    
    // If all else fails, return the raw text
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
    const results = [];
    
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        // Add category information based on product name
        if (row.brand || row.product || row.item || row.description) {
          const productName = row.brand || row.product || row.item || row.description;
          row.category = categorizeProduct(productName);
        }
        
        results.push(row);
      })
      .on('end', () => {
        logger.info(`Extracted ${results.length} rows from CSV (${csvFilePath})`);
        resolve(results.length > 0 ? results : null);
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
    
    // Try structured parsing first
    const structuredData = parseTextRows(text);
    
    // If that yields results, return it
    if (structuredData.length > 0) {
      logger.info(`Successfully parsed ${structuredData.length} rows of structured data from TXT`);
      return structuredData;
    }
    
    // Otherwise try direct product extraction
    const products = extractProductDetails(text);
    if (products.length > 0) {
      logger.info(`Extracted ${products.length} products using direct extraction from TXT`);
      return products;
    }
    
    // If all else fails, return the raw text
    return text;
  } catch (error) {
    logger.warn(`Skipping file ${txtFilePath} due to TXT reading error: ${error.message}`);
    return null;
  }
};

const determineFileTypeAndExtract = async (filePath) => {
  try {
    const buffer = await readFileAsync(filePath);
    const { fileTypeFromBuffer } = await import('file-type');
    const type = await fileTypeFromBuffer(buffer);
    const fileExt = path.extname(filePath).toLowerCase();

    // If file-type couldn't determine the type, use the file extension
    if (!type && fileExt) {
      logger.info(`Using file extension to determine type for ${filePath}`);
      
      switch (fileExt) {
        case '.pdf':
          return { text: await extractPdfText(filePath), processedData: true };
        case '.xlsx':
        case '.xls':
          return { text: await extractExcelText(filePath), processedData: true };
        case '.csv':
          return { text: await extractCsvText(filePath), processedData: true };
        case '.docx':
        case '.doc':
          return { text: await extractDocxText(filePath), processedData: true };
        case '.txt':
          return { text: await extractTxtText(filePath), processedData: true };
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.gif':
        case '.bmp':
          return { text: await extractImageText(filePath), processedData: true };
        default:
          logger.warn(`Unsupported file extension for ${filePath}: ${fileExt}. Skipping.`);
          return { text: null, processedData: false };
      }
    }

    if (!type) {
      logger.warn(`Could not determine file type for ${filePath}. Skipping.`);
      return { text: null, processedData: false };
    }

    logger.info(`Processing file type ${type.mime} for ${filePath}`);

    switch (type.mime) {
      case 'application/pdf':
        return { text: await extractPdfText(filePath), processedData: true };
      case 'image/jpeg':
      case 'image/png':
      case 'image/bmp':
      case 'image/gif':
      case 'image/tiff':
        return { text: await extractImageText(filePath), processedData: true };
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        return { text: await extractDocxText(filePath), processedData: true };
      case 'text/csv':
        return { text: await extractCsvText(filePath), processedData: true };
      case 'text/plain':
        return { text: await extractTxtText(filePath), processedData: true };
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
        return { text: await extractExcelText(filePath), processedData: true };
      default:
        logger.warn(`Unsupported file type for ${filePath}: ${type.mime}. Skipping.`);
        return { text: null, processedData: false };
    }
  } catch (error) {
    logger.error(`Error processing ${filePath}: ${error.message}`);
    return { text: null, processedData: false, error: error.message };
  }
};

const processFile = async (filePath, outputFolder, month) => {
  logger.info(`Processing file: ${filePath} for month: ${month || 'current'}`);
  
  try {
    // Create month-specific folder if needed
    const monthFolder = month ? path.join(outputFolder, month) : outputFolder;
    await fs.ensureDir(monthFolder);
    
    // Generate output file paths
    const fileName = path.basename(filePath, path.extname(filePath));
    const jsonOutputPath = path.join(monthFolder, `${fileName}_processed.json`);
    const rawTextPath = path.join(monthFolder, `${fileName}_raw.txt`);
    
    // Extract and process the text
    const { text, processedData, error } = await determineFileTypeAndExtract(filePath);
    
    if (error) {
      logger.error(`Failed to process ${filePath}: ${error}`);
      return {
        success: false,
        error: error,
        filePath: filePath
      };
    }
    
    if (!text) {
      logger.warn(`No text could be extracted from ${filePath}`);
      return {
        success: false,
        error: 'No text could be extracted',
        filePath: filePath
      };
    }
    
    // If the text is a string, it's raw text; otherwise, it's already structured data
    if (typeof text === 'string') {
      // Save raw text
      await fs.writeFile(rawTextPath, text, 'utf-8');
      
      // Try to parse structured data from the text
      const structuredData = parseTextRows(text);
      
      // Save the structured data
      await fs.writeFile(jsonOutputPath, JSON.stringify(structuredData, null, 2), 'utf-8');
      
      logger.info(`Processed ${filePath}: extracted ${structuredData.length} items`);
      return {
        success: true,
        items: structuredData.length,
        rawTextPath: rawTextPath,
        jsonPath: jsonOutputPath,
        filePath: filePath,
        date: new Date().toISOString()
      };
    } else {
      // Text is already structured data
      // Save the raw JSON
      await fs.writeFile(jsonOutputPath, JSON.stringify(text, null, 2), 'utf-8');
      
      // Generate a text representation for the raw text file
      const rawTextContent = Array.isArray(text) 
        ? text.map(item => Object.entries(item).map(([k, v]) => `${k}: ${v}`).join('\n')).join('\n\n')
        : JSON.stringify(text, null, 2);
      
      await fs.writeFile(rawTextPath, rawTextContent, 'utf-8');
      
      const itemCount = Array.isArray(text) ? text.length : 1;
      logger.info(`Processed ${filePath}: extracted ${itemCount} items`);
      
      return {
        success: true,
        items: itemCount,
        rawTextPath: rawTextPath,
        jsonPath: jsonOutputPath,
        filePath: filePath,
        date: new Date().toISOString()
      };
    }
  } catch (error) {
    logger.error(`Error processing file ${filePath}: ${error.message}`);
    return {
      success: false,
      error: error.message,
      filePath: filePath
    };
  }
};

const processFiles = async (inputFolder, outputFolder, month = null) => {
  logger.info(`Starting file processing in folder: ${inputFolder} for month: ${month || 'current'}`);
  
  // Create output folder if it doesn't exist
  const monthFolder = month ? path.join(outputFolder, month) : outputFolder;
  await fs.ensureDir(monthFolder);
  
  // Get list of files in the input folder
  const files = await fs.readdir(inputFolder);
  logger.info(`Found ${files.length} files to process`);
  
  const results = [];
  
  // Process each file and collect results
  for (const file of files) {
    const filePath = path.join(inputFolder, file);
    
    try {
      // Skip directories
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        logger.info(`Skipping directory: ${filePath}`);
        continue;
      }
      
      // Process the file
      const result = await processFile(filePath, monthFolder, month);
      results.push(result);
      
      // Log result
      if (result.success) {
        logger.info(`Successfully processed ${file}: extracted ${result.items} items`);
      } else {
        logger.warn(`Failed to process ${file}: ${result.error}`);
      }
    } catch (error) {
      logger.error(`Error processing file ${filePath}: ${error.message}`);
      results.push({
        success: false,
        error: error.message,
        filePath: filePath
      });
    }
  }
  
  // Return summary of processing results
  return {
    total: files.length,
    processed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results: results
  };
};

// Export the functions for use in other modules
module.exports = {
  processFiles,
  processFile,
  extractPdfText,
  extractImageText,
  extractExcelText,
  extractDocxText,
  extractCsvText,
  extractTxtText
};
