const fs = require('fs-extra');
const path = require('path');
const pdfParse = require('pdf-parse');
const tesseract = require('tesseract.js');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const docxParser = require('docx-parser');
const { promisify } = require('util');
const config = require('./config/config');
const { fileTypeFromBuffer } = require('file-type');
const sanitize = require('sanitize-filename');

const readFileAsync = promisify(fs.readFile);

// Set up Winston logger
const winston = require('winston');
const logger = require('./utils/logger')('textExtract');

class FileProcessingError extends Error {
    constructor(message, type) {
        super(message);
        this.name = 'FileProcessingError';
        this.type = type;
    }
}

class TextExtractor {
    constructor() {
        this.supportedTypes = new Set(config.security.allowedFileTypes);
    }

    async validateFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new FileProcessingError('File does not exist', 'NOT_FOUND');
        }

        const stats = await fs.stat(filePath);
        if (stats.size > config.security.maxFileSize) {
            throw new FileProcessingError('File too large', 'SIZE_LIMIT');
        }

        const buffer = await readFileAsync(filePath);
        const fileType = await fileTypeFromBuffer(buffer);
        
        if (!fileType || !this.supportedTypes.has(fileType.mime)) {
            throw new FileProcessingError('Unsupported file type', 'INVALID_TYPE');
        }

        return { buffer, fileType };
    }

    async extractText(filePath) {
        try {
            const { buffer, fileType } = await this.validateFile(filePath);
            
            switch (fileType.mime) {
                case 'application/pdf':
                    return await this.extractPdfText(buffer);
                case 'image/jpeg':
                case 'image/png':
                case 'image/bmp':
                case 'image/tiff':
                    return await this.extractImageText(filePath);
                // ... other cases
                default:
                    throw new FileProcessingError('Unsupported MIME type', 'INVALID_TYPE');
            }
        } catch (error) {
            logger.error(`Error extracting text from ${filePath}: ${error.message}`);
            throw error;
        }
    }

    async extractPdfText(buffer) {
        try {
            const data = await pdfParse(buffer);
            return this.sanitizeText(data.text);
        } catch (error) {
            throw new FileProcessingError(`PDF parsing failed: ${error.message}`, 'PDF_PARSE');
        }
    }

    async extractImageText(imagePath) {
        try {
            const { data: { text } } = await tesseract.recognize(
                imagePath,
                config.tesseract.lang,
                {
                    logger: m => logger.debug(m)
                }
            );
            return this.sanitizeText(text);
        } catch (error) {
            throw new FileProcessingError(`OCR failed: ${error.message}`, 'OCR');
        }
    }

    sanitizeText(text) {
        // Remove potential XSS or injection content
        return text
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/[^\w\s.,!?-]/g, '') // Remove special characters
            .trim();
    }

    async processDirectory(inputDir, outputDir) {
        try {
            await fs.ensureDir(outputDir);
            const files = await fs.readdir(inputDir);
            
            const results = [];
            for (const file of files) {
                const filePath = path.join(inputDir, file);
                try {
                    const text = await this.extractText(filePath);
                    const outputPath = path.join(
                        outputDir,
                        `${path.parse(file).name}_extracted.txt`
                    );
                    await fs.writeFile(outputPath, text);
                    results.push({ file, success: true });
                } catch (error) {
                    results.push({ file, success: false, error: error.message });
                }
            }
            
            return results;
        } catch (error) {
            logger.error(`Directory processing failed: ${error.message}`);
            throw error;
        }
    }
}

module.exports = TextExtractor;
