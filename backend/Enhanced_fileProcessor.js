const fs = require('fs');
const path = require('path');

// Function to extract item name, price, ordered, and delivered amounts
function parseLine(line) {
    // Regular expressions
    const numberPattern = /\b\d+(\.\d{2})?\b/g; // Matches whole numbers and decimal prices
    const itemNamePattern = /\b[A-Z][a-z]+\b(?:\s[A-Z][a-z]+)*\b/g; // Matches capitalized words

    // Extract numbers and item names from the line
    const numbers = line.match(numberPattern);
    const itemNames = line.match(itemNamePattern);

    if (!numbers || !itemNames) {
        return null; // Return null if no valid data found
    }

    // Ensure the price format is either $XX.XX or $X.XX
    const price = numbers.find(num => /^\d{1,2}\.\d{2}$/.test(num));
    const formattedPrice = price ? parseFloat(price).toFixed(2) : null;

    // The last two numbers should be 'ordered' and 'delivered'
    const ordered = parseInt(numbers[numbers.length - 2], 10);
    const delivered = parseInt(numbers[numbers.length - 1], 10);

    // Handle "out of stock" case where delivered quantity should be zero
    const isOutOfStock = line.toLowerCase().includes('out of stock');
    const finalDelivered = isOutOfStock ? 0 : delivered;

    if (itemNames && formattedPrice && !isNaN(ordered) && !isNaN(finalDelivered)) {
        return {
            itemName: itemNames.join(' '),
            price: `$${formattedPrice}`,
            ordered,
            delivered: finalDelivered,
        };
    }

    return null; // Return null if parsing fails
}

// Main function to process all files in a folder
function processAllFilesInFolder(inputFolderPath, outputFolderPath) {
    try {
        // Ensure the output folder exists
        if (!fs.existsSync(outputFolderPath)) {
            fs.mkdirSync(outputFolderPath, { recursive: true });
        }

        // Read all files in the input folder
        const files = fs.readdirSync(inputFolderPath);

        files.forEach(file => {
            const inputFilePath = path.join(inputFolderPath, file);

            // Process only .txt files
            if (path.extname(file) === '.txt') {
                const outputFileName = `Structured_${path.basename(file, '.txt')}.txt`;
                const outputFilePath = path.join(outputFolderPath, outputFileName);

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
                    `${data.itemName}\t${data.price}\t${data.ordered}\t${data.delivered}`
                ).join('\n');
                fs.writeFileSync(outputFilePath, outputLines, 'utf-8');

                console.log(`Processed file: ${file} -> Output: ${outputFileName}`);
            }
        });

        console.log('All files processed successfully.');
    } catch (error) {
        console.error('Error processing files:', error);
    }
}

// Define input and output folder paths
const inputFolderPath = path.resolve(__dirname, 'F:/repogit/X-seLLer-8/frontend/public/outputs/');
const outputFolderPath = path.resolve(__dirname, 'F:/repogit/X-seLLer-8/backend/uploads/');

// Run the function
processAllFilesInFolder(inputFolderPath, outputFolderPath);
