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
  
  // Redirect all requests to the frontend server, except for API requests
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
const requiredModules = ['express', 'http-proxy', 'fs-extra', 'uuid'];
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
          fs.readFile(path.join(__dirname, 'frontend/public', 'index.html'), (err, content) => {
            if (err) {
              res.writeHead(500);
              res.end('Error loading index.html');
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

// Set up proxies
const app = setupHttpProxy();
const server = app.listen(3000, () => {
  console.log(`
${colors.cyan}X-Seller-8 Multi-Store Inventory & Sales Management System is now running!${colors.reset}
- Frontend: http://localhost:${FRONTEND_PORT}
- API: http://localhost:${API_PORT}/api
${colors.magenta}Main access URL: http://localhost:3000${colors.reset}

${colors.green}Store Management:${colors.reset}
- Create stores: POST /api/stores
- List stores: GET /api/stores
- Select store: POST /api/stores/:id/activate
- Get active store: GET /api/stores/active

${colors.blue}Inventory Processing:${colors.reset}
- Upload and process documents: POST /api/process
- View processed files: GET /api/processed-files/:month?
- View inventory: GET /api/inventory
- Monthly organization: POST /api/start-new-month

${colors.magenta}Sales & Profitability:${colors.reset}
- Add sales data: POST /api/sales/:month
- View sales: GET /api/sales/:month
- Generate profit report: POST /api/reports/:month
- View profit reports: GET /api/reports

Each store has its own isolated data for inventory, sales, and profitability analysis.

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
