import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Chart, Filler } from 'chart.js';

// Register the Filler plugin
Chart.register(Filler);

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function InventoryBarChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/output/Inventory.xlsx`);
        if (!response.ok) {
          throw new Error('Failed to load inventory data');
        }
        const data = await response.json();
        setInventoryData(data);
      } catch (error) {
        console.error('Error loading inventory data:', error);
        setErrorMsg('Failed to load inventory data');
      }
    };
  
    fetchInventoryData();
  }, []);

  const labels = data.map(item => item.itemName);
  const quantities = data.map(item => item.ordered);
  const prices = data.map(item => item.price);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Quantity Ordered',
        data: quantities,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
      {
        label: 'Price',
        data: prices,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      },
    ],
  };

  return (
    <div className="inventory-bar-chart">
      <h3>Inventory Data</h3>
      <Bar data={chartData} />
    </div>
  );
}

export default InventoryBarChart;
