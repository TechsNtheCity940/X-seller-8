const { processFiles, processFile } = require('./Enhanced_fileProcessor');
const path = require('path');

// Define input and output folders
const inputFolder = path.join(__dirname, 'uploads');
const outputFolder = path.join(__dirname, 'output');

// Test the processor with a specific month
async function testProcessor() {
  try {
    console.log(`Starting test with input folder: ${inputFolder}`);
    console.log(`Output folder: ${outputFolder}`);
    
    // Process all files in the uploads folder
    const results = await processFiles(inputFolder, outputFolder, 'March2025');
    
    console.log('Processing completed!');
    console.log(`Total files: ${results.total}`);
    console.log(`Successfully processed: ${results.processed}`);
    console.log(`Failed: ${results.failed}`);
    
    // Log details of each processed file
    console.log('\nProcessed files:');
    results.results.forEach((result, index) => {
      if (result.success) {
        console.log(`${index + 1}. ${path.basename(result.filePath)}: ${result.items} items extracted`);
      } else {
        console.log(`${index + 1}. ${path.basename(result.filePath)}: FAILED - ${result.error}`);
      }
    });
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the test
testProcessor();
