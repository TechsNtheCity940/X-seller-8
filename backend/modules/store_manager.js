/**
 * Store Manager Module
 * Handles multi-store functionality for X-Seller-8
 */

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
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
    new winston.transports.File({ filename: 'store_manager.log' })
  ]
});

class StoreManager {
  constructor(dataDir = 'storage') {
    this.dataDir = dataDir;
    this.storesDir = path.join(dataDir, 'stores');
    this.storeConfigPath = path.join(dataDir, 'stores.json');
    this.initializeStores();
  }

  /**
   * Initialize store system
   */
  async initializeStores() {
    try {
      // Ensure directories exist
      await fs.ensureDir(this.dataDir);
      await fs.ensureDir(this.storesDir);
      
      // Create stores config file if it doesn't exist
      if (!await fs.pathExists(this.storeConfigPath)) {
        await fs.writeJson(this.storeConfigPath, {
          stores: [],
          lastActive: null
        });
        logger.info('Created initial stores configuration');
      }
      
      logger.info('Store manager initialized');
    } catch (error) {
      logger.error(`Failed to initialize store manager: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all stores
   * @returns {Promise<Array>} List of all stores
   */
  async getAllStores() {
    try {
      const config = await fs.readJson(this.storeConfigPath);
      return config.stores;
    } catch (error) {
      logger.error(`Failed to get stores: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get active store
   * @returns {Promise<Object|null>} The active store or null if none
   */
  async getActiveStore() {
    try {
      const config = await fs.readJson(this.storeConfigPath);
      if (!config.lastActive) return null;
      
      const activeStore = config.stores.find(store => store.id === config.lastActive);
      return activeStore || null;
    } catch (error) {
      logger.error(`Failed to get active store: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a new store
   * @param {Object} storeData Store information
   * @returns {Promise<Object>} The created store
   */
  async addStore(storeData) {
    try {
      if (!storeData.name) {
        throw new Error('Store name is required');
      }
      
      const config = await fs.readJson(this.storeConfigPath);
      
      // Check if store with this name already exists
      if (config.stores.some(s => s.name.toLowerCase() === storeData.name.toLowerCase())) {
        throw new Error(`Store with name "${storeData.name}" already exists`);
      }
      
      // Create store object
      const newStore = {
        id: uuidv4(),
        name: storeData.name,
        address: storeData.address || '',
        phone: storeData.phone || '',
        email: storeData.email || '',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };
      
      // Create store directory
      const storeDir = path.join(this.storesDir, newStore.id);
      await fs.ensureDir(storeDir);
      
      // Create subdirectories for store data
      await fs.ensureDir(path.join(storeDir, 'inventory'));
      await fs.ensureDir(path.join(storeDir, 'uploads'));
      await fs.ensureDir(path.join(storeDir, 'output'));
      
      // Add store to config
      config.stores.push(newStore);
      
      // Set as active if it's the first store
      if (config.stores.length === 1) {
        config.lastActive = newStore.id;
      }
      
      // Save config
      await fs.writeJson(this.storeConfigPath, config, { spaces: 2 });
      
      logger.info(`Created new store: ${newStore.name} (${newStore.id})`);
      return newStore;
    } catch (error) {
      logger.error(`Failed to add store: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update store information
   * @param {string} storeId Store ID
   * @param {Object} storeData Updated store data
   * @returns {Promise<Object>} The updated store
   */
  async updateStore(storeId, storeData) {
    try {
      const config = await fs.readJson(this.storeConfigPath);
      
      // Find store index
      const storeIndex = config.stores.findIndex(s => s.id === storeId);
      if (storeIndex === -1) {
        throw new Error(`Store with ID "${storeId}" not found`);
      }
      
      // Check name uniqueness if name is being changed
      if (storeData.name && 
          storeData.name !== config.stores[storeIndex].name &&
          config.stores.some(s => s.id !== storeId && s.name.toLowerCase() === storeData.name.toLowerCase())) {
        throw new Error(`Store with name "${storeData.name}" already exists`);
      }
      
      // Update store
      const updatedStore = {
        ...config.stores[storeIndex],
        name: storeData.name || config.stores[storeIndex].name,
        address: storeData.address !== undefined ? storeData.address : config.stores[storeIndex].address,
        phone: storeData.phone !== undefined ? storeData.phone : config.stores[storeIndex].phone,
        email: storeData.email !== undefined ? storeData.email : config.stores[storeIndex].email,
        modified: new Date().toISOString()
      };
      
      // Update in config
      config.stores[storeIndex] = updatedStore;
      await fs.writeJson(this.storeConfigPath, config, { spaces: 2 });
      
      logger.info(`Updated store: ${updatedStore.name} (${updatedStore.id})`);
      return updatedStore;
    } catch (error) {
      logger.error(`Failed to update store: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a store
   * @param {string} storeId Store ID
   * @param {boolean} deleteData Whether to delete store data (true) or just remove from list (false)
   * @returns {Promise<boolean>} Success status
   */
  async deleteStore(storeId, deleteData = false) {
    try {
      const config = await fs.readJson(this.storeConfigPath);
      
      // Find store
      const storeIndex = config.stores.findIndex(s => s.id === storeId);
      if (storeIndex === -1) {
        throw new Error(`Store with ID "${storeId}" not found`);
      }
      
      const storeName = config.stores[storeIndex].name;
      
      // Remove from config
      config.stores.splice(storeIndex, 1);
      
      // Update active store if needed
      if (config.lastActive === storeId) {
        config.lastActive = config.stores.length > 0 ? config.stores[0].id : null;
      }
      
      // Save config
      await fs.writeJson(this.storeConfigPath, config, { spaces: 2 });
      
      // Delete store data if requested
      if (deleteData) {
        const storeDir = path.join(this.storesDir, storeId);
        if (await fs.pathExists(storeDir)) {
          await fs.remove(storeDir);
          logger.info(`Deleted store data for: ${storeName} (${storeId})`);
        }
      }
      
      logger.info(`Removed store: ${storeName} (${storeId})`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete store: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set active store
   * @param {string} storeId Store ID
   * @returns {Promise<Object>} The active store
   */
  async setActiveStore(storeId) {
    try {
      const config = await fs.readJson(this.storeConfigPath);
      
      // Check if store exists
      const store = config.stores.find(s => s.id === storeId);
      if (!store) {
        throw new Error(`Store with ID "${storeId}" not found`);
      }
      
      // Update active store
      config.lastActive = storeId;
      await fs.writeJson(this.storeConfigPath, config, { spaces: 2 });
      
      logger.info(`Set active store: ${store.name} (${store.id})`);
      return store;
    } catch (error) {
      logger.error(`Failed to set active store: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get store directory paths
   * @param {string} storeId Store ID
   * @returns {Promise<Object>} Paths for the store
   */
  async getStorePaths(storeId) {
    try {
      // Validate store exists
      const config = await fs.readJson(this.storeConfigPath);
      const store = config.stores.find(s => s.id === storeId);
      if (!store) {
        throw new Error(`Store with ID "${storeId}" not found`);
      }
      
      const storeDir = path.join(this.storesDir, storeId);
      
      return {
        root: storeDir,
        inventory: path.join(storeDir, 'inventory'),
        uploads: path.join(storeDir, 'uploads'),
        output: path.join(storeDir, 'output')
      };
    } catch (error) {
      logger.error(`Failed to get store paths: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get paths for active store
   * @returns {Promise<Object|null>} Paths for the active store or null if none
   */
  async getActiveStorePaths() {
    try {
      const activeStore = await this.getActiveStore();
      if (!activeStore) {
        return null;
      }
      
      return this.getStorePaths(activeStore.id);
    } catch (error) {
      logger.error(`Failed to get active store paths: ${error.message}`);
      throw error;
    }
  }
}

module.exports = StoreManager;
