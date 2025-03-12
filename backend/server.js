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

// Import integration script
const integration = require('./integration');

app.get('/api/inventory', async (req, res) => {
  try {
    // Try to load from inventory_data.json first
    const inventoryFilePath = path.join(__dirname, 'inventory_data.json');
    
    let inventoryData;
    
    if (fs.existsSync(inventoryFilePath)) {
      // File exists, read it
      inventoryData = await fs.readJSON(inventoryFilePath);
      logger.info(`Loaded inventory data from ${inventoryFilePath}`);
    } else {
      // File doesn't exist, try to sync with Flask or create mock data
      try {
        logger.info('Inventory data file not found. Attempting to sync with Flask backend...');
        inventoryData = await integration.syncInventoryData();
      } catch (syncError) {
        logger.warn(`Failed to sync with Flask backend: ${syncError.message}`);
        logger.info('Creating mock inventory data as fallback...');
        inventoryData = await integration.createMockInventoryFile();
      }
    }

    res.json(inventoryData);
  } catch (error) {
    logger.error(`Failed to fetch inventory data: ${error.message}`);
    res.status(500).send('Error fetching inventory data.');
  }
});

// Initialize OpenAI if API key is available
let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });
    logger.info('OpenAI client initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize OpenAI client: ${error.message}`);
  }
} else {
  logger.warn('OPENAI_API_KEY not found in environment variables. Chat functionality will be disabled.');
}

// Chat API Endpoint
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    logger.error('Message is required for chat endpoint.');
    return res.status(400).json({ error: 'Message is required' });
  }

  // Check if OpenAI client is available
  if (!openai) {
    return res.status(503).json({ 
      error: 'Chat service unavailable. OPENAI_API_KEY not configured.',
      fallbackResponse: 'Chat service is currently unavailable. Please check server configuration.'
    });
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

    // Update inventory data file
    const inventoryFilePath = path.join(__dirname, 'inventory_data.json');
    await fs.writeJSON(inventoryFilePath, newData, { spaces: 2 });
    
    logger.info(`Updated inventory data with ${newData.length} items`);
    res.status(200).send('Inventory updated successfully.');
  } catch (error) {
    logger.error(`Failed to update inventory: ${error.message}`);
    res.status(500).send('Error updating inventory.');
  }
});

// Run the initial data sync on server startup
(async () => {
  try {
    const inventoryFilePath = path.join(__dirname, 'inventory_data.json');
    
    // Only run initial sync if the file doesn't exist
    if (!fs.existsSync(inventoryFilePath)) {
      logger.info('Running initial data synchronization...');
      
      try {
        await integration.syncInventoryData();
        logger.info('Initial data sync completed successfully');
      } catch (syncError) {
        logger.warn(`Initial data sync failed: ${syncError.message}`);
        logger.info('Creating mock inventory data as fallback...');
        await integration.createMockInventoryFile();
      }
    }
  } catch (error) {
    logger.error(`Error during initial setup: ${error.message}`);
  }
})();


// Start the server
// Try to find an available port starting from the specified PORT
function startServer(port) {
  const server = app.listen(port)
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port is busy, try the next one
        logger.warn(`Port ${port} is busy, trying port ${port + 1}...`);
        startServer(port + 1);
      } else {
        logger.error(`Failed to start server: ${err.message}`);
      }
    })
    .on('listening', () => {
      const address = server.address();
      logger.info(`Server is running at http://localhost:${address.port}`);
    });
}

// Start the server with automatic port selection
startServer(PORT);
