const path = require('path');
require('dotenv').config();

const config = {
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 5000,
    host: process.env.HOST || 'localhost'
  },
  
  paths: {
    uploads: path.join(process.env.UPLOAD_DIR || 'uploads'),
    outputs: path.join(process.env.OUTPUT_DIR || 'outputs'),
    temp: path.join(process.env.TEMP_DIR || 'temp'),
    logs: path.join(__dirname, '..', 'logs')
  },

  processing: {
    pdf: {
      dpi: parseInt(process.env.PDF_DPI, 10) || 200,
      maxPages: parseInt(process.env.MAX_PAGES, 10) || 100,
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 50 * 1024 * 1024, // 50MB
      allowedExtensions: ['.pdf'],
      outputFormat: 'png'
    },
    ocr: {
      language: process.env.OCR_LANGUAGE || 'eng',
      tesseractPath: process.env.TESSERACT_PATH
    }
  },

  security: {
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  },

  monitoring: {
    enabled: process.env.ENABLE_MONITORING === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT, 10) || 9090
  }
};

// Validate critical configuration
const validateConfig = () => {
  const requiredPaths = ['uploads', 'outputs', 'temp', 'logs'];
  for (const dir of requiredPaths) {
    if (!config.paths[dir]) {
      throw new Error(`Required path not configured: ${dir}`);
    }
  }

  if (!config.processing.ocr.tesseractPath) {
    console.warn('Tesseract path not configured - OCR functionality may be limited');
  }
};

validateConfig();

module.exports = config; 