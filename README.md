# X-Seller-8: Enhanced Restaurant Inventory Management System

A comprehensive solution for restaurant managers to automate inventory tracking, invoice processing, and profitability analysis through document scanning and data extraction.

## Features

- **Multi-Format Document Support**: Process PDFs, images (JPG, PNG), spreadsheets (XLSX, CSV), and text files (DOCX, TXT)
- **Advanced OCR Capabilities**: Extract text from images and scanned documents using multiple OCR engines (Tesseract, EasyOCR, PaddleOCR)
- **Intelligent Data Extraction**: Automatically parse product details, prices, quantities, and dates from unstructured text
- **Monthly Organization**: Organize inventory data by month for easy tracking and historical analysis
- **Food vs. Alcohol Categorization**: Automatically categorize items as food or alcohol products
- **Realtime Processing Status**: Monitor document processing with live updates and notifications
- **Simple Web Interface**: Upload and manage documents through an intuitive browser interface
- **Data Download Options**: Export processed data in various formats (JSON, raw text)
- **AI Assistant Integration**: Get insights and answers about your inventory (requires API key)

## Installation

### Prerequisites

- Node.js (v16+)
- Python 3.7+ (for OCR engines)
- Required npm modules:
  - express
  - http-proxy
  - fs-extra
  - tesseract.js
  - and others listed in package.json

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/X-seller-8.git
   cd X-seller-8
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Python dependencies for OCR:
   ```bash
   pip install easyocr paddleocr
   ```

4. Create required directories (if not already present):
   ```bash
   mkdir -p backend/uploads backend/output
   ```

## Running the Application

Use the enhanced server launcher:

```bash
node start-enhanced-server.js
```

This will start:
- API server on port 5050
- Frontend server on port 5051
- Combined proxy on port 3000 (main access URL)

Visit http://localhost:3000 in your browser to access the application.

## Usage Guide

### Uploading Documents

1. Navigate to the "Upload" section
2. Drag and drop files or use the file browser
3. Select the month for organizing the data (or use the current month)
4. Files will be automatically processed and text will be extracted

### Viewing Processed Data

1. Go to the "Documents" section to see all processed files
2. Click on any file to view the extracted details
3. See categorized items with prices, quantities, and dates

### Managing Inventory

1. View the full inventory in the "Inventory" section
2. Filter by food/alcohol categories or search for specific items
3. Download inventory reports as needed

### Monthly Organization

1. Start a new month when you're ready to begin the next period
2. All new documents will be organized under the current month
3. Access historical data through the month selector

## System Architecture

The enhanced system consists of:

1. **Frontend**: Browser-based UI for file uploads and data viewing
2. **Backend API**: Processes documents and manages data storage
3. **OCR Engine Integration**: Multiple OCR engines for optimal text extraction
4. **File Processors**: Specialized handlers for each document type
5. **Data Structure**: Organized storage by month with standardized JSON format

## Key Files and Their Purpose

- `start-enhanced-server.js` - Main entry point to launch the system
- `backend/Enhanced_fileProcessor.js` - Core document processing engine
- `backend/server_enhanced.js` - API server with endpoints for document management
- `backend/test_enhanced_processor.js` - Testing utility for the processor
- `frontend/public/index.html` - Main web interface
- `frontend/public/main.js` - Frontend JavaScript for the UI

## Advanced Features

### Month-Based Organization

Documents are automatically organized by month, allowing for:
- Tracking inventory levels over time
- Analyzing spending patterns month-to-month
- End-of-month reporting and reconciliation

### Intelligent Item Categorization

The system automatically categorizes items as food or alcohol based on:
- Product name analysis
- Keyword matching
- Pattern recognition in invoice text

### Multiple OCR Engine Support

The system uses three OCR engines and selects the best result:
1. Tesseract - Fast general-purpose OCR
2. EasyOCR - Specialized for handwritten text
3. PaddleOCR - High accuracy for printed documents

## Troubleshooting

- **File Upload Issues**: Make sure the upload directory is writable
- **OCR Problems**: Verify Python and its dependencies are correctly installed
- **Missing Data**: Check that documents are clear and readable

## Future Enhancements

- Profit margin calculation
- Inventory forecasting
- Vendor management
- Recipe costing
- Waste tracking

---

For any issues or contributions, please contact the development team.
