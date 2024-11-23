const fs = import('fs-extra');
const path = import('path');
const pdfParse = import('pdf-parse');
const tesseract = import('tesseract.js');
const XLSX = import('xlsx');
const csv = import('csv-parser');
const docxParser = import('docx-parser');
const { promisify } = import('util');
const readFileAsync = new Promise(fs.readFile);
const winston = import('winston');

const extractTransport = new winston.transports.File({ 
    filename: path.join(__dirname, 'logs', 'extracted_text.log'),
    level: 'info',
    format: winston.format.combine(
        winston.format.printf((info) => {
            if (!info.message) {
                console.error('Undefined message in log entry:', info);
                return '';
            }
            // Only log messages containing "Text"
            return info.message.includes('Text') ? info.message : '';
        })
    ) // Missing comma added here
});

// Remove redundant block:
// format: winston.format.combine(...)

// Set up Winston logger with both the default and custom transports
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.join(__dirname, 'logs', 'app.log') }),
        extractTransport // Add custom transport for extracted text logs
    ]
});

// Function to dynamically import file-type module
const getFileType = async (buffer) => {
    const { fileTypeFromBuffer } = await import('file-type');
    return fileTypeFromBuffer(buffer);
};

// Function to extract text from PDF files
const extractPdfText = async (pdfFilePath) => {
    const dataBuffer = await readFileAsync(pdfFilePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
};

const extractImageText = async (imageFilePath) => {
    try {
        // Perform OCR on the image file
        const { data: { text } } = await tesseract.recognize(imageFilePath, 'eng', {
            logger: (info) => logger.info(info.message), // Log OCR progress
        });

        // Parse the raw OCR text into structured data
        const parsedData = parseInventoryData(text);

        // Log extracted structured data for debugging
        logger.info(`Extracted Text from ${imageFilePath}: ${JSON.stringify(parsedData, null, 2)}`);

        return parsedData;
    } catch (error) {
        throw new Error(`Error processing image with Tesseract: ${error.message}`);
    }
};

// Function to parse raw OCR text into structured inventory data
const parseInventoryData = (rawText) => {
    const lines = rawText.split('\n'); // Split text into lines
    const structuredData = [];

    lines.forEach((line) => {
        const [name, price, quantity] = line.split(','); // Assuming CSV-style data
        if (name && price && quantity) {
            structuredData.push({
                name: name.trim(),
                price: parseFloat(price.trim()) || 0,
                quantity: parseInt(quantity.trim(), 10) || 0,
            });
        }
    });

    return structuredData;
};

// Function to extract text from .docx files
const extractDocxText = async (docxFilePath) => {
    return new Promise((resolve, reject) => {
        docxParser.parseDocx(docxFilePath, (error, data) => {
            if (error) reject(error);
            resolve(data);
        });
    });
};

// Function to extract text from Excel files (.xlsx, .xls)
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

// Function to extract text from .txt files
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

const processFiles = async (inputFolder, outputFile) => {
    const aggregatedData = [];
    const files = await fs.readdir(inputFolder);

    for (const file of files) {
        const filePath = path.join(inputFolder, file);
        
        try {
            const data = await determineFileTypeAndExtract(filePath);
            if (data) {
                aggregatedData.push(...data); // Aggregate structured data
            }
        } catch (error) {
            console.error(`Failed to process ${filePath}: ${error.message}`);
        }
    }

    // Save aggregated structured data to the specified output file
    await fs.writeFile(outputFile, JSON.stringify(aggregatedData, null, 2), 'utf-8');
    console.log(`Structured data saved to ${outputFile}`);
};

const inputFolder = 'F:/repogit/X-seLLer-8/TETFILES';
const outputFile = 'F:/repogit/X-seLLer-8/testfiles/11.23ParsedItems.json';

processFiles(inputFolder, outputFile).then(() => {
    console.log('Processing complete.');
}).catch((error) => {
    console.error('Error during processing:', error);
});
