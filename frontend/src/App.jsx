import React, { useState, useEffect } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import LiveDataGrid from './components/LiveDataGrid';
import Inventory from './components/Inventory';
import CostTracking from './components/CostTracking';
import InventoryBarChart from './components/InventoryBarChart';
import Forecasting from './components/Forecasting';
import SalesChart from './components/SalesChart';
import ErrorBoundary from './components/ErrorBoundary';
import Chatbot from './components/Chatbot';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [uploadedData, setUploadedData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (data) => {
    setUploadedData(data);
  };

  const handleDataUpdate = (newData) => {
    setUploadedData(newData);
  };

  return (
    <ErrorBoundary>
      <div className="app">
        <ToastContainer />
        <header>
          <h1>XSeller8 - Inventory Management</h1>
        </header>
        <main>
          <div className="upload-section">
            <FileUpload 
              onFileUpload={handleFileUpload} 
              onDataUpdate={handleDataUpdate}
              setIsProcessing={setIsProcessing}
            />
          </div>
          {uploadedData.length > 0 && (
            <>
              <div className="data-grid-section">
                <LiveDataGrid data={uploadedData} />
              </div>
              <div className="inventory-section">
                <Inventory data={uploadedData} />
              </div>
              <div className="charts-section">
                <InventoryBarChart data={uploadedData} />
                <CostTracking invoices={uploadedData} />
                <Forecasting sales={uploadedData} />
                <SalesChart 
                  salesData={uploadedData.map(item => item.price * item.ordered)}
                  costData={uploadedData.map(item => item.price * item.confirmed)}
                />
              </div>
            </>
          )}
          <div className="chatbot-section">
            <Chatbot />
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;