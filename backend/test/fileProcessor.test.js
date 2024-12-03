const request = require('supertest');
const path = require('path');
const fs = require('fs-extra');
const app = require('../server');

describe('File Processing Tests', () => {
  beforeAll(async () => {
    // Ensure test directories exist
    await fs.ensureDir(path.join(__dirname, '../test_files'));
    await fs.ensureDir(path.join(__dirname, '../test_results'));
  });

  afterAll(async () => {
    // Clean up test files
    await fs.remove(path.join(__dirname, '../test_results'));
  });

  describe('File Upload', () => {
    test('should upload Excel file successfully', async () => {
      const response = await request(app)
        .post('/upload')
        .attach('file', path.join(__dirname, '../test_files/inventory.xlsx'));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'File uploaded successfully');
    });

    test('should reject invalid file types', async () => {
      const response = await request(app)
        .post('/upload')
        .attach('file', path.join(__dirname, '../test/fileProcessor.test.js'));

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Excel Processing', () => {
    test('should process Excel file and return structured data', async () => {
      const response = await request(app)
        .post('/process-excel')
        .attach('file', path.join(__dirname, '../test_files/inventory.xlsx'));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('OCR Processing', () => {
    test('should process image and extract text', async () => {
      // Create a test image with text
      const testImagePath = path.join(__dirname, '../test_files/test_image.png');
      // You would need to create a test image here
      
      const response = await request(app)
        .post('/process')
        .attach('file', testImagePath);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('text');
    });
  });

  describe('Live Updates', () => {
    test('should establish WebSocket connection', (done) => {
      const ws = new WebSocket('ws://localhost:5000/live-updates');
      
      ws.onopen = () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        done();
      };

      ws.onerror = (error) => {
        done(error);
      };
    });

    test('should receive updates through WebSocket', (done) => {
      const ws = new WebSocket('ws://localhost:5000/live-updates');
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        expect(data).toHaveProperty('type');
        expect(data).toHaveProperty('payload');
        ws.close();
        done();
      };

      ws.onopen = () => {
        // Trigger an update by uploading a file
        request(app)
          .post('/upload')
          .attach('file', path.join(__dirname, '../test_files/inventory.xlsx'))
          .end(() => {
            // Wait for WebSocket update
          });
      };
    });
  });

  describe('Error Handling', () => {
    test('should handle missing file gracefully', async () => {
      const response = await request(app)
        .post('/upload')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'No file uploaded');
    });

    test('should handle processing errors gracefully', async () => {
      const response = await request(app)
        .post('/process')
        .attach('file', path.join(__dirname, '../test_files/corrupted.xlsx'));

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 