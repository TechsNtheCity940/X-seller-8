// Inventory.jsx
import React, { useState, useEffect } from 'react';
import DataGrid from 'react-data-grid';

const columns = [
  { key: 'id', name: 'ID', editable: false },
  { key: 'itemName', name: 'Item Name', editable: true },
  { key: 'brand', name: 'Brand', editable: true },
  { key: 'packSize', name: 'Pack Size', editable: true },
  { key: 'price', name: 'Price', editable: true },
  { key: 'ordered', name: 'Quantity Ordered', editable: true },
  { key: 'status', name: 'Status', editable: true },
  { key: 'lastUpdated', name: 'Last Updated', editable: false },
];

const Inventory = () => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    // Fetch the inventory data from the backend API
    async function fetchData() {
      try {
        const response = await fetch('http://localhost:5000/inventory');
        const data = await response.json();
        setRows(data.map((item, index) => ({ id: index + 1, ...item })));
      } catch (error) {
        console.error('Error fetching inventory data:', error);
      }
    }

    fetchData();
  }, []);

  const handleRowsChange = (updatedRows) => {
    setRows(updatedRows);
  
    // Send the updated rows to the backend
    fetch('http://localhost:5000/inventory', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedRows),
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('Inventory updated successfully');
      }
    })
    .catch(error => {
      console.error('Error updating inventory:', error);
    });
  };

  return (
    <div className="inventory">
      <h2>Inventory Data</h2>
      <DataGrid
        columns={columns}
        rows={rows}
        onRowsChange={handleRowsChange}
      />
    </div>
  );
};

export default Inventory;
