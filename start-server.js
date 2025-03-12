/**
 * Start Server Script for X-Seller-8
 * 
 * This script launches both the backend API server and any necessary processing
 * services for the inventory management system.
 */

const { spawn } = require('child_process');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Settings
const API_PORT = process.env.API_PORT || 5050;  // Changed from 5000
const FRONTEND_PORT = process.env.FRONTEND_PORT || 5051;  // Changed from 5001
const STORAGE_PATH = path.join(__dirname, 'storage');
const UPLOADS_PATH = path.join(STORAGE_PATH, 'uploads');
const OUTPUT_PATH = path.join(STORAGE_PATH, 'processed');

// Ensure storage directories exist
[STORAGE_PATH, UPLOADS_PATH, OUTPUT_PATH].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

/**
 * Start the backend API server
 */
function startAPIServer() {
    const app = express();
    
    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Configure multer for file uploads
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, UPLOADS_PATH);
        },
        filename: (req, file, cb) => {
            // Create unique filename with original extension
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        }
    });
    
    const upload = multer({ 
        storage: storage,
        limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
    });
    
    // Serve static files from output directory
    app.use('/outputs', express.static(OUTPUT_PATH));
    
    // API Endpoints
    
    // Get current active month
    app.get('/api/month/current', (req, res) => {
        const pythonProcess = spawn('python', [
            '-c', 
            'from modules.database_manager import get_db_instance; ' +
            'import json; ' +
            'db = get_db_instance(); ' +
            'active_month = db.get_active_month(); ' +
            'print(json.dumps(active_month)); ' +
            'db.close()'
        ]);
        
        let result = '';
        
        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python stderr: ${data}`);
        });
        
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python process exited with code ${code}`);
                return res.status(500).json({ success: false, error: 'Failed to get active month' });
            }
            
            try {
                const activeMonth = JSON.parse(result);
                return res.json({ success: true, month: activeMonth });
            } catch (error) {
                console.error('Error parsing Python output:', error);
                return res.status(500).json({ success: false, error: 'Failed to parse month data' });
            }
        });
    });
    
    // Start a new month
    app.post('/api/month/new', (req, res) => {
        const pythonProcess = spawn('python', [
            '-c', 
            'from modules.database_manager import get_db_instance; ' +
            'import json; ' +
            'db = get_db_instance(); ' +
            'new_month = db.start_new_month(); ' +
            'print(json.dumps(new_month)); ' +
            'db.close()'
        ]);
        
        let result = '';
        
        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python stderr: ${data}`);
        });
        
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python process exited with code ${code}`);
                return res.status(500).json({ success: false, error: 'Failed to start new month' });
            }
            
            try {
                const newMonth = JSON.parse(result);
                return res.json({ success: true, month: newMonth });
            } catch (error) {
                console.error('Error parsing Python output:', error);
                return res.status(500).json({ success: false, error: 'Failed to parse month data' });
            }
        });
    });
    
    // Get all months
    app.get('/api/months', (req, res) => {
        const pythonProcess = spawn('python', [
            '-c', 
            'from modules.database_manager import get_db_instance; ' +
            'import json; ' +
            'db = get_db_instance(); ' +
            'months = db.get_all_months(); ' +
            'print(json.dumps(months)); ' +
            'db.close()'
        ]);
        
        let result = '';
        
        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python stderr: ${data}`);
        });
        
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python process exited with code ${code}`);
                return res.status(500).json({ success: false, error: 'Failed to get months' });
            }
            
            try {
                const months = JSON.parse(result);
                return res.json({ success: true, months: months });
            } catch (error) {
                console.error('Error parsing Python output:', error);
                return res.status(500).json({ success: false, error: 'Failed to parse months data' });
            }
        });
    });
    
    // Get inventory for current month or specific month/category
    app.get('/api/inventory/:category?', (req, res) => {
        const category = req.params.category;
        const monthId = req.query.monthId; // Optional month ID
        
        let pythonCommand = 
            'from modules.database_manager import get_db_instance; ' +
            'import json; ' +
            'db = get_db_instance(); ';
        
        if (category && category !== 'all') {
            // Get specific category
            pythonCommand += `inventory = db.get_inventory_by_month(${monthId || 'None'}, "${category}"); `;
        } else {
            // Get all inventory
            pythonCommand += `inventory = db.get_inventory_by_month(${monthId || 'None'}); `;
        }
        
        pythonCommand += 'print(json.dumps(inventory)); db.close()';
        
        const pythonProcess = spawn('python', ['-c', pythonCommand]);
        
        let result = '';
        
        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python stderr: ${data}`);
        });
        
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python process exited with code ${code}`);
                return res.status(500).json({ success: false, error: 'Failed to get inventory' });
            }
            
            try {
                const items = JSON.parse(result);
                return res.json({ success: true, items: items });
            } catch (error) {
                console.error('Error parsing Python output:', error);
                return res.status(500).json({ success: false, error: 'Failed to parse inventory data' });
            }
        });
    });
    
    // Get inventory summary
    app.get('/api/inventory/summary/:monthId?', (req, res) => {
        const monthId = req.params.monthId;
        
        const pythonCommand = 
            'from modules.database_manager import get_db_instance; ' +
            'import json; ' +
            'db = get_db_instance(); ' +
            `summary = db.get_inventory_summary(${monthId || 'None'}); ` +
            'print(json.dumps(summary)); ' +
            'db.close()';
        
        const pythonProcess = spawn('python', ['-c', pythonCommand]);
        
        let result = '';
        
        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python stderr: ${data}`);
        });
        
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python process exited with code ${code}`);
                return res.status(500).json({ success: false, error: 'Failed to get inventory summary' });
            }
            
            try {
                const summary = JSON.parse(result);
                return res.json({ success: true, summary: summary });
            } catch (error) {
                console.error('Error parsing Python output:', error);
                return res.status(500).json({ success: false, error: 'Failed to parse summary data' });
            }
        });
    });
    
    // Export inventory to JSON and download
    app.get('/api/export/inventory/:category?', (req, res) => {
        const category = req.params.category === 'all' ? null : req.params.category;
        const monthId = req.query.monthId; // Optional month ID
        
        // Create a unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const categoryStr = category ? `_${category}` : '';
        const outputFilename = `inventory${categoryStr}_${timestamp}.json`;
        const outputPath = path.join(OUTPUT_PATH, outputFilename);
        
        const pythonCommand = 
            'from modules.database_manager import get_db_instance; ' +
            'import json; ' +
            'db = get_db_instance(); ' +
            `export_path = db.export_inventory_to_json(${monthId || 'None'}, ${category ? `"${category}"` : 'None'}, "${outputPath}"); ` +
            'print(json.dumps({"file": export_path})); ' +
            'db.close()';
        
        const pythonProcess = spawn('python', ['-c', pythonCommand]);
        
        let result = '';
        
        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python stderr: ${data}`);
        });
        
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python process exited with code ${code}`);
                return res.status(500).json({ success: false, error: 'Failed to export inventory' });
            }
            
            try {
                const data = JSON.parse(result);
                
                if (data.file) {
                    // Return the URL to download the file
                    const downloadUrl = `/outputs/${path.basename(data.file)}`;
                    return res.json({ 
                        success: true, 
                        file: downloadUrl,
                        filename: path.basename(data.file)
                    });
                } else {
                    return res.status(500).json({ success: false, error: 'No export file generated' });
                }
            } catch (error) {
                console.error('Error parsing Python output:', error);
                return res.status(500).json({ success: false, error: 'Failed to parse export data' });
            }
        });
    });
    
    // Handle file uploads and process them
    app.post('/api/upload', upload.array('files', 5), (req, res) => {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files uploaded' });
        }
        
        const results = [];
        let completedFiles = 0;
        
        // Process each file
        req.files.forEach(file => {
            const filePath = file.path;
            const pythonProcess = spawn('python', ['simple_scanner.py', filePath]);
            
            let output = '';
            let errorOutput = '';
            
            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
                console.error(`Processing error for ${file.originalname}: ${data}`);
            });
            
            pythonProcess.on('close', (code) => {
                completedFiles++;
                
                if (code === 0) {
                    // Extract output file path from the scanner output
                    const outputMatch = output.match(/saved to (.+\.json)/);
                    const outputFile = outputMatch ? outputMatch[1] : null;
                    
                    results.push({
                        originalname: file.originalname,
                        filename: file.filename,
                        path: filePath,
                        processed: true,
                        output_file: outputFile,
                        status_key: `file_${file.filename}`
                    });
                } else {
                    results.push({
                        originalname: file.originalname,
                        filename: file.filename,
                        path: filePath,
                        processed: false,
                        error: errorOutput,
                        status_key: `file_${file.filename}`
                    });
                }
                
                // If all files are processed, send the response
                if (completedFiles === req.files.length) {
                    res.json({
                        success: true,
                        message: `Processed ${completedFiles} files`,
                        results: results
                    });
                }
            });
        });
    });
    
    // Get processing status
    app.get('/api/status/:key', (req, res) => {
        const statusKey = req.params.key;
        
        // In a real app, this would check a database or cache for the status
        // For this example, we'll just return a dummy status
        res.json({
            status: "complete",
            progress: 100,
            key: statusKey
        });
    });
    
    // Catch-all for API routes not found
    app.use('/api', (req, res) => {
        res.status(404).json({ success: false, error: 'API endpoint not found' });
    });
    
    // Start the server
    const apiServer = app.listen(API_PORT, () => {
        console.log(`API server running on http://localhost:${API_PORT}`);
    });
    
    return apiServer;
}

/**
 * Serve the frontend static files
 */
function serveFrontend() {
    const app = express();
    
    // Serve static files from frontend/public
    app.use(express.static(path.join(__dirname, 'frontend/public')));
    
    // Proxy API requests to the API server
    app.use('/api', createProxyMiddleware({ 
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true
    }));
    
    // Serve outputs
    app.use('/outputs', createProxyMiddleware({ 
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true
    }));
    
    // For all other routes, serve the index.html
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend/public/index.html'));
    });
    
    // Start the server
    const frontendServer = app.listen(FRONTEND_PORT, () => {
        console.log(`Frontend server running on http://localhost:${FRONTEND_PORT}`);
    });
    
    return frontendServer;
}

/**
 * Main function to start all necessary services
 */
function startAllServices() {
    console.log('Starting X-Seller-8 Inventory Management System...');
    
    // Initialize the database
    const initDb = spawn('python', [
        '-c',
        'from modules.database_manager import get_db_instance; db = get_db_instance(); print("Database initialized"); db.close()'
    ]);
    
    initDb.stdout.on('data', (data) => {
        console.log(`Database initialization: ${data}`);
    });
    
    initDb.stderr.on('data', (data) => {
        console.error(`Database error: ${data}`);
    });
    
    initDb.on('close', (code) => {
        if (code === 0) {
            console.log('Database initialized successfully');
        } else {
            console.error(`Database initialization failed with code ${code}`);
        }
    });
    
    // Start API server
    const apiServer = startAPIServer();
    
    // Serve frontend
    const frontendServer = serveFrontend();
    
    // Handle graceful shutdown
    const shutdown = () => {
        console.log('Shutting down servers...');
        apiServer.close(() => {
            console.log('API server closed');
            frontendServer.close(() => {
                console.log('Frontend server closed');
                process.exit(0);
            });
        });
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    // Open the application in the default browser
    console.log('\nX-Seller-8 is now running!');
    console.log(`- Frontend: http://localhost:${FRONTEND_PORT}`);
    console.log(`- API: http://localhost:${API_PORT}/api`);
    console.log('\nPress Ctrl+C to stop the servers.\n');
}

// Start all services when this script is run directly
if (require.main === module) {
    startAllServices();
}

module.exports = { startAPIServer, serveFrontend, startAllServices };
