import React from 'react';
import PropTypes from 'prop-types';
import { Line } from 'react-chartjs-2';

const CostTracking = ({ invoices = [] }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const data = {
    labels: months,
    datasets: [
      {
        label: 'Monthly Costs',
        data: months.map((_, index) => {
          const monthInvoices = invoices.filter(invoice => new Date(invoice.date).getMonth() === index);
          return monthInvoices.reduce((total, invoice) => total + invoice.total, 0);
        }),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
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
        text: 'Monthly Cost Tracking'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `$${value.toLocaleString()}`
        }
      }
    }
  };

  return (
    <div className="cost-tracking">
      <h2>Cost Tracking</h2>
      <div className="chart-container">
        <Line data={data} options={options} />
      </div>
      <div className="summary">
        <h3>Summary</h3>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Total Cost</th>
              <th>Number of Invoices</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month, index) => {
              const monthInvoices = invoices.filter(invoice => new Date(invoice.date).getMonth() === index);
              const totalCost = monthInvoices.reduce((total, invoice) => total + invoice.total, 0);
              return (
                <tr key={month}>
                  <td>{month}</td>
                  <td>${totalCost.toLocaleString()}</td>
                  <td>{monthInvoices.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

CostTracking.propTypes = {
  invoices: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string,
    total: PropTypes.number
  }))
};

export default CostTracking;
