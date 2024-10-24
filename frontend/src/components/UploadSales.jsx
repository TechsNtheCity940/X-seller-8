import React, { useState } from 'react';
import axios from 'axios';
import SalesChart from './SalesChart';

const UploadSales = ({ setIsProcessing }) => {
  const [file, setFile] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [salesChartData, setSalesChartData] = useState([]);
  const [costChartData, setCostChartData] = useState([]);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please upload a file.');
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5000/upload_sales', formData);
      setSalesData(response.data);
      setSalesChartData(response.data.monthlySales);
      setCostChartData(response.data.monthlyCosts);
      setErrorMsg('');
    } catch (error) {
      setErrorMsg('Failed to upload sales data.');
      setSalesData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <h2>Upload Sales Data</h2>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload Sales</button>

      {salesData && (
        <div>
          <h3>Sales Summary</h3>
          <p>Total Sales: ${salesData.totalSales}</p>
          <p>Average Monthly Sales: ${salesData.averageMonthlySales}</p>
          <SalesChart salesData={salesChartData} costData={costChartData} />
        </div>
      )}

      {errorMsg && <div className="error-msg">{errorMsg}</div>}
    </div>
  );
};

export default UploadSales;
