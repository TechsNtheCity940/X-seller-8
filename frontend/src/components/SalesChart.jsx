import React from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto'; // Ensure auto importing of Chart.js modules

const SalesChart = ({ salesData, costData }) => {
  const data = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    datasets: [
      {
        label: 'Total Sales',
        data: salesData,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        label: 'Total Costs',
        data: costData,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ width: '80%', margin: '0 auto' }}>
      <h3>Sales vs Costs</h3>
      <Bar data={data} options={options} />
    </div>
  );
};

export default SalesChart;
