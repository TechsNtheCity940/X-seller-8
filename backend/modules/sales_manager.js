/**
 * Sales Manager Module
 * Manages sales data and profitability analysis for X-Seller-8
 */

const fs = require('fs-extra');
const path = require('path');
const winston = require('winston');

// Setup Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'sales_manager.log' })
  ]
});

class SalesManager {
  constructor(storePaths) {
    this.storePaths = storePaths;
    this.salesDir = path.join(storePaths.root, 'sales');
    this.reportsDir = path.join(storePaths.root, 'reports');
    this.initializeSalesSystem();
  }

  /**
   * Initialize sales data system
   */
  async initializeSalesSystem() {
    try {
      // Ensure directories exist
      await fs.ensureDir(this.salesDir);
      await fs.ensureDir(this.reportsDir);
      logger.info('Sales manager initialized');
    } catch (error) {
      logger.error(`Failed to initialize sales manager: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add sales data for a specific month
   * @param {string} month Month identifier (e.g., "March2025")
   * @param {Array} salesData Array of sales data objects
   * @returns {Promise<Object>} Summary of the added sales data
   */
  async addSalesData(month, salesData) {
    try {
      if (!month) {
        throw new Error('Month is required');
      }
      
      if (!Array.isArray(salesData) || salesData.length === 0) {
        throw new Error('Sales data must be a non-empty array');
      }
      
      // Ensure the month directory exists
      const monthDir = path.join(this.salesDir, month);
      await fs.ensureDir(monthDir);
      
      // Create a timestamp-based filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const salesFilePath = path.join(monthDir, `sales_${timestamp}.json`);
      
      // Calculate totals
      const totalRevenue = salesData.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = salesData.length;
      
      // Create a summary
      const summary = {
        month,
        timestamp: new Date().toISOString(),
        totalRevenue,
        itemCount,
        salesData
      };
      
      // Save sales data
      await fs.writeJson(salesFilePath, summary, { spaces: 2 });
      
      logger.info(`Added sales data for ${month} with ${itemCount} items and total revenue $${totalRevenue.toFixed(2)}`);
      
      return {
        month,
        salesFilePath,
        totalRevenue,
        itemCount
      };
    } catch (error) {
      logger.error(`Failed to add sales data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all sales data for a specific month
   * @param {string} month Month identifier (e.g., "March2025")
   * @returns {Promise<Array>} Combined sales data for the month
   */
  async getSalesDataForMonth(month) {
    try {
      if (!month) {
        throw new Error('Month is required');
      }
      
      const monthDir = path.join(this.salesDir, month);
      
      // Check if month directory exists
      if (!await fs.pathExists(monthDir)) {
        return {
          month,
          totalRevenue: 0,
          itemCount: 0,
          salesEntries: 0,
          salesData: []
        };
      }
      
      // Get all sales files for the month
      const files = await fs.readdir(monthDir);
      const salesFiles = files.filter(file => file.startsWith('sales_') && file.endsWith('.json'));
      
      if (salesFiles.length === 0) {
        return {
          month,
          totalRevenue: 0,
          itemCount: 0,
          salesEntries: 0,
          salesData: []
        };
      }
      
      // Read and combine all sales data
      let combinedSalesData = [];
      let totalRevenue = 0;
      let itemCount = 0;
      
      for (const file of salesFiles) {
        const filePath = path.join(monthDir, file);
        const salesEntry = await fs.readJson(filePath);
        
        if (salesEntry.salesData && Array.isArray(salesEntry.salesData)) {
          combinedSalesData = [...combinedSalesData, ...salesEntry.salesData];
          totalRevenue += salesEntry.totalRevenue || 0;
          itemCount += salesEntry.itemCount || 0;
        }
      }
      
      logger.info(`Retrieved ${salesFiles.length} sales entries for ${month} with total revenue $${totalRevenue.toFixed(2)}`);
      
      return {
        month,
        totalRevenue,
        itemCount,
        salesEntries: salesFiles.length,
        salesData: combinedSalesData
      };
    } catch (error) {
      logger.error(`Failed to get sales data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a monthly profit report by comparing sales and inventory costs
   * @param {string} month Month identifier (e.g., "March2025")
   * @returns {Promise<Object>} The profit report
   */
  async generateMonthlyReport(month) {
    try {
      if (!month) {
        throw new Error('Month is required');
      }
      
      // Get sales data for the month
      const salesData = await this.getSalesDataForMonth(month);
      
      // Load inventory data for the month
      const inventoryDataPath = path.join(this.storePaths.inventory, `${month}_inventory_data.json`);
      let inventoryData = [];
      let costData = { totalCost: 0, itemCount: 0 };
      
      if (await fs.pathExists(inventoryDataPath)) {
        inventoryData = await fs.readJson(inventoryDataPath);
        
        // Calculate inventory costs
        costData.totalCost = inventoryData.reduce((sum, item) => {
          const itemCost = (item.price || 0) * (item.quantity || 0);
          return sum + itemCost;
        }, 0);
        
        costData.itemCount = inventoryData.length;
      }
      
      // Generate profit report
      const profit = salesData.totalRevenue - costData.totalCost;
      const profitMargin = salesData.totalRevenue > 0
        ? (profit / salesData.totalRevenue) * 100
        : 0;
      
      const report = {
        month,
        timestamp: new Date().toISOString(),
        sales: {
          revenue: salesData.totalRevenue,
          itemCount: salesData.itemCount,
          entries: salesData.salesEntries
        },
        costs: {
          total: costData.totalCost,
          itemCount: costData.itemCount
        },
        profit: {
          amount: profit,
          margin: profitMargin
        },
        summary: {
          revenue: `$${salesData.totalRevenue.toFixed(2)}`,
          costs: `$${costData.totalCost.toFixed(2)}`,
          profit: `$${profit.toFixed(2)}`,
          profitMargin: `${profitMargin.toFixed(2)}%`
        }
      };
      
      // Save the report
      const reportPath = path.join(this.reportsDir, `${month}_profit_report.json`);
      await fs.writeJson(reportPath, report, { spaces: 2 });
      
      logger.info(`Generated profit report for ${month}: Revenue: $${salesData.totalRevenue.toFixed(2)}, Costs: $${costData.totalCost.toFixed(2)}, Profit: $${profit.toFixed(2)} (${profitMargin.toFixed(2)}%)`);
      
      return {
        month,
        reportPath,
        report
      };
    } catch (error) {
      logger.error(`Failed to generate monthly report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get list of months with sales data
   * @returns {Promise<Array>} List of months
   */
  async getMonthsWithSalesData() {
    try {
      if (!await fs.pathExists(this.salesDir)) {
        return [];
      }
      
      const contents = await fs.readdir(this.salesDir);
      
      // Filter for directories only
      const months = [];
      for (const item of contents) {
        const itemPath = path.join(this.salesDir, item);
        const stats = await fs.stat(itemPath);
        if (stats.isDirectory()) {
          months.push(item);
        }
      }
      
      return months.sort();
    } catch (error) {
      logger.error(`Failed to get months with sales data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get list of generated reports
   * @returns {Promise<Array>} List of reports
   */
  async getReports() {
    try {
      if (!await fs.pathExists(this.reportsDir)) {
        return [];
      }
      
      const files = await fs.readdir(this.reportsDir);
      const reportFiles = files.filter(file => file.endsWith('_profit_report.json'));
      
      const reports = [];
      for (const file of reportFiles) {
        try {
          const filePath = path.join(this.reportsDir, file);
          const stats = await fs.stat(filePath);
          const report = await fs.readJson(filePath);
          
          reports.push({
            month: report.month,
            filename: file,
            path: filePath,
            createdAt: stats.mtime,
            summary: report.summary
          });
        } catch (e) {
          logger.warn(`Error reading report file ${file}: ${e.message}`);
        }
      }
      
      return reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      logger.error(`Failed to get reports: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a sales entry
   * @param {string} month Month identifier
   * @param {string} filename Sales file name
   * @returns {Promise<boolean>} Success status
   */
  async deleteSalesEntry(month, filename) {
    try {
      const filePath = path.join(this.salesDir, month, filename);
      
      if (!await fs.pathExists(filePath)) {
        throw new Error(`Sales entry not found: ${filename}`);
      }
      
      await fs.remove(filePath);
      logger.info(`Deleted sales entry: ${month}/${filename}`);
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete sales entry: ${error.message}`);
      throw error;
    }
  }
}

module.exports = SalesManager;
