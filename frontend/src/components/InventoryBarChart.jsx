import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function InventoryBarChart({ data }) {
  const labels = data.map(item => item['ITEM NAME']);
  const quantities = data.map(item => item.ORDERED);
  const prices = data.map(item => item.PRICE);

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Quantity Ordered',
        data: quantities,
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      },
      {
        label: 'Price',
        data: prices,
        backgroundColor: 'rgba(255, 99, 132, 0.6)'
      }
    ]
  };

  return (
    <div className="inventory-bar-chart">
      <h3>Inventory Data</h3>
      <Bar data={chartData} />
    </div>
  );
}

export default InventoryBarChart;
