const fs = require('fs');
const path = require('path');

// Function to extract item name, price, and quantity
function parseLine(line) {
  // Regular expression for matching numeric and text sections
  const numberPattern = /\b\d+(\.\d{2})?\b/g;  // Matches whole numbers and decimal prices
  const wordPattern = /[A-Za-z\s\-'()]+/;      // Matches item names between numbers

  // Split the line into segments using numbers as boundaries
  const segments = line.split(numberPattern).filter(segment => segment && segment.trim() !== '');

  // Extract numbers from the line to check positions
  const numbers = line.match(numberPattern);

  // Item name should be the first non-empty text between numeric sections
  let itemName = '';
  if (segments.length > 0 && segments[0]) {
      itemName = segments[0].trim();
  } else {
      return null; // Return null if no valid segments found
  }

  // Extract price (usually the first number matching the format 12.34)
  const priceMatch = numbers ? numbers.find(num => num.includes('.')) : null;
  const price = priceMatch ? parseFloat(priceMatch) : null;

  // Extract the last number as quantity (if reasonable)
  const quantity = numbers && numbers.length > 1 ? parseInt(numbers[numbers.length - 1], 10) : null;

  // Validate that we have extracted the necessary fields
  if (itemName && price !== null && quantity !== null) {
      return {
          itemName,
          price,
          quantity,
      };
  }
  return null; // Return null if parsing fails
}

// Main function to process the input file and create structured output
function processRawText(inputFilePath, outputFilePath) {
    try {
        // Read the input file
        const rawData = fs.readFileSync(inputFilePath, 'utf-8');
        const lines = rawData.split('\n');

        // Process each line and extract data
        const structuredData = [];
        lines.forEach(line => {
            const parsedData = parseLine(line);
            if (parsedData) {
                structuredData.push(parsedData);
            }
        });

        // Write structured data to the output file
        const outputLines = structuredData.map(data => 
            `${data.itemName}\t${data.price.toFixed(2)}\t${data.quantity}`
        ).join('\n');
        fs.writeFileSync(outputFilePath, outputLines, 'utf-8');

        console.log('Structured data written to:', outputFilePath);
    } catch (error) {
        console.error('Error processing file:', error);
    }
}

// Paths to input and output files 
// Paths to input and output files
const inputFilePath = path.resolve(__dirname, 'D:/repogit/X-seLLer-8/backend/uploads/RawTextExtract.txt');
const outputFilePath = path.resolve(__dirname, 'D:/repogit/X-seLLer-8/backend/uploads/StructuredTableData.txt');

// Run the function
processRawText(inputFilePath, outputFilePath);
