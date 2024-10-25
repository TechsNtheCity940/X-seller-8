import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const InventoryPriceTrend = () => {
  const [inventoryData, setInventoryData] = useState([]);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const response = await fetch('http://localhost:5000/inventory');
        const data = await response.json();
        setInventoryData(data);
      } catch (error) {
        console.error('Error fetching inventory data:', error);
      }
    }

    fetchInventory();
  }, []);

  const chartData = {
    labels: inventoryData.map(item => item['itemName']),
    datasets: [
      {
        label: 'Item Price Trend',
        data: inventoryData.map(item => item.price),
        fill: false,
        backgroundColor: 'rgba(75,192,192,0.4)',
        borderColor: 'rgba(75,192,192,1)',
      },
    ],
  };

  return (
    <div className="inventory-price-trend">
      <h2>Inventory Price Trend</h2>
      <Line data={chartData} />
    </div>
  );
};

export default InventoryPriceTrend;
