#!/usr/bin/env node
/**
 * Quick Start Script for X-Seller-8 Inventory Management System
 * 
 * This script provides an easy way to:
 * 1. Check dependencies
 * 2. Install required packages
 * 3. Set up the development environment
 * 4. Run the system
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Print banner
console.log(chalk.cyan('====================================================='));
console.log(chalk.cyan('      X-Seller-8 Inventory Management System'));
console.log(chalk.cyan('      Quick Start Configuration Tool'));
console.log(chalk.cyan('====================================================='));

// Check if directories exist and create them if they don't
function ensureDirectories() {
  console.log(chalk.yellow('\nChecking and creating required directories...'));
  
  const directories = [
    'logs',
    'output',
    'storage',
    'storage/uploads',
    'storage/processed',
    'backend/logs',
    'backend/output'
  ];
  
  directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(chalk.green(`Created directory: ${dir}`));
    } else {
      console.log(chalk.blue(`Directory exists: ${dir}`));
    }
  });
}

// Check Node.js dependencies
function checkNodeDependencies() {
  console.log(chalk.yellow('\nChecking Node.js dependencies...'));
  
  try {
    const packageJson = fs.readJsonSync('./package.json');
    const dependencies = Object.keys(packageJson.dependencies || {});
    
    console.log(chalk.blue(`Required dependencies (${dependencies.length}):`));
    console.log(chalk.blue(dependencies.join(', ')));
    
    console.log(chalk.yellow('\nRunning npm install to ensure all dependencies are installed...'));
    execSync('npm install', { stdio: 'inherit' });
    
    console.log(chalk.green('Node.js dependencies installed successfully.'));
  } catch (error) {
    console.error(chalk.red(`Error checking Node.js dependencies: ${error.message}`));
  }
}

// Check Python dependencies
function checkPythonDependencies() {
  console.log(chalk.yellow('\nChecking Python dependencies...'));
  
  try {
    // Check if Python is installed
    try {
      execSync('python --version', { stdio: 'pipe' });
      console.log(chalk.green('Python is installed.'));
    } catch (error) {
      console.error(chalk.red('Python is not installed or not in PATH. Please install Python and try again.'));
      return;
    }
    
    // Install dependencies from requirements.txt
    console.log(chalk.yellow('Installing Python dependencies from requirements.txt...'));
    execSync('python -m pip install -r requirements.txt', { stdio: 'inherit' });
    
    // Install spaCy model if needed
    console.log(chalk.yellow('Installing spaCy language model...'));
    execSync('python -m spacy download en_core_web_sm', { stdio: 'inherit' });
    
    console.log(chalk.green('Python dependencies installed successfully.'));
  } catch (error) {
    console.error(chalk.red(`Error installing Python dependencies: ${error.message}`));
  }
}

// Test document processing
function testDocumentProcessing(callback) {
  console.log(chalk.yellow('\nTesting document processing functionality...'));
  
  // Check if there are any sample documents to test with
  const testDocuments = [
    path.join(__dirname, 'backend/uploads/Invoices week ending 3.5.23.pdf'),
    path.join(__dirname, 'backend/uploads/BEK_improved.png'),
    path.join(__dirname, 'frontend/public/testfiles/sample_invoice.pdf')
  ];
  
  let foundTestDoc = null;
  for (const doc of testDocuments) {
    if (fs.existsSync(doc)) {
      foundTestDoc = doc;
      break;
    }
  }
  
  if (!foundTestDoc) {
    console.log(chalk.yellow('No sample documents found for testing. Skipping document processing test.'));
    callback();
    return;
  }
  
  console.log(chalk.blue(`Using sample document: ${foundTestDoc}`));
  console.log(chalk.yellow('Running document scanner test...'));
  
  const testProc = spawn('python', ['test_scanner.py', foundTestDoc], {
    stdio: 'inherit',
    env: { ...process.env, PYTHONPATH: __dirname }
  });
  
  testProc.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green('Document processing test completed successfully.'));
    } else {
      console.error(chalk.red(`Document processing test failed with code ${code}.`));
    }
    callback();
  });
}

// Main menu
function showMainMenu() {
  console.log(chalk.cyan('\nX-Seller-8 Quick Start Menu:'));
  console.log(chalk.white('1. Check and create required directories'));
  console.log(chalk.white('2. Install Node.js dependencies'));
  console.log(chalk.white('3. Install Python dependencies'));
  console.log(chalk.white('4. Test document processing'));
  console.log(chalk.white('5. Start the application'));
  console.log(chalk.white('6. Run all (1-5)'));
  console.log(chalk.white('0. Exit'));
  
  rl.question(chalk.yellow('\nSelect an option (0-6): '), (answer) => {
    switch (answer.trim()) {
      case '1':
        ensureDirectories();
        showMainMenu();
        break;
      case '2':
        checkNodeDependencies();
        showMainMenu();
        break;
      case '3':
        checkPythonDependencies();
        showMainMenu();
        break;
      case '4':
        testDocumentProcessing(() => showMainMenu());
        break;
      case '5':
        console.log(chalk.yellow('\nStarting the application...'));
        console.log(chalk.blue('Press Ctrl+C to stop the application and return to the menu.'));
        
        const startProc = spawn('node', ['start-server.js'], {
          stdio: 'inherit'
        });
        
        // This will effectively exit the quick-start script
        // The user will need to restart it after stopping the application
        break;
      case '6':
        console.log(chalk.yellow('\nRunning complete setup...'));
        ensureDirectories();
        checkNodeDependencies();
        checkPythonDependencies();
        testDocumentProcessing(() => {
          console.log(chalk.yellow('\nStarting the application...'));
          console.log(chalk.blue('Press Ctrl+C to stop the application and return to the menu.'));
          
          const startProc = spawn('node', ['start-server.js'], {
            stdio: 'inherit'
          });
        });
        break;
      case '0':
        console.log(chalk.green('\nExiting. Thank you for using X-Seller-8!'));
        rl.close();
        break;
      default:
        console.log(chalk.red('\nInvalid option. Please try again.'));
        showMainMenu();
        break;
    }
  });
}

// Start the quick-start process
showMainMenu();
