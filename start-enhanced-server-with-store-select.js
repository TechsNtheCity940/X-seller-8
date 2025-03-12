const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

console.log(`${colors.cyan}Starting X-Seller-8 Multi-Store Inventory & Sales Management System...${colors.reset}`);

// Define ports
const API_PORT = 5050;
const FRONTEND_PORT = 5051;

// Function to start a process
function startProcess(name, command, args, options) {
  console.log(`${colors.blue}Starting ${name}...${colors.reset}`);
  
  const process = spawn(command, args, options);
  
  process.stdout.on('data', (data) => {
    console.log(`${colors.green}[${name}] ${colors.reset}${data.toString().trim()}`);
  });
  
  process.stderr.on('data', (data) => {
    // Only print if it's not a warning
    const output = data.toString().trim();
    if (!output.includes('ExperimentalWarning')) {
      console.error(`${colors.yellow}[${name} ERROR] ${colors.reset}${output}`);
    }
  });
  
  process.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`${colors.yellow}[${name}] Process exited with code ${code}${colors.reset}`);
    }
  });
  
  return process;
}

// Create proxies for API and frontend
const setupHttpProxy = () => {
  const httpProxy = require('http-proxy');
  const express = require('express');
  const app = express();
  
  // Create proxy server
  const apiProxy = httpProxy.createProxyServer();
  
  // Create custom middleware to redirect to store-select.html first
  app.use((req, res, next) => {
    if (req.url === '/' || req.url === '/index.html') {
      // Check if we need to redirect to store selection
      const redirectToStoreSelect = async () => {
        try {
          // Try to query active store from the API
          const response = await fetch(`http://localhost:${API_PORT}/api/stores/active`);
          const data = await response.json();
          
          // If no active store or error, redirect to store-select.html
          if (!response.ok || !data.success || !data.hasActiveStore) {
            console.log(`${colors.cyan}[PROXY] ${colors.reset}Redirecting to store selection page`);
            res.writeHead(302, { 'Location': '/store-select.html' });
            res.end();
            return;
          }
          
          // Continue to index if there's an active store
          next();
        } catch (error) {
          // If API is not available or errors, redirect to store-select.html
          console.log(`${colors.cyan}[PROXY] ${colors.reset}Redirecting to store selection page (API error)`);
          res.writeHead(302, { 'Location': '/store-select.html' });
          res.end();
        }
      };
      
      redirectToStoreSelect();
    } else {
      next();
    }
  });
  
  // Redirect all requests to the appropriate server
  app.all('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      console.log(`${colors.cyan}[PROXY] ${colors.reset}Routing ${req.method} ${req.path} to API server`);
      apiProxy.web(req, res, { target: `http://localhost:${API_PORT}` });
    } else {
      console.log(`${colors.cyan}[PROXY] ${colors.reset}Routing ${req.method} ${req.path} to Frontend server`);
      apiProxy.web(req, res, { target: `http://localhost:${FRONTEND_PORT}` });
    }
  });
  
  return app;
}

// Check if required node modules are installed
const requiredModules = ['express', 'http-proxy', 'fs-extra', 'uuid', 'node-fetch'];
let allModulesInstalled = true;

for (const module of requiredModules) {
  try {
    require.resolve(module);
  } catch (e) {
    console.error(`${colors.red}Required module "${module}" is not installed.${colors.reset}`);
    allModulesInstalled = false;
  }
}

if (!allModulesInstalled) {
  console.error(`${colors.red}Please install required modules with: npm install ${requiredModules.join(' ')}${colors.reset}`);
  process.exit(1);
}

// Ensure storage directory exists
const storageDir = path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) {
  console.log(`${colors.blue}Creating storage directory...${colors.reset}`);
  fs.mkdirSync(storageDir, { recursive: true });
  fs.mkdirSync(path.join(storageDir, 'stores'), { recursive: true });
}

// Get the correct form of the fetch function
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Start backend server (using our enhanced multi-store and sales version)
const backendServer = startProcess(
  'API',
  'node',
  ['backend/server_enhanced_with_stores_and_sales.js'],
  { 
    env: {
      ...process.env,
      PORT: API_PORT
    }
  }
);

// Start frontend server
const frontendServer = startProcess(
  'Frontend',
  'node',
  ['-e', `require('http').createServer((req, res) => {
    const fs = require('fs');
    const path = require('path');
    const url = require('url');
    
    let filePath = path.join(__dirname, 'frontend/public', req.url === '/' ? 'index.html' : req.url);
    
    // Handle directory access by serving index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    
    // Get file extension to determine content type
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    
    switch (extname) {
      case '.js': contentType = 'text/javascript'; break;
      case '.css': contentType = 'text/css'; break;
      case '.json': contentType = 'application/json'; break;
      case '.png': contentType = 'image/png'; break;
      case '.jpg': contentType = 'image/jpg'; break;
      case '.gif': contentType = 'image/gif'; break;
    }
    
    // Read file and serve
    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // Page not found
          fs.readFile(path.join(__dirname, 'frontend/public', 'store-select.html'), (err, content) => {
            if (err) {
              res.writeHead(500);
              res.end('Error loading store selection page');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(content, 'utf-8');
            }
          });
        } else {
          // Server error
          res.writeHead(500);
          res.end('Server Error: ' + err.code);
        }
      } else {
        // Success
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  }).listen(${FRONTEND_PORT}, () => console.log('Frontend server running on port ${FRONTEND_PORT}'))`],
  { 
    env: {
      ...process.env,
      PORT: FRONTEND_PORT
    }
  }
);

// Delay starting the proxy server to allow the API server to initialize
console.log(`${colors.yellow}Waiting for servers to initialize before starting proxy...${colors.reset}`);
setTimeout(() => {
  try {
    // Set up proxies
    const app = setupHttpProxy();
    const server = app.listen(3000, () => {
      console.log(`
${colors.cyan}X-Seller-8 Multi-Store Inventory & Sales Management System is now running!${colors.reset}
- Frontend: http://localhost:${FRONTEND_PORT}
- API: http://localhost:${API_PORT}/api
${colors.magenta}Main access URL: http://localhost:3000${colors.reset}

${colors.green}Initial Store Selection:${colors.reset}
The system will prompt you to select or create a store on first access.
Each store will have:
- Separate inventory tracking for food and alcohol
- Monthly cost and sales data
- Independent reporting

${colors.yellow}Key Features:${colors.reset}
- Multi-store management
- Separate food and alcohol inventories
- Monthly tracking of costs and sales
- Auto-updating inventory based on invoices
- Profit and loss reports

Press Ctrl+C to stop the servers.
`);
    });

    // Handle shutdown gracefully
    process.on('SIGINT', () => {
      console.log(`\n${colors.yellow}Shutting down servers...${colors.reset}`);
      
      backendServer.kill();
      frontendServer.kill();
      server.close(() => {
        console.log(`${colors.green}All servers closed.${colors.reset}`);
        process.exit(0);
      });
    });
  } catch (error) {
    console.error(`${colors.red}Error starting proxy server: ${error.message}${colors.reset}`);
    backendServer.kill();
    frontendServer.kill();
    process.exit(1);
  }
}, 2000); // Wait 2 seconds for servers to initialize
