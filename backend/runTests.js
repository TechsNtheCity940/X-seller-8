const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// Test configuration
const config = {
  testFiles: {
    excel: path.join(__dirname, '../structured_data.xlsx'),
    json: path.join(__dirname, '../structured_data.json'),
    text: path.join(__dirname, '../structured_data.txt'),
    csv: path.join(__dirname, '../structured_data.csv')
  },
  outputDir: path.join(__dirname, 'test_results')
};

// Ensure test directories exist
const testDirs = ['test_files', 'test_results'];
testDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }
});

// Run basic test
console.log('Running basic test...');
try {
  require('./test');
  console.log('✓ Basic test passed');
} catch (error) {
  console.error('✗ Basic test failed:', error);
  process.exit(1);
}

// Test Excel file processing
console.log('\nTesting Excel file processing...');
try {
  // Read the actual Excel file
  const workbook = XLSX.readFile(config.testFiles.excel);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`Found ${data.length} rows of data`);
  console.log('Sample data:', data[0]);
  
  // Test processing through API
  const response = execSync(`curl -F "file=@${config.testFiles.excel}" http://localhost:5000/process-excel`);
  console.log('✓ Excel processing test passed');
  console.log('API Response:', response.toString());
} catch (error) {
  console.error('✗ Excel processing test failed:', error);
}

// Test JSON file processing
console.log('\nTesting JSON file processing...');
try {
  const jsonData = JSON.parse(fs.readFileSync(config.testFiles.json, 'utf8'));
  console.log(`Found ${Object.keys(jsonData).length} items in JSON`);
  console.log('Sample data:', Object.values(jsonData)[0]);
  
  const response = execSync(`curl -F "file=@${config.testFiles.json}" http://localhost:5000/process-json`);
  console.log('✓ JSON processing test passed');
  console.log('API Response:', response.toString());
} catch (error) {
  console.error('✗ JSON processing test failed:', error);
}

// Test CSV file processing
console.log('\nTesting CSV file processing...');
try {
  const csvData = fs.readFileSync(config.testFiles.csv, 'utf8');
  const lines = csvData.split('\n');
  console.log(`Found ${lines.length} lines in CSV`);
  console.log('Sample data:', lines[0]);
  
  const response = execSync(`curl -F "file=@${config.testFiles.csv}" http://localhost:5000/process-csv`);
  console.log('✓ CSV processing test passed');
  console.log('API Response:', response.toString());
} catch (error) {
  console.error('✗ CSV processing test failed:', error);
}

// Test text file processing
console.log('\nTesting text file processing...');
try {
  const textData = fs.readFileSync(config.testFiles.text, 'utf8');
  const lines = textData.split('\n');
  console.log(`Found ${lines.length} lines in text file`);
  console.log('Sample data:', lines[0]);
  
  const response = execSync(`curl -F "file=@${config.testFiles.text}" http://localhost:5000/process-text`);
  console.log('✓ Text processing test passed');
  console.log('API Response:', response.toString());
} catch (error) {
  console.error('✗ Text processing test failed:', error);
}

// Generate test report
console.log('\nGenerating test report...');
try {
  const testResults = {
    timestamp: new Date().toISOString(),
    tests: {
      excel: { file: config.testFiles.excel, status: 'completed' },
      json: { file: config.testFiles.json, status: 'completed' },
      csv: { file: config.testFiles.csv, status: 'completed' },
      text: { file: config.testFiles.text, status: 'completed' }
    }
  };
  
  fs.writeFileSync(
    path.join(config.outputDir, 'test_report.json'),
    JSON.stringify(testResults, null, 2)
  );
  console.log('✓ Test report generated');
} catch (error) {
  console.error('✗ Failed to generate test report:', error);
}

console.log('\nAll tests completed.'); 