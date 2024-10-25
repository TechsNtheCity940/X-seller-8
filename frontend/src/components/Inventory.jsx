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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('http://localhost:5000/inventory');
        if (!response.ok) throw new Error('Failed to fetch inventory data');
        const data = await response.json();
        setRows(data.map((item, index) => ({ id: index + 1, ...item })));
      } catch (error) {
        setError('Failed to load inventory data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleRowsChange = (updatedRows) => {
    setRows(updatedRows);
    const updatedData = updatedRows.map(row => ({
      itemName: row.itemName,
      brand: row.brand,
      packSize: row.packSize,
      price: row.price,
      ordered: row.ordered,
      status: row.status,
    }));

    fetch('http://localhost:5000/inventory', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedData),
    }).catch(error => {
      console.error('Error updating inventory:', error);
      setError('Failed to update inventory');
    });
  };

  if (loading) return <div>Loading inventory data...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="inventory">
      <h2>Inventory Data</h2>
      <DataGrid columns={columns} rows={rows} onRowsChange={handleRowsChange} />
    </div>
  );
};

export default Inventory;
