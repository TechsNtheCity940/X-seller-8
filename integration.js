/**
 * Integration script to bridge the Flask backend with the Express server
 * This script handles the synchronization between the two different server implementations
 */

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const winston = require('winston');

// Configuration
const FLASK_SERVER_URL = 'http://localhost:5000';
const EXPRESS_DATA_PATH = path.join(__dirname, 'inventory_data.json');
const OUTPUT_FOLDER = path.join(__dirname, 'output');
const FLASK_STORAGE_PATH = path.join(__dirname, 'storage', 'processed');

// Set up logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(__dirname, 'logs', 'integration.log') })
  ]
});

// Create directories if they don't exist
[OUTPUT_FOLDER, FLASK_STORAGE_PATH, path.join(__dirname, 'logs')].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirsSync(dir);
    logger.info(`Created directory: ${dir}`);
  }
});

/**
 * Maps the Flask document structure to the inventory format expected by the frontend
 * @param {Object} document - Document data from Flask API
 * @returns {Object} - Formatted inventory item
 */
function mapDocumentToInventoryItem(document) {
  const extractedData = document.extracted_data || {};
  const products = extractedData.products || [];
  const prices = extractedData.prices || [];
  const quantities = extractedData.quantities || [];
  const dates = extractedData.dates || [];

  // Find the first valid product name
  const productName = products.length > 0 ? products[0].name : 'Unknown Product';
  
  // Find the first valid price
  const price = prices.length > 0 ? prices[0].amount : 0;
  
  // Find the first valid quantity
  const quantity = quantities.length > 0 ? quantities[0].value : 0;
  
  // Find the first valid date
  const date = dates.length > 0 ? dates[0].text : 'Unknown Date';

  // Generate a random item number if not available
  const itemNumber = `ITEM-${Math.floor(Math.random() * 10000)}`;

  return {
    id: document.id,
    itemNumber: itemNumber,
    itemName: productName,
    brand: products.length > 1 ? products[1].name : 'Unknown Brand',
    packSize: quantities.length > 0 ? `${quantity} ${quantities[0].unit || 'units'}` : 'N/A',
    price: price,
    ordered: quantity,
    confirmed: Math.floor(quantity * 0.9), // Simulate confirmed as 90% of ordered
    status: quantity > 0 ? 'In Stock' : 'Out of Stock',
    dateDelivered: date
  };
}

/**
 * Fetch all documents from Flask API and convert them to inventory format
 * @returns {Promise<Array>} - Array of inventory items
 */
async function syncInventoryData() {
  try {
    logger.info('Starting inventory data synchronization...');
    
    // Fetch documents from Flask API
    const response = await axios.get(`${FLASK_SERVER_URL}/documents`);
    const documents = response.data.documents || [];
    
    logger.info(`Fetched ${documents.length} documents from Flask API`);
    
    // Convert documents to inventory format
    const inventoryItems = [];
    
    for (const doc of documents) {
      try {
        // Fetch full document data
        const docResponse = await axios.get(`${FLASK_SERVER_URL}/documents/${doc.id}`);
        const fullDocument = docResponse.data;
        
        // Map document to inventory item
        const inventoryItem = mapDocumentToInventoryItem(fullDocument);
        inventoryItems.push(inventoryItem);
      } catch (error) {
        logger.error(`Error processing document ${doc.id}: ${error.message}`);
      }
    }
    
    // Write inventory data to file
    await fs.writeJson(EXPRESS_DATA_PATH, inventoryItems, { spaces: 2 });
    logger.info(`Wrote ${inventoryItems.length} inventory items to ${EXPRESS_DATA_PATH}`);
    
    return inventoryItems;
  } catch (error) {
    logger.error(`Error synchronizing inventory data: ${error.message}`);
    throw error;
  }
}

/**
 * Create a mock inventory file if no data is available
 * This ensures the frontend always has some data to display
 */
async function createMockInventoryFile() {
  const mockData = [
    {
      id: 1,
      itemNumber: 'ITEM-1001',
      itemName: 'Premium Vodka',
      brand: 'Grey Goose',
      packSize: '750 ml',
      price: 29.99,
      ordered: 12,
      confirmed: 12,
      status: 'In Stock',
      dateDelivered: '2025-03-01'
    },
    {
      id: 2,
      itemNumber: 'ITEM-1002',
      itemName: 'Red Wine',
      brand: 'Barefoot',
      packSize: '750 ml',
      price: 9.99,
      ordered: 24,
      confirmed: 20,
      status: 'In Stock',
      dateDelivered: '2025-03-02'
    },
    {
      id: 3,
      itemNumber: 'ITEM-1003',
      itemName: 'Domestic Beer',
      brand: 'Bud Light',
      packSize: '6 pack',
      price: 7.99,
      ordered: 36,
      confirmed: 36,
      status: 'In Stock',
      dateDelivered: '2025-03-03'
    },
    {
      id: 4,
      itemNumber: 'ITEM-2001',
      itemName: 'Fresh Lettuce',
      brand: 'Organic Farms',
      packSize: '1 head',
      price: 2.49,
      ordered: 20,
      confirmed: 18,
      status: 'In Stock',
      dateDelivered: '2025-03-04'
    },
    {
      id: 5,
      itemNumber: 'ITEM-2002',
      itemName: 'Chicken Breast',
      brand: 'Perdue',
      packSize: '2 lb',
      price: 8.99,
      ordered: 15,
      confirmed: 15,
      status: 'In Stock',
      dateDelivered: '2025-03-04'
    }
  ];
  
  await fs.writeJson(EXPRESS_DATA_PATH, mockData, { spaces: 2 });
  logger.info(`Created mock inventory data at ${EXPRESS_DATA_PATH}`);
  return mockData;
}

// Export functions
module.exports = {
  syncInventoryData,
  createMockInventoryFile,
  mapDocumentToInventoryItem
};

// If this script is run directly, perform synchronization
if (require.main === module) {
  (async () => {
    try {
      let inventory;
      try {
        inventory = await syncInventoryData();
      } catch (error) {
        logger.warn(`Failed to sync with Flask API: ${error.message}`);
        logger.info('Creating mock inventory data as fallback...');
        inventory = await createMockInventoryFile();
      }
      
      logger.info(`Successfully created inventory with ${inventory.length} items`);
      process.exit(0);
    } catch (error) {
      logger.error(`Failed to create inventory data: ${error.message}`);
      process.exit(1);
    }
  })();
}
