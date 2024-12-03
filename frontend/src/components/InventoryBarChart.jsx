import React from 'react';
import PropTypes from 'prop-types';
import { Bar } from 'react-chartjs-2';

const InventoryBarChart = ({ data = [] }) => {
  const chartData = {
    labels: data.map(item => item.itemName),
    datasets: [
      {
        label: 'Ordered Quantity',
        data: data.map(item => item.ordered),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Inventory Quantities'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Quantity'
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  return (
    <div className="inventory-bar-chart">
      <Bar data={chartData} options={options} />
    </div>
  );
};

InventoryBarChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    itemName: PropTypes.string,
    ordered: PropTypes.number
  }))
};

export default InventoryBarChart;
