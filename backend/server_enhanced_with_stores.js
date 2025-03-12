require('dotenv').config({ path: 'openai.env' });
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs-extra');
const winston = require('winston');
const { spawn } = require('child_process');
const XLSX = require('xlsx');
const OpenAI = require('openai');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Import StoreManager and file processor
const StoreManager = require('./modules/store_manager');
const { processFiles, processFile } = require('./Enhanced_fileProcessor');

// Initialize StoreManager
const storeManager = new StoreManager();

// Middleware Setup
app.use(cors({ origin: 'http://localhost:5173' })); // Allow frontend origin
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
}));
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

// Ensure base directories exist
fs.ensureDirSync(path.join(__dirname, 'uploads'));
fs.ensureDirSync(path.join(__dirname, 'output'));

// Middleware to check if a store is active
const requireActiveStore = async (req, res, next) => {
  try {
    const activeStore = await storeManager.getActiveStore();
    if (!activeStore) {
      return res.status(400).json({
        success: false,
        error: 'No active store. Please create or select a store first.'
      });
    }
    
    // Add active store info to request
    req.activeStore = activeStore;
    req.storePaths = await storeManager.getStorePaths(activeStore.id);
    next();
  } catch (error) {
    logger.error(`Error in active store middleware: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve active store information'
    });
  }
};

// ============== STORE MANAGEMENT ENDPOINTS ==============

// Get all stores
app.get('/api/stores', async (req, res) => {
  try {
    const stores = await storeManager.getAllStores();
    const activeStore = await storeManager.getActiveStore();
    
    res.json({
      success: true,
      stores: stores,
      activeStoreId: activeStore ? activeStore.id : null
    });
  } catch (error) {
    logger.error(`Error getting stores: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve stores'
    });
  }
});

// Get active store
app.get('/api/stores/active', async (req, res) => {
  try {
    const activeStore = await storeManager.getActiveStore();
    
    if (!activeStore) {
      return res.json({
        success: true,
        hasActiveStore: false
      });
    }
    
    res.json({
      success: true,
      hasActiveStore: true,
      store: activeStore
    });
  } catch (error) {
    logger.error(`Error getting active store: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve active store'
    });
  }
});

// Add new store
app.post('/api/stores', async (req, res) => {
  try {
    const storeData = req.body;
    
    if (!storeData.name) {
      return res.status(400).json({
        success: false,
        error: 'Store name is required'
      });
    }
    
    const newStore = await storeManager.addStore(storeData);
    
    res.status(201).json({
      success: true,
      store: newStore,
      message: `Store "${newStore.name}" created successfully`
    });
  } catch (error) {
    logger.error(`Error creating store: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create store'
    });
  }
});

// Update store
app.put('/api/stores/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const storeData = req.body;
    
    const updatedStore = await storeManager.updateStore(storeId, storeData);
    
    res.json({
      success: true,
      store: updatedStore,
      message: `Store "${updatedStore.name}" updated successfully`
    });
  } catch (error) {
    logger.error(`Error updating store: ${error.message}`);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to update store'
    });
  }
});

// Delete store
app.delete('/api/stores/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { deleteData } = req.query;
    
    await storeManager.deleteStore(storeId, deleteData === 'true');
    
    res.json({
      success: true,
      message: 'Store deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting store: ${error.message}`);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to delete store'
    });
  }
});

// Set active store
app.post('/api/stores/:storeId/activate', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    const activeStore = await storeManager.setActiveStore(storeId);
    
    res.json({
      success: true,
      store: activeStore,
      message: `Store "${activeStore.name}" is now active`
    });
  } catch (error) {
    logger.error(`Error setting active store: ${error.message}`);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to set active store'
    });
  }
});

// ============== DOCUMENT PROCESSING ENDPOINTS ==============

// Endpoint for processing the uploaded file with enhanced processor (store-specific)
app.post('/api/process', requireActiveStore, async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      logger.error('No files were uploaded.');
      return res.status(400).json({ success: false, error: 'No files were uploaded.' });
    }

    const uploadedFiles = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
    const month = req.body.month || null; // Optional month parameter
    
    logger.info(`Processing ${uploadedFiles.length} files${month ? ` for month: ${month}` : ''} for store: ${req.activeStore.name}`);
    
    // Store-specific upload directory
    const uploadDir = req.storePaths.uploads;
    const outputDir = req.storePaths.output;
    
    // Save each uploaded file
    const savedFiles = [];
    for (const file of uploadedFiles) {
      const uploadPath = path.join(uploadDir, file.name);
      await file.mv(uploadPath);
      savedFiles.push(uploadPath);
      logger.info(`File saved: ${uploadPath}`);
    }

    // Process all saved files
    const results = await processFiles(uploadDir, outputDir, month);
    
    logger.info(`Processing completed: ${results.processed} files processed, ${results.failed} failed`);
    
    // Create a summary of processed files
    const processedItems = results.results.filter(r => r.success).map(r => ({
      fileName: path.basename(r.filePath),
      itemCount: r.items,
      jsonPath: `/output/${req.activeStore.id}/${month ? month + '/' : ''}${path.basename(r.jsonPath)}`,
      rawTextPath: `/output/${req.activeStore.id}/${month ? month + '/' : ''}${path.basename(r.rawTextPath)}`,
      date: r.date
    }));
    
    // Return results to client
    res.status(200).json({ 
      success: true, 
      message: `Successfully processed ${results.processed} out of ${results.total} files`,
      storeId: req.activeStore.id,
      storeName: req.activeStore.name,
      processedFiles: processedItems,
      failed: results.results.filter(r => !r.success).map(r => ({
        fileName: path.basename(r.filePath),
        error: r.error
      }))
    });
  } catch (error) {
    logger.error(`Error processing files: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Server error while processing files', 
      details: error.message 
    });
  }
});

// Endpoint for processing a single file (store-specific)
app.post('/api/process-file', requireActiveStore, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      logger.error('No file was uploaded.');
      return res.status(400).json({ success: false, error: 'No file was uploaded.' });
    }

    const uploadedFile = req.files.file;
    const month = req.body.month || null; // Optional month parameter
    
    // Store-specific paths
    const uploadDir = req.storePaths.uploads;
    const outputDir = req.storePaths.output;
    
    // Save the uploaded file
    const uploadPath = path.join(uploadDir, uploadedFile.name);
    await uploadedFile.mv(uploadPath);
    logger.info(`File saved: ${uploadPath}`);

    // Process the file
    const result = await processFile(uploadPath, outputDir, month);
    
    if (result.success) {
      logger.info(`File processed successfully: ${uploadedFile.name}, extracted ${result.items} items`);
      
      // Return result to client with store info
      res.status(200).json({
        success: true,
        fileName: uploadedFile.name,
        itemCount: result.items,
        storeId: req.activeStore.id,
        storeName: req.activeStore.name,
        jsonPath: `/output/${req.activeStore.id}/${month ? month + '/' : ''}${path.basename(result.jsonPath)}`,
        rawTextPath: `/output/${req.activeStore.id}/${month ? month + '/' : ''}${path.basename(result.rawTextPath)}`,
        date: result.date
      });
    } else {
      logger.error(`Failed to process file: ${uploadedFile.name} - ${result.error}`);
      res.status(400).json({
        success: false,
        fileName: uploadedFile.name,
        error: result.error
      });
    }
  } catch (error) {
    logger.error(`Error processing file: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Server error while processing file', 
      details: error.message 
    });
  }
});

// Get processed files by month (store-specific)
app.get('/api/processed-files/:month?', requireActiveStore, async (req, res) => {
  try {
    const month = req.params.month;
    const outputDir = req.storePaths.output;
    const monthDir = month ? path.join(outputDir, month) : outputDir;
    
    // Check if directory exists
    if (!await fs.pathExists(monthDir)) {
      return res.status(404).json({ 
        success: false, 
        error: `No data found for ${month || 'current'} month in store ${req.activeStore.name}` 
      });
    }
    
    // Get list of processed JSON files
    const files = await fs.readdir(monthDir);
    const jsonFiles = files.filter(file => file.endsWith('_processed.json'));
    
    // Read summary of each file
    const fileDetails = await Promise.all(jsonFiles.map(async (file) => {
      try {
        const filePath = path.join(monthDir, file);
        const stats = await fs.stat(filePath);
        
        // Read first few items to provide summary
        const content = await fs.readJson(filePath);
        const itemCount = Array.isArray(content) ? content.length : 0;
        
        return {
          fileName: file,
          itemCount,
          path: `/output/${req.activeStore.id}/${month ? month + '/' : ''}${file}`,
          lastModified: stats.mtime,
          size: stats.size
        };
      } catch (error) {
        logger.error(`Error reading file ${file}: ${error.message}`);
        return {
          fileName: file,
          error: 'Could not read file',
          path: `/output/${req.activeStore.id}/${month ? month + '/' : ''}${file}`
        };
      }
    }));
    
    res.json({
      success: true,
      month: month || 'current',
      storeId: req.activeStore.id,
      storeName: req.activeStore.name,
      files: fileDetails.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
    });
  } catch (error) {
    logger.error(`Error retrieving processed files: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Server error retrieving processed files', 
      details: error.message 
    });
  }
});

// Get list of available months (store-specific)
app.get('/api/months', requireActiveStore, async (req, res) => {
  try {
    const outputDir = req.storePaths.output;
    const contents = await fs.readdir(outputDir);
    
    // Filter for directories only
    const months = [];
    for (const item of contents) {
      const itemPath = path.join(outputDir, item);
      const stats = await fs.stat(itemPath);
      if (stats.isDirectory()) {
        months.push(item);
      }
    }
    
    res.json({
      success: true,
      storeId: req.activeStore.id,
      storeName: req.activeStore.name,
      months: months.sort() // Sort alphabetically
    });
  } catch (error) {
    logger.error(`Error retrieving months: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Server error retrieving months', 
      details: error.message 
    });
  }
});

// Get data from a specific processed file (store-specific)
app.get('/api/file-data/:month?/:filename', requireActiveStore, async (req, res) => {
  try {
    const month = req.params.month;
    const filename = req.params.filename;
    const outputDir = req.storePaths.output;
    
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename is required' });
    }
    
    const filePath = month 
      ? path.join(outputDir, month, filename)
      : path.join(outputDir, filename);
    
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    // Read and return file content
    const fileData = await fs.readJson(filePath);
    res.json({
      success: true,
      fileName: filename,
      month: month || 'current',
      storeId: req.activeStore.id,
      storeName: req.activeStore.name,
      data: fileData
    });
  } catch (error) {
    logger.error(`Error reading file data: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Server error reading file data', 
      details: error.message 
    });
  }
});

// Start new month endpoint (store-specific)
app.post('/api/start-new-month', requireActiveStore, async (req, res) => {
  try {
    const { month } = req.body;
    const outputDir = req.storePaths.output;
    
    if (!month) {
      return res.status(400).json({ success: false, error: 'Month name is required' });
    }
    
    // Create directory for the new month
    const monthDir = path.join(outputDir, month);
    await fs.ensureDir(monthDir);
    
    logger.info(`Started new month: ${month} for store: ${req.activeStore.name}`);
    res.json({
      success: true,
      message: `Successfully started new month: ${month}`,
      month,
      storeId: req.activeStore.id,
      storeName: req.activeStore.name
    });
  } catch (error) {
    logger.error(`Error starting new month: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Server error starting new month', 
      details: error.message 
    });
  }
});

// ============== INVENTORY MANAGEMENT ENDPOINTS ==============

// Get store inventory
app.get('/api/inventory', requireActiveStore, async (req, res) => {
  try {
    // Try to load from store-specific inventory file
    const inventoryFilePath = path.join(req.storePaths.inventory, 'inventory_data.json');
    
    let inventoryData;
    
    if (await fs.pathExists(inventoryFilePath)) {
      // File exists, read it
      inventoryData = await fs.readJson(inventoryFilePath);
      logger.info(`Loaded inventory data for store ${req.activeStore.name}`);
    } else {
      // Create empty inventory
      inventoryData = [];
      await fs.writeJson(inventoryFilePath, inventoryData, { spaces: 2 });
      logger.info(`Created new inventory for store ${req.activeStore.name}`);
    }

    res.json({
      success: true,
      storeId: req.activeStore.id,
      storeName: req.activeStore.name,
      inventory: inventoryData
    });
  } catch (error) {
    logger.error(`Failed to fetch inventory data: ${error.message}`);
    res.status(500).send('Error fetching inventory data.');
  }
});

// Update store inventory
app.post('/api/update-inventory', requireActiveStore, async (req, res) => {
  try {
    const newData = req.body.data;
    if (!newData || !Array.isArray(newData)) {
      return res.status(400).send('Invalid data format.');
    }

    // Update store-specific inventory file
    const inventoryFilePath = path.join(req.storePaths.inventory, 'inventory_data.json');
    await fs.writeJson(inventoryFilePath, newData, { spaces: 2 });
    
    logger.info(`Updated inventory for store ${req.activeStore.name} with ${newData.length} items`);
    res.status(200).json({
      success: true,
      message: 'Inventory updated successfully',
      storeId: req.activeStore.id,
      storeName: req.activeStore.name
    });
  } catch (error) {
    logger.error(`Failed to update inventory: ${error.message}`);
    res.status(500).send('Error updating inventory.');
  }
});

// ============== AI ASSISTANT ENDPOINTS ==============

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

// Chat API Endpoint (store-aware)
app.post('/api/chat', requireActiveStore, async (req, res) => {
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
    // Include store context in the prompt
    const contextMessage = `The following question is about the inventory for the store: ${req.activeStore.name} (ID: ${req.activeStore.id}). Please provide information relevant to this specific store's inventory.`;
    
    const completion = await openai.chat.completions.create({
      model: 'nvidia/llama-3.1-nemotron-70b-instruct',
      messages: [
        { role: 'system', content: contextMessage },
        { role: 'user', content: message }
      ],
      temperature: 0.5,
      max_tokens: 1024,
    });

    const botResponse = completion.choices[0]?.message?.content;
    if (!botResponse) {
      logger.error('No response from Lumin');
      return res.status(500).json({ error: 'No response from Lumin' });
    }

    res.json({ 
      content: botResponse,
      storeId: req.activeStore.id,
      storeName: req.activeStore.name 
    });
  } catch (error) {
    logger.error('Error with OpenAI API:', error);
    res.status(500).json({ error: 'Failed to get response from Lumin' });
  }
});

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
      logger.info(`Server with multi-store capability is running at http://localhost:${address.port}`);
    });
}

// Start the server with automatic port selection
startServer(PORT);

module.exports = app; // Export for testing
