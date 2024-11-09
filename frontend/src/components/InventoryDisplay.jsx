import React, { useEffect, useState } from 'react';

const InventoryDisplay = () => {
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInventoryData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/inventory');
      if (!response.ok) {
        throw new Error('Failed to fetch inventory data');
      }
      const data = await response.json();
      setInventoryData(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  if (loading) return <p>Loading inventory data...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="inventory-table">
      <h2>Updated Food Inventory</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Price</th>
            <th>Inventory</th>
          </tr>
        </thead>
        <tbody>
          {inventoryData.map((item, index) => (
            <tr key={index}>
              <td>{item.item}</td>
              <td>${item.price.toFixed(2)}</td>
              <td>{item.inventory}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryDisplay;
