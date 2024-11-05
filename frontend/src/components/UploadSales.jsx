import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import SalesChart from './SalesChart';

const UploadSales = ({ setIsProcessing }) => {
  const [file, setFile] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [salesSummary, setSalesSummary] = useState([]);
  const [inventoryUpdates, setInventoryUpdates] = useState([]);
  const [isLiveUpdate, setIsLiveUpdate] = useState(false);

  useEffect(() => {
    // Fetch live inventory updates if they occur
    if (isLiveUpdate) {
      async function fetchUpdatedInventory() {
        try {
          const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/inventory/live-updates`);
          const data = await response.json();
          setInventoryUpdates(data);
        } catch (error) {
          console.error('Error fetching live inventory updates:', error);
        }
      }

      const interval = setInterval(fetchUpdatedInventory, 10000); // Polling every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isLiveUpdate]);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = useCallback(async () => {
    if (!file) {
      alert('Please upload a file.');
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5000/upload_sales', formData);
      const cleanedData = response.data.cleanedSalesData; // Extracted and cleaned data from the server
      setSalesData(cleanedData);
      setSalesSummary(response.data.summary);
      setErrorMsg('');
      setIsLiveUpdate(true); // Enable live updates if data affects inventory
    } catch (error) {
      console.error('Error uploading sales data:', error);
      setErrorMsg('Failed to upload sales data.');
      setSalesData([]);
    } finally {
      setIsProcessing(false);
    }
  }, [file, setIsProcessing]);

  return (
    <div>
      <h2>Upload Sales Data</h2>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload Sales</button>

      {salesSummary.length > 0 && (
        <div>
          <h3>Sales Summary</h3>
          <table>
            <thead>
              <tr>
                <th>Meal Period</th>
                <th>Gross Revenue</th>
                <th>Net Revenue</th>
                <th>Taxes</th>
              </tr>
            </thead>
            <tbody>
              {salesSummary.map((item, index) => (
                <tr key={index}>
                  <td>{item.mealPeriod}</td>
                  <td>${item.grossRevenue.toFixed(2)}</td>
                  <td>${item.netRevenue.toFixed(2)}</td>
                  <td>${item.taxes.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inventoryUpdates.length > 0 && (
        <div>
          <h3>Live Inventory Updates</h3>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Updated Price</th>
                <th>Last Update Time</th>
              </tr>
            </thead>
            <tbody>
              {inventoryUpdates.map((update, index) => (
                <tr key={index}>
                  <td>{update.itemName}</td>
                  <td>${update.newPrice.toFixed(2)}</td>
                  <td>{new Date(update.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {errorMsg && <div className="error-msg">{errorMsg}</div>}
    </div>
  );
};

UploadSales.propTypes = {
  setIsProcessing: PropTypes.func.isRequired,
};

export default UploadSales;
