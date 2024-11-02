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
const xlsx = require('xlsx');
// Initialize the express app
const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));  // Adjust the origin as needed

app.use(cors());
app.use(express.json());

const UPLOAD_FOLDER = ('D:/repogit/x-seller-8/frontend/public/uploads');
const OUTPUT_FOLDER = ('D:/repogit/x-seller-8/frontend/public/output');  // Adjusted path for portability
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

app.post('/process', upload.single('file'), (req, res) => {
  if (!req.file) {
    logger.error('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }

  const filePath = path.resolve(__dirname, req.file.path);

  logger.info('Starting processing chain...');
  // Step 1: Run pdfProcessor.py
  execFile('python', ['pdfProcessor.py', filePath, OUTPUT_FOLDER], (err, stdout, stderr) => {
    if (err) {
      logger.error(`Error in pdfProcessor.py: ${stderr}`);
      return res.status(500).send('Error in PDF processing.');
    }
    logger.info('pdfProcessor.py completed successfully.');

    // Step 2: Run fileProcessor.js
    execFile('node', ['fileProcessor.js', OUTPUT_FOLDER], (err, stdout, stderr) => {
      if (err) {
        logger.error(`Error in fileProcessor.js: ${stderr}`);
        return res.status(500).send('Error in file processing.');
      }
      logger.info('fileProcessor.js completed successfully.');

      // Step 3: Run Enhanced_fileProcessor.js
      execFile('node', ['Enhanced_fileProcessor.js', OUTPUT_FOLDER], (err, stdout, stderr) => {
        if (err) {
          logger.error(`Error in Enhanced_fileProcessor.js: ${stderr}`);
          return res.status(500).send('Error in enhanced file processing.');
        }
        logger.info('Enhanced_fileProcessor.js completed successfully.');

        // Step 4: Run App.py
        execFile('python', ['App.py', path.join(OUTPUT_FOLDER, 'RawTextExtract.txt')], (err, stdout, stderr) => {
          if (err) {
            logger.error(`Error in App.py: ${stderr}`);
            return res.status(500).send('Error in parsing App.py.');
          }
          logger.info('App.py completed successfully.');

          // Step 5: Run CleanRawText.py
          execFile('python', ['CleanRawText.py', path.join(OUTPUT_FOLDER, 'CapitalizedPhrases.txt')], (err, stdout, stderr) => {
            if (err) {
              logger.error(`Error in CleanRawText.py: ${stderr}`);
              return res.status(500).send('Error in cleaning raw text.');
            }
            logger.info('CleanRawText.py completed successfully.');

            // Step 6: Run priceMatch.py
            execFile('python', ['priceMatch.py'], (err, stdout, stderr) => {
              if (err) {
                logger.error(`Error in priceMatch.py: ${stderr}`);
                return res.status(500).send('Error in price matching.');
              }
              logger.info('priceMatch.py completed successfully.');
              res.send({ message: 'File processed and Excel generated successfully!', excelPath: EXCEL_FILE });
            });
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

// Serve static files in the public folder
app.use('/public', express.static(path.join(__dirname, 'frontend/public/output')));

app.get('/output/inventory.json', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'frontend/public/output/inventory.xlsx');
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    } else {
      return res.status(404).send({ error: 'Inventory data file not found' });
    }
  } catch (error) {
    logger.error(`Error reading Excel file: ${error.message}`);
    if (!res.headersSent) {
      return res.status(500).send({ error: 'Failed to process Excel file' });
    }
  }
});
  
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
    res.status(500).json({ error: 'Failed to get response from Lumin' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('Server running on port 5000');
    logger.info(`Server is running on port ${PORT}`);
});