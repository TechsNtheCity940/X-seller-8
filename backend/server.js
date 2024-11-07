require('dotenv').config({ path: 'openai.env' }); // Load environment variables
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
const { execFile } = require('child_process');
const XLSX = require('xlsx');
const OpenAI = require('openai');
const app = express();

// Set up Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'server.log' })
  ]
});

// Middleware for handling file uploads
const upload = multer({ dest: 'uploads/' });

const OUTPUT_FOLDER = 'F:/repogit/X-seller-8/frontend/public/output/archives'
const INVENTORY_XLSX_PATH = path.join(OUTPUT_FOLDER, 'Inventory.xlsx');
const INVENTORY_JSON_PATH = path.join(OUTPUT_FOLDER, 'inventory.json');

// Endpoint to process file uploads
app.post('/process', upload.single('file'), (req, res) => {
  if (!req.file) {
    logger.error('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }

  const filePath = path.join(__dirname, req.file.path);
  logger.info(`Processing file: ${filePath}`);

  // Run external fileProcessor script
  execFile('node', ['fileProcessor.js', filePath], (error, stdout, stderr) => {
    if (error) {
      logger.error(`Error processing file: ${error.message}`);
      logger.error(`stderr: ${stderr}`);
      return res.status(500).json({ error: 'Error processing file.' });
    }

    logger.info(`File processed successfully: ${stdout}`);

    // After processing, convert the Inventory.xlsx to JSON
    try {
      logger.info('Converting Inventory.xlsx to JSON...');
      const workbook = XLSX.readFile(INVENTORY_XLSX_PATH);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Save JSON data to a file
      fs.writeFileSync(INVENTORY_JSON_PATH, JSON.stringify(jsonData, null, 2), 'utf8');
      logger.info(`Inventory JSON saved to ${INVENTORY_JSON_PATH}`);

      res.json({
        message: 'File processed successfully and inventory JSON generated.',
        excelPath: 'output/Inventory.xlsx'
      });
    } catch (xlsxError) {
      logger.error(`Error converting Inventory.xlsx to JSON: ${xlsxError.message}`);
      res.status(500).json({ error: 'Error converting Inventory.xlsx to JSON.' });
    }
  });
});

// Endpoint for logging errors from ErrorBoundary (if applicable)
app.post('/log', (req, res) => {
  const { error, info } = req.body;
  logger.error(`Frontend Error: ${error}`);
  logger.info(`Additional Info: ${JSON.stringify(info)}`);
  res.sendStatus(200);
});

// Serve static files
app.use('/public', express.static(path.join(__dirname, '../frontend/public')));

// Endpoint to serve the inventory JSON
app.get('/public/output/inventory.json', (req, res) => {
  if (fs.existsSync(INVENTORY_JSON_PATH)) {
    res.sendFile(INVENTORY_JSON_PATH);
  } else {
    res.status(404).json({ error: 'Inventory JSON file not found' });
  }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

// Define the chat route
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    const completion = await openai.chat.completions.create({
      model: "nvidia/llama-3.1-nemotron-70b-instruct",
      messages: [{ role: 'user', content: message }],
      temperature: 0.5,
      max_tokens: 1024,
    });

    const botResponse = completion.choices[0]?.message?.content;
    if (!botResponse) return res.status(500).json({ error: 'No response from Lumin' });

    res.json({ content: botResponse });
  } catch (error) {
    logger.error('Error with OpenAI API:', error);
    res.status(500).json({ error: 'Failed to get response from Lumin' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server running on port 5000');
  logger.info(`Server is running on port ${PORT}`);
});