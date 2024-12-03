const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const WebSocket = require('ws');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Test configuration
const config = {
  baseURL: 'http://localhost:5000',
  testFiles: {
    pdf: 'test_files/sample_invoice.pdf',
    image: 'test_files/sample_receipt.jpg',
    excel: 'test_files/inventory.xlsx'
  },
  outputDir: 'test_results'
};

// Utility function to create test directories
async function setupTestEnvironment() {
  try {
    // Create test directories if they don't exist
    await fs.ensureDir(path.join(__dirname, 'test_files'));
    await fs.ensureDir(path.join(__dirname, 'test_results'));
    
    console.log('✓ Test environment setup complete');
  } catch (error) {
    console.error('✗ Failed to setup test environment:', error);
    throw error;
  }
}

// Test file upload functionality
async function testFileUpload() {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(path.join(__dirname, config.testFiles.image)));
    
    const response = await axios.post(`${config.baseURL}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    console.log('✓ File upload test passed');
    return response.data;
  } catch (error) {
    console.error('✗ File upload test failed:', error.message);
    throw error;
  }
}

// Test OCR functionality
async function testOCR() {
  try {
    const imagePath = path.join(__dirname, config.testFiles.image);
    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath));
    
    const response = await axios.post(`${config.baseURL}/process`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    console.log('✓ OCR test passed');
    return response.data;
  } catch (error) {
    console.error('✗ OCR test failed:', error.message);
    throw error;
  }
}

// Test Excel processing
async function testExcelProcessing() {
  try {
    const excelPath = path.join(__dirname, config.testFiles.excel);
    const formData = new FormData();
    formData.append('file', fs.createReadStream(excelPath));
    
    const response = await axios.post(`${config.baseURL}/process-excel`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    console.log('✓ Excel processing test passed');
    return response.data;
  } catch (error) {
    console.error('✗ Excel processing test failed:', error.message);
    throw error;
  }
}

// Test WebSocket connection
async function testWebSocket() {
  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket('ws://localhost:5000/live-updates');
      
      ws.on('open', () => {
        console.log('✓ WebSocket connection test passed');
        ws.close();
        resolve();
      });
      
      ws.on('error', (error) => {
        console.error('✗ WebSocket connection test failed:', error.message);
        reject(error);
      });
    } catch (error) {
      console.error('✗ WebSocket connection test failed:', error.message);
      reject(error);
    }
  });
}

// Test data processing pipeline
async function testDataProcessing() {
  try {
    // Test file upload
    const uploadResult = await testFileUpload();
    console.log('Upload result:', uploadResult);

    // Test OCR
    const ocrResult = await testOCR();
    console.log('OCR result:', ocrResult);

    // Test Excel processing
    const excelResult = await testExcelProcessing();
    console.log('Excel processing result:', excelResult);

    // Test WebSocket
    await testWebSocket();

    console.log('✓ All tests passed successfully');
  } catch (error) {
    console.error('✗ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run all tests
async function runTests() {
  try {
    console.log('Starting system tests...');
    await setupTestEnvironment();
    await testDataProcessing();
    console.log('All tests completed successfully');
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Execute tests
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testFileUpload,
  testOCR,
  testExcelProcessing,
  testWebSocket
}; 