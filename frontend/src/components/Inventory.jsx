import React from 'react';
import PropTypes from 'prop-types';

const Inventory = ({ data = [] }) => {
  return (
    <div className="inventory-table">
      <h2>Running Inventory</h2>
      <table>
        <thead>
          <tr>
            <th>Item #</th>
            <th>Item Name</th>
            <th>Brand</th>
            <th>Pack Size</th>
            <th>Price</th>
            <th>Ordered</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr 
              key={index}
              style={item.status === 'Out of stock' ? { backgroundColor: '#ffebee' } : {}}
            >
              <td>{item.itemNumber}</td>
              <td>{item.itemName}</td>
              <td>{item.brand}</td>
              <td>{item.packSize}</td>
              <td>${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}</td>
              <td>{item.ordered}</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

Inventory.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    itemNumber: PropTypes.string,
    itemName: PropTypes.string,
    brand: PropTypes.string,
    packSize: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    ordered: PropTypes.number,
    status: PropTypes.string
  }))
};

export default Inventory;
