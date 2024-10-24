import React from 'react';

const CostTracking = ({ invoices }) => {
  const totalCost = invoices.reduce((acc, item) => {
    if (item.ORDERED > 0 && item.PRICE > 0) {
      return acc + item.PRICE * item.ORDERED;
    }
    return acc;
  }, 0);

  return (
    <div>
      <h2>Cost Tracking</h2>
      <p>Total Costs: ${totalCost.toFixed(2)}</p>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Ordered</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice, index) => (
            <tr key={index}>
              <td>{invoice['ITEM NAME']}</td>
              <td>{invoice.ORDERED}</td>
              <td>${invoice.PRICE.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CostTracking;
