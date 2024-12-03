import React from 'react';
import PropTypes from 'prop-types';
import { Line } from 'react-chartjs-2';

const Forecasting = ({ sales = [] }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Calculate moving average for forecasting
  const calculateMovingAverage = (data, period = 3) => {
    return data.map((_, index, array) => {
      if (index < period - 1) return null;
      const sum = array.slice(index - period + 1, index + 1).reduce((acc, val) => acc + val, 0);
      return sum / period;
    });
  };

  // Prepare data for chart
  const actualSales = months.map((_, index) => {
    const monthSales = sales.filter(sale => sale.month === index);
    return monthSales.reduce((total, sale) => total + sale.cost, 0);
  });

  const movingAverage = calculateMovingAverage(actualSales);
  
  // Simple linear regression for trend
  const forecast = actualSales.map((sale, index) => {
    if (index < 3) return null; // Need at least 3 months of data
    const x = index;
    const y = sale;
    const slope = (y - actualSales[index - 1]) / 1;
    return y + slope;
  });

  const data = {
    labels: months,
    datasets: [
      {
        label: 'Actual Sales',
        data: actualSales,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      },
      {
        label: '3-Month Moving Average',
        data: movingAverage,
        borderColor: 'rgb(255, 99, 132)',
        borderDash: [5, 5],
        tension: 0.1
      },
      {
        label: 'Forecast',
        data: forecast,
        borderColor: 'rgb(54, 162, 235)',
        borderDash: [10, 5],
        tension: 0.1
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
        text: 'Sales Forecast'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Amount ($)'
        },
        ticks: {
          callback: (value) => `$${value.toLocaleString()}`
        }
      }
    }
  };

  return (
    <div className="forecasting">
      <h2>Sales Forecasting</h2>
      <div className="chart-container">
        <Line data={data} options={options} />
      </div>
      <div className="forecast-summary">
        <h3>Summary</h3>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Actual Sales</th>
              <th>Moving Average</th>
              <th>Forecast</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month, index) => (
              <tr key={month}>
                <td>{month}</td>
                <td>${actualSales[index]?.toLocaleString() || '-'}</td>
                <td>${movingAverage[index]?.toLocaleString() || '-'}</td>
                <td>${forecast[index]?.toLocaleString() || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

Forecasting.propTypes = {
  sales: PropTypes.arrayOf(PropTypes.shape({
    month: PropTypes.number,
    cost: PropTypes.number
  }))
};

export default Forecasting;
