const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const winston = require('winston');
const WebSocket = require('ws');
const XLSX = require('xlsx');

const OUTPUT_FOLDER = 'F:/repogit/x-seller-8/frontend/public/output';
const JSON_FILE = path.join(OUTPUT_FOLDER, 'inventory_data.json');
const logFile = path.join(__dirname, 'logs', 'process.log');

// Set up Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: logFile })
  ]
});

// WebSocket setup for real-time logging
const wss = new WebSocket.Server({ port: 8081 });
let clients = [];

wss.on('connection', (ws) => {
  clients.push(ws);
  ws.send('Connected to real-time logging');

  ws.on('close', () => {
    clients = clients.filter((client) => client !== ws);
  });
});

// Function to broadcast logs
const broadcastLog = (message) => {
  logger.info(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Function to run scripts and wait for completion
const runScript = (command, args) => {
  return new Promise((resolve, reject) => {
    const script = spawn(command, args);
    script.stdout.on('data', (data) => broadcastLog(`stdout: ${data}`));
    script.stderr.on('data', (data) => broadcastLog(`stderr: ${data}`));

    script.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
};

// Function to generate JSON from Excel
const generateJsonFromExcel = async (excelPath, jsonPath) => {
  try {
    broadcastLog(`Reading Excel file from: ${excelPath}`);

    // Check if the file exists
    if (!fs.existsSync(excelPath)) {
      throw new Error(`Excel file not found at: ${excelPath}`);
    }

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
    broadcastLog(`JSON file created at ${jsonPath}`);
  } catch (error) {
    throw new Error(`Failed to generate JSON: ${error.message}`);
  }
};

// Main function to execute process chain
const main = async (filePath) => {
  try {
    broadcastLog('Starting PDF to PNG Conversion, ensuring all pages are rotated correctly...');
    await runScript('python', ['1pdfConversion.py', filePath, OUTPUT_FOLDER]);
    broadcastLog('All files Converted and Rotated successfully.');

    broadcastLog('Starting pytest2.js...');
    await runScript('node', ['2textExtract.js', filePath, OUTPUT_FOLDER]);
    broadcastLog('Extracted Raw Text successfully.');

    broadcastLog('Building JSON Structure....');
    await runScript('python', ['3jsonstructure.py', filePath, OUTPUT_FOLDER]);
    broadcastLog('JSON Structure Built and Saved Successfully.');

    broadcastLog('Running fileProcessor.js...');
    await runScript('node', ['fileProcessor.js', OUTPUT_FOLDER]);
    broadcastLog('fileProcessor.js completed successfully.');

    broadcastLog('Running Enhanced_fileProcessor.js...');
    await runScript('node', ['Enhanced_fileProcessor.js', OUTPUT_FOLDER]);
    broadcastLog('Enhanced_fileProcessor.js completed successfully.');

    broadcastLog('Running App.py for data parsing...');
    await runScript('python', ['App.py', path.join(OUTPUT_FOLDER, 'TextExtract.txt')]);
    broadcastLog('App.py completed successfully.');

    broadcastLog('Running CleanRawText.py...');
    await runScript('python', ['CleanRawText.py', path.join(OUTPUT_FOLDER, 'Structured_Phrases.txt')]);
    broadcastLog('CleanRawText.py completed successfully.');

    broadcastLog('Running priceMatch.py...');
    await runScript('python', ['priceMatch.py']);
    broadcastLog('priceMatch.py completed successfully.');

    broadcastLog('Generating inventory_data.json...');
    const excelPath = path.join(OUTPUT_FOLDER, 'Inventory.xlsx');
    await generateJsonFromExcel(excelPath, JSON_FILE);

    broadcastLog('Processing completed successfully!');
  } catch (error) {
    broadcastLog(`Error during processing chain: ${error.message}`);
    process.exit(1);
  }
};

// Get file path from command line arguments or use a default path
let filePath = process.argv[2] || 'F:/repogit/x-seller-8/frontend/public/uploads';
broadcastLog(`Using file path: ${filePath}`);

// Run main function
main(filePath);