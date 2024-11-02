const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const tesseract = require('tesseract.js');
const chokidar = require('chokidar');
const { spawn } = require('child_process');
const { parse } = require('json2csv'); // Importing the json2csv library for CSV conversion
const mime = require('mime-types');
const winston = require('winston');  // Advanced logging library
const OpenAI = require('openai');
// Initialize the express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(cors());

const UPLOAD_FOLDER = ('D:/repogit/x-seller-8/frontend/public/uploads');
const OUTPUT_FOLDER = ('D:/repogit/x-seller-8/frontend/public/outputs');  // Adjusted path for portability
const ARCHIVE_FOLDER = path.join(OUTPUT_FOLDER, 'archive');
const JSON_FILE = path.join(OUTPUT_FOLDER, 'inventory_data.json');

// server.js

// Custom transport for saving specific logs to a separate file
const extractTransport = new winston.transports.File({
  filename: path.join(__dirname, 'logs', 'extracted.txt'),
  level: 'info',
  format: winston.format.combine(
      winston.format.printf(({ message }) => {
          // Only log messages containing "Extracted Text"
          return message.includes('Extracted Text') ? message : ''; // Return empty string if not matched
      })
  )
});
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

// Middleware for logging errors
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  res.status(500).send('Something went wrong!');
});

// Ensure upload and output folders exist
[UPLOAD_FOLDER, OUTPUT_FOLDER, ARCHIVE_FOLDER].forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
});

// Set up multer for file upload handling
const upload = multer({ dest: UPLOAD_FOLDER });

app.post('/upload', upload.single('file'), (req, res) => {
  const filePath = path.resolve(__dirname, req.file.path);
  const outputFolder = path.resolve(__dirname, 'output');
  
  // Step 1: Run pdfConversion.py
  execFile('python', ['pdfConversion.py', filePath, outputFolder], (err, stdout, stderr) => {
      if (err) {
          console.error(`Error in pdfConversion.py: ${stderr}`);
          return res.status(500).send('Error in PDF conversion.');
      }
      console.log(stdout);
      
      // Step 2: Run fileProcessor.js
      execFile('node', ['fileProcessor.js', outputFolder], (err, stdout, stderr) => {
          if (err) {
              console.error(`Error in fileProcessor.js: ${stderr}`);
              return res.status(500).send('Error in file processing.');
          }
          console.log(stdout);

          // Step 3: Run Enhanced_fileProcessor.js
          execFile('node', ['Enhanced_fileProcessor.js', outputFolder], (err, stdout, stderr) => {
              if (err) {
                  console.error(`Error in Enhanced_fileProcessor.js: ${stderr}`);
                  return res.status(500).send('Error in enhanced file processing.');
              }
              console.log(stdout);

              // Step 4: Run App.py
              execFile('python', ['App.py', path.join(outputFolder, 'RawTextExtract.txt')], (err, stdout, stderr) => {
                  if (err) {
                      console.error(`Error in App.py: ${stderr}`);
                      return res.status(500).send('Error in App processing.');
                  }
                  console.log(stdout);

                  // Step 5: Run CleanRawText.py
                  execFile('python', ['CleanRawText.py', path.join(outputFolder, 'CapitalizedPhrases.txt')], (err, stdout, stderr) => {
                      if (err) {
                          console.error(`Error in CleanRawText.py: ${stderr}`);
                          return res.status(500).send('Error in text cleaning.');
                      }
                      console.log(stdout);

                      // All steps completed successfully
                      res.send({ message: 'File processed successfully!' });
                  });
              });
          });
      });
  });
});

// Function to save data to JSON file
async function saveDataToJSONFile(data, filename) {
    try {
        const jsonData = JSON.stringify(data, null, 2);
        await fs.promises.writeFile(filename, jsonData, 'utf8');
        logger.info(`Data written to ${filename}`);
    } catch (error) {
        logger.error(`Failed to write JSON data to ${filename}: ${error}`);
        throw error;
    }
}

// Path to your inventory data file
const inventoryFile = path.join('D:','repogit', 'X-seLLer-8', 'frontend', 'public', 'outputs', 'InventoryList.json');
app.put('/inventory', (req, res) => {
    const updatedInventory = req.body;  // Expecting an array of updated inventory data
  
    // Save the updated data to your database or in-memory storage here
   
    database.saveInventory(updatedInventory);
  
    res.json({ success: true, message: 'Inventory updated successfully' });
  });
// API route to get inventory data
app.get('/inventory', (req, res) => {
    if (!fs.existsSync(inventoryFile)) {
      logger.error(`Inventory data file not found: ${inventoryFile}`);
      return res.status(404).json({ error: 'Inventory data file not found' });
    }
  
    fs.readFile(inventoryFile, 'utf8', (err, data) => {
      if (err) {
        logger.error(`Error reading inventory data: ${err.message}`);
        return res.status(500).json({ error: 'Failed to load inventory data' });
      }
  
      try {
        const jsonData = JSON.parse(data);
        res.json(jsonData);
      } catch (parseError) {
        logger.error(`Error parsing inventory data: ${parseError.message}`);
        res.status(500).json({ error: 'Invalid JSON format in inventory file' });
      }
    });
  });

// Function to update inventory with new invoice data
function updateInventory(newData) {
    try {
      const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf-8'));
  
      // Ensure the inventory is an array
      if (!Array.isArray(inventory)) {
        throw new Error('Inventory data is not an array');
      }
  
      // Ensure newData is an array
      const dataArray = Array.isArray(newData) ? newData : [newData];
  
      dataArray.forEach(item => {
        const existingItem = inventory.find(invItem => invItem['ITEM#'] === item['ITEM#']);
  
        if (existingItem) {
          // Update the existing item with new data
          if (!existingItem.priceHistory) {
            existingItem.priceHistory = [];
          }
          existingItem.priceHistory.push({
            price: existingItem.PRICE,
            date: existingItem.lastUpdated,
          });
  
          existingItem.PRICE = item.PRICE;
          existingItem.ORDERED = item.ORDERED;
          existingItem.STATUS = item.STATUS;
          existingItem.lastUpdated = new Date().toISOString();
        } else {
          // Add the new item to the inventory
          item.priceHistory = [];
          item.lastUpdated = new Date().toISOString();
          inventory.push(item);
        }
      });
  
      // Save the updated inventory back to the file
      fs.writeFileSync(inventoryFile, JSON.stringify(inventory, null, 2), 'utf-8');
      logger.info('Inventory updated successfully.');
    } catch (error) {
      logger.error(`Failed to update inventory: ${error.message}`);
      throw error;
    }
  }
  
// Watch the output folder for new .txt files (optional)
const watcher = chokidar.watch(OUTPUT_FOLDER, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 }
});

watcher.on('add', async filePath => {
    if (path.extname(filePath) === '.txt') {
        logger.info(`Detected new file: ${filePath}`);
        try {
            const fileData = await fs.promises.readFile(filePath, 'utf8');
            const jsonData = mapTextToJSON(fileData);
            updateInventory(jsonData);
            await saveDataToJSONFile(jsonData, JSON_FILE);

            // Move the processed file to the archive folder
            const archivedFile = path.join(ARCHIVE_FOLDER, path.basename(filePath));
            await fs.promises.rename(filePath, archivedFile);
            logger.info(`File archived to: ${archivedFile}`);
        } catch (error) {
            logger.error(`Failed to process and archive file ${filePath}: ${error}`);
        }
    }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: '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',  // Move your key to an environment variable for security
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
      top_p: 1,
      max_tokens: 1024,
    });

    const botResponse = completion.choices[0]?.message?.content;
    if (!botResponse) return res.status(500).json({ error: 'No response from Lumin' });

    res.json({ content: botResponse });
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('Server running on port 5000');
    logger.info(`Server is running on port ${PORT}`);
});