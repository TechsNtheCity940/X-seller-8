const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');

// Path where the Excel file is stored
const filePath = path.join(__dirname, 'output', 'inventory.xlsx');

// Function to load and update Excel file
function updateExcelFile(newData) {
  let workbook;
  let worksheet;

  // Check if the file already exists
  if (fs.existsSync(filePath)) {
    // Load the existing workbook and worksheet
    workbook = xlsx.readFile(filePath);
    worksheet = workbook.Sheets['Inventory'];
  } else {
    // Create a new workbook and worksheet if not exists
    workbook = xlsx.utils.book_new();
    worksheet = xlsx.utils.aoa_to_sheet([['Item', 'Brand', 'Pack Size', 'Price', 'Ordered', 'Status']]);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Inventory');
  }

  // Convert worksheet to JSON to make it easier to work with
  let inventoryData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  const headers = inventoryData[0]; // First row is headers
  const dataRows = inventoryData.slice(1); // Rest are data rows

  // Map the data to make it easier to update
  let inventoryMap = new Map();
  dataRows.forEach((row) => {
    const [item, brand, packSize, price, ordered, status] = row;
    inventoryMap.set(item, { brand, packSize, price, ordered, status });
  });

  // Update inventory with new data
  newData.forEach((item) => {
    if (inventoryMap.has(item.itemName)) {
      // Item exists, update the quantity and price if needed
      const existing = inventoryMap.get(item.itemName);
      const updatedPrice = item.price !== existing.price ? item.price : existing.price;
      const updatedOrdered = Number(existing.ordered) + Number(item.ordered);
      inventoryMap.set(item.itemName, {
        brand: existing.brand,
        packSize: existing.packSize,
        price: updatedPrice,
        ordered: updatedOrdered,
        status: item.status || existing.status,
      });
    } else {
      // New item, add it to the inventory
      inventoryMap.set(item.itemName, {
        brand: item.brand,
        packSize: item.packSize,
        price: item.price,
        ordered: item.ordered,
        status: item.status,
      });
    }
  });

  // Convert map back to array format
  const updatedData = [[...headers], ...Array.from(inventoryMap, ([itemName, details]) => [
    itemName,
    details.brand,
    details.packSize,
    details.price,
    details.ordered,
    details.status,
  ])];

  // Update the worksheet with the updated data
  worksheet = xlsx.utils.aoa_to_sheet(updatedData);
  workbook.Sheets['Inventory'] = worksheet;

  // Write the updated workbook back to file
  xlsx.writeFile(workbook, filePath);

  return filePath;
}

module.exports = updateExcelFile;
