import React, { useEffect, useState } from 'react';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);

  const fetchInventory = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/inventory');
      const data = await response.json();
      setInventory(Object.values(data));
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  useEffect(() => {
    fetchInventory();
    const interval = setInterval(fetchInventory, 5000); // Polling every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inventory-table">
      <h2>Running Inventory</h2>
      <table>
        <thead>
          <tr>
            <th>Brand</th>
            <th>Pack Size</th>
            <th>Price</th>
            <th>Ordered</th>
            <th>Delivered</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map((item, index) => (
            <tr key={index}>
              <td>{item.brand}</td>
              <td>{item.packSize}</td>
              <td>${item.price.toFixed(2)}</td>
              <td>{item.ordered}</td>
              <td>{item.delivered}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Inventory;
