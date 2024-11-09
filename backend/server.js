require('dotenv').config({ path: 'openai.env' });
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
const { spawn } = require('child_process');
const XLSX = require('xlsx');
const OpenAI = require('openai');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Setup
app.use(cors({ origin: 'http://localhost:5173' })); // Allow frontend origin
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/output', express.static(path.join(__dirname, 'output'))); // Serve output directory

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

// Endpoint for processing the uploaded file
app.post('/process', (req, res) => {
  if (!req.files || !req.files.file) {
    logger.error('No files were uploaded.');
    return res.status(400).json({ error: 'No files were uploaded.' });
  }

  const uploadedFile = req.files.file;
  const uploadPath = path.join(__dirname, 'uploads', uploadedFile.name);

  // Save the uploaded file
  uploadedFile.mv(uploadPath, (err) => {
    if (err) {
      logger.error(`Error saving file: ${err.message}`);
      return res.status(500).json({ error: 'Failed to save the file.' });
    }

    logger.info('File saved successfully. Starting extractText.js script...');

    // Run extractText.js script
    const extractScript = spawn('node', ['extractText.js', uploadPath]);

    extractScript.stdout.on('data', (data) => {
      logger.info(`stdout: ${data}`);
    });

    extractScript.stderr.on('data', (data) => {
      logger.error(`stderr: ${data}`);
    });

    extractScript.on('close', (code) => {
      if (code !== 0) {
        logger.error(`extractText.js exited with code ${code}`);
        return res.status(500).json({ error: 'Error during file processing.' });
      }

      const excelPath = path.join('output', 'Inventory.xlsx');
      logger.info('extractText.js script completed successfully. Sending response to client...');
      res.status(200).json({ excelPath });
    });
  });
});

// Endpoint for downloading the processed Excel file
app.get('/download/:filePath', (req, res) => {
  const filePath = path.join(__dirname, 'output', req.params.filePath);

  if (fs.existsSync(filePath)) {
    logger.info(`File found. Downloading: ${req.params.filePath}`);
    res.download(filePath);
  } else {
    logger.error(`File not found: ${req.params.filePath}`);
    res.status(404).json({ error: 'File not found.' });
  }
});

app.get('/api/inventory', async (req, res) => {
  try {
    const updatedInventoryFile = path.join(__dirname, 'frontend/public/output/UpdatedFoodInventory.xlsx');
    const inventoryData = await fs.readFile(updatedInventoryFile);

    // Use pandas or a library like `xlsx` in Node.js to read and parse the Excel file to JSON
    const XLSX = require('xlsx');
    const workbook = XLSX.read(inventoryData, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    res.json(jsonData);
  } catch (error) {
    logger.error(`Failed to fetch inventory data: ${error.message}`);
    res.status(500).send('Error fetching inventory data.');
  }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

// Chat API Endpoint
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    logger.error('Message is required for chat endpoint.');
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'nvidia/llama-3.1-nemotron-70b-instruct',
      messages: [{ role: 'user', content: message }],
      temperature: 0.5,
      max_tokens: 1024,
    });

    const botResponse = completion.choices[0]?.message?.content;
    if (!botResponse) {
      logger.error('No response from Lumin');
      return res.status(500).json({ error: 'No response from Lumin' });
    }

    res.json({ content: botResponse });
  } catch (error) {
    logger.error('Error with OpenAI API:', error);
    res.status(500).json({ error: 'Failed to get response from Lumin' });
  }
});

app.post('/api/update-inventory', async (req, res) => {
  try {
    const newData = req.body.data;
    if (!newData || !Array.isArray(newData)) {
      return res.status(400).send('Invalid data format.');
    }

    await updateInventory(newData);
    res.status(200).send('Inventory updated successfully.');
  } catch (error) {
    logger.error(`Failed to update inventory: ${error.message}`);
    res.status(500).send('Error updating inventory.');
  }
});

app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await fs.readJSON(path.join(__dirname, 'inventory_data.json'));
    res.json(inventory);
  } catch (error) {
    logger.error(`Failed to fetch inventory: ${error.message}`);
    res.status(500).send('Error fetching inventory.');
  }
});


// Start the server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});