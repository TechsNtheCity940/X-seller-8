const { attemptOcr, saveTextToExcel } = require('../processors/imageProcessor');
const path = require('path');
const fs = require('fs-extra');

describe('BEK Invoice Image Processing Tests', () => {
  const testImagePath = path.join(__dirname, '../test_files/BEK.png');
  const outputExcelPath = path.join(__dirname, '../test_results/BEK_processed.xlsx');

  beforeAll(async () => {
    // Ensure test directories exist
    await fs.ensureDir(path.dirname(testImagePath));
    await fs.ensureDir(path.dirname(outputExcelPath));
    
    // Copy BEK.png to test directory if it exists in uploads
    const sourcePath = path.join(__dirname, '../uploads/BEK.png');
    if (fs.existsSync(sourcePath)) {
      await fs.copy(sourcePath, testImagePath);
    }
  });

  afterAll(async () => {
    // Cleanup test files
    await fs.remove(path.dirname(outputExcelPath));
  });

  test('should extract invoice header information', async () => {
    const extractedText = await attemptOcr(testImagePath);
    expect(extractedText).toBeTruthy();
    
    // Test invoice header details
    expect(extractedText).toContain('Invoice# 66702357');
    expect(extractedText).toContain('Toby Keiths - Wwc -Tradi');
    expect(extractedText).toContain('FOK799734');
    expect(extractedText).toContain('10/04/2024');
    expect(extractedText).toContain('93 items');
    expect(extractedText).toContain('198 pieces');
    expect(extractedText).toContain('$10,351.16');
    expect(extractedText).toContain('april.courtney@traditionsspirits.com');
  });

  test('should extract all product entries', async () => {
    const extractedText = await attemptOcr(testImagePath);
    
    // Test specific product entries from the image
    const expectedProducts = [
      {
        item: '884043',
        name: 'Mustard Yellow Upside Down',
        brand: 'Heinz',
        packSize: '18/12 OZ',
        price: '$31.77',
        ordered: '2',
        confirmed: '0',
        status: 'Out of stock'
      },
      {
        item: '500401',
        name: 'Beef Brisket Choice Sel Noroll',
        brand: 'Packer',
        packSize: '7/CATCH',
        price: '$4.34',
        ordered: '1',
        confirmed: '0',
        status: 'Out of stock'
      },
      {
        item: '151772',
        name: 'Pasta Elbow Macaroni',
        brand: 'Bellacibo',
        packSize: '2/10 LB',
        price: '$23.62',
        ordered: '1',
        confirmed: '1',
        status: 'Filled'
      },
      {
        item: '115593',
        name: 'Apron Dishwashing Clear 34x47',
        brand: 'John Ritzenthaler Company',
        packSize: '1/EA',
        price: '$7.96',
        ordered: '2',
        confirmed: '2',
        status: 'Filled'
      }
    ];

    expectedProducts.forEach(product => {
      expect(extractedText).toContain(product.item);
      expect(extractedText).toContain(product.name);
      expect(extractedText).toContain(product.brand);
      expect(extractedText).toContain(product.packSize);
      expect(extractedText).toContain(product.price);
      expect(extractedText).toContain(product.ordered);
      expect(extractedText).toContain(product.confirmed);
      expect(extractedText).toContain(product.status);
    });
  });

  test('should save extracted data to Excel with correct format', async () => {
    const extractedText = await attemptOcr(testImagePath);
    const deliveryDate = '10/04/2024';
    const invoiceTotal = '$10,351.16';

    await saveTextToExcel(extractedText, outputExcelPath, deliveryDate, invoiceTotal);
    
    // Verify Excel file was created
    expect(fs.existsSync(outputExcelPath)).toBe(true);

    // Read Excel file and verify contents
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(outputExcelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Verify data structure
    expect(data.length).toBeGreaterThan(0);
    const firstRow = data[0];
    expect(firstRow).toMatchObject({
      'Item#': '884043',
      'Item Name': 'Mustard Yellow Upside Down',
      'Brand': 'Heinz',
      'Pack Size': '18/12 OZ',
      'Price': 31.77,
      'Ordered': 2,
      'Confirmed': 0,
      'Status': 'Out of stock'
    });

    // Verify totals
    const lastRowIndex = worksheet['!ref'].split(':')[1].replace(/[A-Z]/g, '');
    const totalRow = data[data.length - 1];
    expect(totalRow).toHaveProperty('Invoice Total', 10351.16);
  });

  test('should handle image processing errors gracefully', async () => {
    // Test with corrupted image
    const corruptedImagePath = path.join(__dirname, '../test_files/corrupted.png');
    await fs.writeFile(corruptedImagePath, 'corrupted data');
    
    await expect(attemptOcr(corruptedImagePath)).rejects.toThrow();
    
    // Test with missing image
    const nonexistentImagePath = path.join(__dirname, '../test_files/nonexistent.png');
    await expect(attemptOcr(nonexistentImagePath)).rejects.toThrow();
  });

  test('should validate data consistency', async () => {
    const extractedText = await attemptOcr(testImagePath);
    
    // Verify total items count matches
    const itemCount = (extractedText.match(/\b\d{6}\b/g) || []).length; // Count 6-digit item numbers
    expect(itemCount).toBe(93); // From the invoice header

    // Verify total pieces count
    const piecesCount = extractedText.match(/198 pieces/);
    expect(piecesCount).toBeTruthy();

    // Verify price format consistency
    const pricePattern = /\$\d+\.\d{2}/g;
    const prices = extractedText.match(pricePattern);
    expect(prices).toBeTruthy();
    prices.forEach(price => {
      expect(price).toMatch(/^\$\d+\.\d{2}$/);
    });
  });
}); 