import React, { useState, useEffect } from 'react';
import DataGrid from 'react-data-grid';
import PropTypes from 'prop-types';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        const response = await fetch('http://localhost:5000/output/inventory.json');
        if (!response.ok) throw new Error('Failed to fetch inventory data');
        const data = await response.json();
        setRows(data.map((item, index) => ({ id: index + 1, ...item })));
      } catch (error) {
        console.error('Error loading inventory data:', error);
        setError('Failed to load inventory data');
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryData();
  }, []);

  return (
    <div>
      {loading && <p>Loading inventory data...</p>}
      {error && <p>{error}</p>}
      {!loading && !error && (
        <DataGrid
          columns={columns}
          rows={rows}
          onRowsChange={setRows}
        />
      )}
    </div>
  );
};

Inventory.propTypes = {
  columns: PropTypes.array,
  rows: PropTypes.array,
};

export default Inventory;
