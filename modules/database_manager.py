"""
Database Manager for X-Seller-8 Inventory Management System

This module handles all database operations for storing inventory data by month,
managing history, and providing data for AI learning.
"""

import os
import json
import sqlite3
import logging
from datetime import datetime
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DatabaseManager:
    """Manages inventory database operations with monthly tracking and AI learning"""
    
    def __init__(self, db_path="inventory.db"):
        """Initialize database connection"""
        self.db_path = db_path
        self.conn = None
        self.cursor = None
        self.connect()
        self.create_tables()
    
    def connect(self):
        """Connect to SQLite database"""
        try:
            self.conn = sqlite3.connect(self.db_path)
            self.conn.row_factory = sqlite3.Row  # Return results as dictionaries
            self.cursor = self.conn.cursor()
            logger.info(f"Connected to database: {self.db_path}")
        except sqlite3.Error as e:
            logger.error(f"Database connection error: {str(e)}")
            raise
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")
    
    def create_tables(self):
        """Create database tables if they don't exist"""
        try:
            # Months table to track active and historical months
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS months (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    month_name TEXT NOT NULL,
                    year INTEGER NOT NULL,
                    start_date TEXT NOT NULL,
                    end_date TEXT,
                    is_active INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(month_name, year)
                )
            ''')
            
            # Items table for all inventory items
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    pack_size TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(name, category, pack_size)
                )
            ''')
            
            # Monthly inventory table
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS monthly_inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    month_id INTEGER NOT NULL,
                    item_id INTEGER NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 0,
                    price REAL NOT NULL DEFAULT 0,
                    last_delivery_date TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (month_id) REFERENCES months(id),
                    FOREIGN KEY (item_id) REFERENCES items(id),
                    UNIQUE(month_id, item_id)
                )
            ''')
            
            # Scanned documents table
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    month_id INTEGER NOT NULL,
                    filename TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    processed_date TEXT NOT NULL,
                    items_count INTEGER NOT NULL DEFAULT 0,
                    FOREIGN KEY (month_id) REFERENCES months(id)
                )
            ''')
            
            # AI learning table - to track corrections for better future extraction
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS ai_learning (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    original_text TEXT NOT NULL,
                    corrected_name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    confidence REAL DEFAULT 1.0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(original_text, corrected_name)
                )
            ''')
            
            self.conn.commit()
            logger.info("Database tables created successfully")
        except sqlite3.Error as e:
            logger.error(f"Error creating database tables: {str(e)}")
            raise
    
    def get_active_month(self):
        """Get the current active month"""
        try:
            self.cursor.execute('''
                SELECT * FROM months WHERE is_active = 1 ORDER BY id DESC LIMIT 1
            ''')
            month = self.cursor.fetchone()
            
            if not month:
                # Create a new month if none exists
                current_date = datetime.now()
                month_name = current_date.strftime("%B")
                year = current_date.year
                start_date = current_date.strftime("%Y-%m-%d")
                
                self.cursor.execute('''
                    INSERT INTO months (month_name, year, start_date, is_active)
                    VALUES (?, ?, ?, 1)
                ''', (month_name, year, start_date))
                self.conn.commit()
                
                # Get the new month
                self.cursor.execute('''
                    SELECT * FROM months WHERE id = last_insert_rowid()
                ''')
                month = self.cursor.fetchone()
            
            return dict(month) if month else None
        except sqlite3.Error as e:
            logger.error(f"Error getting active month: {str(e)}")
            return None
    
    def start_new_month(self):
        """Close current month and start a new one"""
        try:
            # Get current active month
            current_month = self.get_active_month()
            if current_month:
                # Set end date and deactivate
                end_date = datetime.now().strftime("%Y-%m-%d")
                self.cursor.execute('''
                    UPDATE months SET end_date = ?, is_active = 0
                    WHERE id = ?
                ''', (end_date, current_month['id']))
            
            # Create a new month
            current_date = datetime.now()
            month_name = current_date.strftime("%B")
            year = current_date.year
            start_date = current_date.strftime("%Y-%m-%d")
            
            self.cursor.execute('''
                INSERT INTO months (month_name, year, start_date, is_active)
                VALUES (?, ?, ?, 1)
            ''', (month_name, year, start_date))
            
            self.conn.commit()
            
            # Get the new month
            new_month = self.get_active_month()
            logger.info(f"Started new month: {new_month['month_name']} {new_month['year']}")
            return new_month
        except sqlite3.Error as e:
            logger.error(f"Error starting new month: {str(e)}")
            self.conn.rollback()
            return None
    
    def get_all_months(self):
        """Get all months in the database"""
        try:
            self.cursor.execute('''
                SELECT * FROM months ORDER BY year DESC, id DESC
            ''')
            months = self.cursor.fetchall()
            return [dict(month) for month in months]
        except sqlite3.Error as e:
            logger.error(f"Error retrieving months: {str(e)}")
            return []
    
    def add_or_update_item(self, name, category, pack_size=None):
        """Add a new item or get existing item ID"""
        try:
            # Check if item exists
            self.cursor.execute('''
                SELECT id FROM items
                WHERE name = ? AND category = ? AND (pack_size = ? OR (pack_size IS NULL AND ? IS NULL))
            ''', (name, category, pack_size, pack_size))
            
            item = self.cursor.fetchone()
            
            if item:
                # Update last_updated timestamp
                self.cursor.execute('''
                    UPDATE items SET last_updated = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (item['id'],))
                item_id = item['id']
            else:
                # Insert new item
                self.cursor.execute('''
                    INSERT INTO items (name, category, pack_size)
                    VALUES (?, ?, ?)
                ''', (name, category, pack_size))
                item_id = self.cursor.lastrowid
            
            self.conn.commit()
            return item_id
        except sqlite3.Error as e:
            logger.error(f"Error adding/updating item: {str(e)}")
            self.conn.rollback()
            return None
    
    def update_monthly_inventory(self, item_id, quantity, price, delivery_date=None):
        """Update inventory for an item in the active month"""
        try:
            active_month = self.get_active_month()
            if not active_month:
                logger.error("No active month found")
                return False
            
            # Check if item exists in monthly inventory
            self.cursor.execute('''
                SELECT id, quantity FROM monthly_inventory
                WHERE month_id = ? AND item_id = ?
            ''', (active_month['id'], item_id))
            
            inventory_item = self.cursor.fetchone()
            
            if inventory_item:
                # Update existing inventory
                self.cursor.execute('''
                    UPDATE monthly_inventory 
                    SET quantity = ?, price = ?, 
                        last_delivery_date = ?,
                        last_updated = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (quantity, price, delivery_date, inventory_item['id']))
            else:
                # Insert new inventory item
                self.cursor.execute('''
                    INSERT INTO monthly_inventory 
                    (month_id, item_id, quantity, price, last_delivery_date)
                    VALUES (?, ?, ?, ?, ?)
                ''', (active_month['id'], item_id, quantity, price, delivery_date))
            
            self.conn.commit()
            return True
        except sqlite3.Error as e:
            logger.error(f"Error updating monthly inventory: {str(e)}")
            self.conn.rollback()
            return False
    
    def add_document(self, filename, file_path, items_count):
        """Add a processed document to the database"""
        try:
            active_month = self.get_active_month()
            if not active_month:
                logger.error("No active month found")
                return False
            
            processed_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            self.cursor.execute('''
                INSERT INTO documents 
                (month_id, filename, file_path, processed_date, items_count)
                VALUES (?, ?, ?, ?, ?)
            ''', (active_month['id'], filename, file_path, processed_date, items_count))
            
            self.conn.commit()
            return True
        except sqlite3.Error as e:
            logger.error(f"Error adding document: {str(e)}")
            self.conn.rollback()
            return False
    
    def add_ai_learning_entry(self, original_text, corrected_name, category, confidence=1.0):
        """Add an AI learning entry for better future extraction"""
        try:
            # Check if entry exists
            self.cursor.execute('''
                SELECT id FROM ai_learning
                WHERE original_text = ? AND corrected_name = ?
            ''', (original_text, corrected_name))
            
            entry = self.cursor.fetchone()
            
            if entry:
                # Update confidence
                self.cursor.execute('''
                    UPDATE ai_learning 
                    SET confidence = ?, category = ?, created_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (confidence, category, entry['id']))
            else:
                # Insert new entry
                self.cursor.execute('''
                    INSERT INTO ai_learning 
                    (original_text, corrected_name, category, confidence)
                    VALUES (?, ?, ?, ?)
                ''', (original_text, corrected_name, category, confidence))
            
            self.conn.commit()
            return True
        except sqlite3.Error as e:
            logger.error(f"Error adding AI learning entry: {str(e)}")
            self.conn.rollback()
            return False
    
    def get_ai_learning_suggestions(self, text):
        """Get AI learning suggestions for a given text"""
        try:
            # Look for exact match
            self.cursor.execute('''
                SELECT corrected_name, category, confidence FROM ai_learning
                WHERE original_text = ?
                ORDER BY confidence DESC
                LIMIT 1
            ''', (text,))
            
            match = self.cursor.fetchone()
            if match:
                return dict(match)
            
            # Try fuzzy match using LIKE
            self.cursor.execute('''
                SELECT corrected_name, category, confidence FROM ai_learning
                WHERE original_text LIKE ? OR ? LIKE original_text
                ORDER BY confidence DESC
                LIMIT 5
            ''', (f"%{text}%", f"%{text}%"))
            
            matches = self.cursor.fetchall()
            if matches:
                # Return the best match
                return dict(matches[0])
            
            return None
        except sqlite3.Error as e:
            logger.error(f"Error getting AI learning suggestions: {str(e)}")
            return None
    
    def get_inventory_by_month(self, month_id=None, category=None):
        """Get inventory items for a specific month"""
        try:
            if not month_id:
                active_month = self.get_active_month()
                if not active_month:
                    logger.error("No active month found")
                    return []
                month_id = active_month['id']
            
            query = '''
                SELECT 
                    i.id, i.name, i.category, i.pack_size, 
                    mi.quantity, mi.price, mi.last_delivery_date,
                    m.month_name, m.year
                FROM monthly_inventory mi
                JOIN items i ON mi.item_id = i.id
                JOIN months m ON mi.month_id = m.id
                WHERE mi.month_id = ?
            '''
            
            params = [month_id]
            
            if category:
                query += " AND i.category = ?"
                params.append(category)
            
            query += " ORDER BY i.category, i.name"
            
            self.cursor.execute(query, params)
            inventory = self.cursor.fetchall()
            
            return [dict(item) for item in inventory]
        except sqlite3.Error as e:
            logger.error(f"Error retrieving inventory: {str(e)}")
            return []
    
    def get_inventory_summary(self, month_id=None):
        """Get summary statistics for inventory"""
        try:
            if not month_id:
                active_month = self.get_active_month()
                if not active_month:
                    logger.error("No active month found")
                    return {}
                month_id = active_month['id']
            
            # Get total items and value by category
            self.cursor.execute('''
                SELECT 
                    i.category,
                    COUNT(DISTINCT i.id) AS item_count,
                    SUM(mi.quantity) AS total_quantity,
                    SUM(mi.quantity * mi.price) AS total_value
                FROM monthly_inventory mi
                JOIN items i ON mi.item_id = i.id
                WHERE mi.month_id = ?
                GROUP BY i.category
            ''', (month_id,))
            
            categories = self.cursor.fetchall()
            
            # Get month info
            self.cursor.execute('''
                SELECT * FROM months WHERE id = ?
            ''', (month_id,))
            
            month = self.cursor.fetchone()
            
            # Get document count
            self.cursor.execute('''
                SELECT COUNT(*) as doc_count FROM documents
                WHERE month_id = ?
            ''', (month_id,))
            
            doc_count = self.cursor.fetchone()
            
            summary = {
                'month': dict(month) if month else {},
                'categories': [dict(cat) for cat in categories],
                'document_count': doc_count['doc_count'] if doc_count else 0,
                'total_items': sum(cat['item_count'] for cat in categories),
                'total_value': sum(cat['total_value'] for cat in categories)
            }
            
            return summary
        except sqlite3.Error as e:
            logger.error(f"Error retrieving inventory summary: {str(e)}")
            return {}
    
    def export_inventory_to_json(self, month_id=None, category=None, output_path=None):
        """Export inventory data to JSON file"""
        try:
            inventory = self.get_inventory_by_month(month_id, category)
            
            if not inventory:
                logger.warning("No inventory data to export")
                return None
            
            # Get month info for filename
            if month_id:
                self.cursor.execute("SELECT month_name, year FROM months WHERE id = ?", (month_id,))
                month = self.cursor.fetchone()
            else:
                month = self.get_active_month()
            
            month_str = f"{month['month_name']}_{month['year']}" if month else datetime.now().strftime("%B_%Y")
            category_str = f"_{category}" if category else ""
            
            if not output_path:
                output_path = f"output/{month_str}{category_str}_inventory.json"
            
            # Create output directory if it doesn't exist
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Convert to serializable format
            serializable_inventory = []
            for item in inventory:
                serializable_item = dict(item)
                
                # Convert datetime objects to strings
                for key, value in serializable_item.items():
                    if isinstance(value, datetime):
                        serializable_item[key] = value.isoformat()
                
                serializable_inventory.append(serializable_item)
            
            # Write to file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "month": month_str,
                    "category": category or "all",
                    "export_date": datetime.now().isoformat(),
                    "items": serializable_inventory
                }, f, indent=2)
            
            logger.info(f"Exported inventory to {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"Error exporting inventory: {str(e)}")
            return None
    
    def process_inventory_items(self, inventory_items):
        """Process and store inventory items from scanner"""
        if not inventory_items:
            return False
        
        try:
            active_month = self.get_active_month()
            if not active_month:
                logger.error("No active month found")
                return False
            
            items_processed = 0
            
            for item in inventory_items:
                # Add or update item
                item_name = item.get('itemName', 'Unknown Item')
                category = item.get('category', 'other')
                pack_size = item.get('packSize')
                
                # Try to get better category from AI learning
                suggestion = self.get_ai_learning_suggestions(item_name)
                if suggestion:
                    # Use suggestion but keep original if category is "other"
                    if category == "other":
                        category = suggestion['category']
                    # Add confidence to learning model
                    self.add_ai_learning_entry(item_name, suggestion['corrected_name'], 
                                              category, suggestion['confidence'] + 0.1)
                
                item_id = self.add_or_update_item(item_name, category, pack_size)
                
                if item_id:
                    # Update inventory
                    quantity = item.get('ordered', 0)
                    price = item.get('price', 0.0)
                    delivery_date = item.get('delivered')
                    
                    self.update_monthly_inventory(item_id, quantity, price, delivery_date)
                    items_processed += 1
            
            self.conn.commit()
            logger.info(f"Processed {items_processed} inventory items")
            return True
        except Exception as e:
            logger.error(f"Error processing inventory items: {str(e)}")
            self.conn.rollback()
            return False

# Singleton instance
_db_instance = None

def get_db_instance(db_path="inventory.db"):
    """Get singleton database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseManager(db_path)
    return _db_instance

if __name__ == "__main__":
    # Test database functionality
    db = get_db_instance()
    
    # Print active month
    active_month = db.get_active_month()
    print(f"Active month: {active_month['month_name']} {active_month['year']}")
    
    # Test adding items
    food_id = db.add_or_update_item("Test Food Item", "food", "1lb")
    alcohol_id = db.add_or_update_item("Test Alcohol Item", "alcohol", "750ml")
    
    # Test updating inventory
    db.update_monthly_inventory(food_id, 10, 9.99, datetime.now().strftime("%Y-%m-%d"))
    db.update_monthly_inventory(alcohol_id, 5, 24.99, datetime.now().strftime("%Y-%m-%d"))
    
    # Test getting inventory
    inventory = db.get_inventory_by_month()
    print(f"Inventory items: {len(inventory)}")
    
    # Test summary
    summary = db.get_inventory_summary()
    print(f"Inventory summary: {summary}")
    
    # Test export
    export_path = db.export_inventory_to_json()
    print(f"Exported to: {export_path}")
    
    db.close()
