import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import './LiveDataGrid.css';

const LiveDataGrid = ({ 
  data = [], 
  onSort = () => {}, 
  onFilter = () => {} 
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColumns, setSelectedColumns] = useState([
    'Item#', 'Item Name', 'Brand', 'Pack Size', 'Price', 'Ordered', 'Confirmed', 'Status'
  ]);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    onSort({ key, direction });
  };

  const handleFilter = (column, value) => {
    const newFilters = {
      ...filters,
      [column]: value
    };
    if (!value) {
      delete newFilters[column];
    }
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleColumnSelect = (event) => {
    const options = event.target.options;
    const selectedValues = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedValues.push(options[i].value);
      }
    }
    setSelectedColumns(selectedValues);
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Apply column filters
      const passesFilters = Object.entries(filters).every(([column, filterValue]) => {
        if (!filterValue) return true;
        const itemValue = String(item[column]).toLowerCase();
        return itemValue.includes(filterValue.toLowerCase());
      });

      // Apply search term
      const passesSearch = !searchTerm || Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );

      return passesFilters && passesSearch;
    });
  }, [data, filters, searchTerm]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
      }

      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();

      if (sortConfig.direction === 'ascending') {
        return aString.localeCompare(bString);
      }
      return bString.localeCompare(aString);
    });
  }, [filteredData, sortConfig]);

  return (
    <div className="live-data-grid">
      <div className="grid-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            data-testid="search-input"
          />
        </div>
        <div className="column-selector">
          <select
            multiple
            value={selectedColumns}
            onChange={handleColumnSelect}
            data-testid="column-selector"
          >
            {Object.keys(data[0] || {}).map(column => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-container">
        <table>
          <thead>
            <tr>
              {selectedColumns.map(column => (
                <th key={column}>
                  <div className="th-content">
                    <span
                      onClick={() => handleSort(column)}
                      data-testid={`sort-${column}`}
                      style={{ cursor: 'pointer' }}
                    >
                      {column}
                      {sortConfig.key === column && (
                        <span className="sort-indicator">
                          {sortConfig.direction === 'ascending' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </span>
                    <input
                      type="text"
                      placeholder="Filter..."
                      onChange={(e) => handleFilter(column, e.target.value)}
                      data-testid={`filter-${column}`}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length > 0 ? (
              sortedData.map((item, index) => (
                <tr 
                  key={index}
                  style={item.Status === 'Out of stock' ? { backgroundColor: '#ffebee' } : {}}
                  data-status={item.Status === 'Out of stock' ? 'out-of-stock' : ''}
                >
                  {selectedColumns.map(column => (
                    <td key={column}>
                      {column === 'Price' ? `$${Number(item[column]).toFixed(2)}` : item[column]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={selectedColumns.length} className="no-data">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid-footer">
        <div className="row-count">
          Showing {sortedData.length} of {data.length} entries
        </div>
      </div>
    </div>
  );
};

LiveDataGrid.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  onSort: PropTypes.func,
  onFilter: PropTypes.func
};

export default LiveDataGrid; 