const fs = require('fs-extra');
const path = require('path');
const winston = require('winston');

const inventoryFile = path.join(__dirname, 'inventory_data.json');

// Setup Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(__dirname, 'logs', 'app.log') })
  ]
});

// Function to update inventory
const updateInventory = async (newData) => {
  // Load existing inventory data
  let inventory = {};
  if (fs.existsSync(inventoryFile)) {
    inventory = await fs.readJSON(inventoryFile);
  }

  // Process new data and update inventory
  newData.forEach((item) => {
    const { brand, packSize, price, ordered, delivered } = item;
    const key = `${brand}-${packSize}`.toLowerCase();

    // Check if the item already exists in the inventory
    if (inventory[key]) {
      // Update quantities
      inventory[key].ordered += parseInt(ordered, 10);
      inventory[key].delivered += parseInt(delivered, 10);

      // Adjust price if it has changed
      if (price && price !== inventory[key].price) {
        logger.info(`Price update for ${key}: ${inventory[key].price} -> ${price}`);
        inventory[key].price = price;
      }
    } else {
      // Add new item to inventory
      inventory[key] = {
        brand,
        packSize,
        price: parseFloat(price),
        ordered: parseInt(ordered, 10),
        delivered: parseInt(delivered, 10),
      };
    }
  });

  // Save updated inventory
  await fs.writeJSON(inventoryFile, inventory, { spaces: 2 });
  logger.info(`Inventory updated successfully.`);
};

module.exports = { updateInventory };
