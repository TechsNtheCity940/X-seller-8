import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function Forecasting({ sales }) {
  const chartData = {
    labels: sales.map(sale => `Month ${sale.month}`),  // Example label for each month
    datasets: [
      {
        label: 'Cost Forecast',
        data: sales.map(sale => sale.cost),
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        fill: true,
        tension: 0.4,  // Smooth lines
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Sales Cost Forecast' },
    },
  };

  return (
    <div>
      <h2>Forecasting</h2>
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}

export default Forecasting;
