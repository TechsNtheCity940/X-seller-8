import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const InventoryPriceTrend = () => {
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:5000/inventory');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received');
      }
      
      setInventoryData(data);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      setError(error.message);
      // Retry logic for network errors
      if (retryCount < 3 && error.message.includes('network')) {
        setRetryCount(prev => prev + 1);
        setTimeout(fetchInventory, 1000 * Math.pow(2, retryCount));
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const chartData = {
    labels: inventoryData.map(item => item.itemName),
    datasets: [
      {
        label: 'Item Price Trend',
        data: inventoryData.map(item => item.price),
        fill: false,
        backgroundColor: 'rgba(75,192,192,0.4)',
        borderColor: 'rgba(75,192,192,1)',
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Inventory Price Trends',
      },
      tooltip: {
        callbacks: {
          label: (context) => `$${context.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `$${value}`,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  if (loading) {
    return <div>Loading inventory data...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error loading inventory data: {error}</p>
        <button onClick={() => {
          setRetryCount(0);
          fetchInventory();
        }}>
          Retry
        </button>
      </div>
    );
  }

  if (!inventoryData.length) {
    return <div>No inventory data available</div>;
  }

  return (
    <div className="inventory-price-trend">
      <h2>Inventory Price Trend</h2>
      <Line data={chartData} options={options} />
    </div>
  );
};

InventoryPriceTrend.propTypes = {
  inventoryData: PropTypes.arrayOf(PropTypes.shape({
    itemName: PropTypes.string,
    price: PropTypes.number,
  })),
};

export default InventoryPriceTrend;
