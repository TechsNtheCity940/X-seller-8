const fs = require('fs-extra');
const path = require('path');

// Create test directories if they don't exist
const testDirs = [
  'test_files',
  'test_results',
  'uploads'
];

testDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Copy test files if they exist
const testFiles = [
  { src: '../uploads/BEK.png', dest: '../test_files/BEK.png' }
];

testFiles.forEach(file => {
  const srcPath = path.join(__dirname, file.src);
  const destPath = path.join(__dirname, file.dest);
  if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
    fs.copyFileSync(srcPath, destPath);
  }
});

// Mock external dependencies
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue(undefined),
    loadLanguage: jest.fn().mockResolvedValue(undefined),
    initialize: jest.fn().mockResolvedValue(undefined),
    recognize: jest.fn().mockResolvedValue({
      data: {
        text: `Invoice# 66702357
        Toby Keiths - Wwc -Tradi
        FOK799734
        10/04/2024
        93 items
        198 pieces
        $10,351.16
        april.courtney@traditionsspirits.com
        
        884043 Mustard Yellow Upside Down Heinz 18/12 OZ $31.77 2 0 Out of stock
        500401 Beef Brisket Choice Sel Noroll Packer 7/CATCH $4.34 1 0 Out of stock
        151772 Pasta Elbow Macaroni Bellacibo 2/10 LB $23.62 1 1 Filled`
      }
    }),
    terminate: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Global test timeout
jest.setTimeout(30000);

// Clean up function
afterAll(async () => {
  // Clean up test results directory
  const testResultsPath = path.join(__dirname, '..', 'test_results');
  if (fs.existsSync(testResultsPath)) {
    await fs.remove(testResultsPath);
  }
}); 