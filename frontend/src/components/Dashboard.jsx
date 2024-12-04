import { useState } from 'react';
import { useApp } from '../context/AppContext';
import FileUpload from './FileUpload';
import LiveDataGrid from './LiveDataGrid';
import Inventory from './Inventory';
import CostTracking from './CostTracking';
import InventoryBarChart from './InventoryBarChart';
import Forecasting from './Forecasting';
import SalesChart from './SalesChart';
import Chatbot from './Chatbot';
import Sidebar from './Sidebar';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { inventory, loading, error, refreshInventory } = useApp();
  const [activeView, setActiveView] = useState('inventory');
  const [uploadedData, setUploadedData] = useState([]);

  const handleFileUpload = (data) => {
    setUploadedData(data);
    refreshInventory(); // Refresh inventory after new data upload
    toast.success('Data uploaded successfully');
  };

  const handleDataUpdate = (newData) => {
    setUploadedData(newData);
    refreshInventory();
  };

  if (error) {
    toast.error(error);
  }

  const renderContent = () => {
    switch (activeView) {
      case 'upload':
        return (
          <FileUpload 
            onFileUpload={handleFileUpload} 
            onDataUpdate={handleDataUpdate}
          />
        );
      case 'inventory':
        return (
          <>
            <LiveDataGrid data={inventory} />
            <Inventory data={inventory} />
          </>
        );
      case 'analytics':
        return (
          <div className="analytics-container">
            <InventoryBarChart data={inventory} />
            <CostTracking invoices={uploadedData} />
            <Forecasting sales={uploadedData} />
            <SalesChart 
              salesData={inventory.map(item => item.price * item.ordered)}
              costData={inventory.map(item => item.price * item.confirmed)}
            />
          </div>
        );
      default:
        return <div>Select a view from the sidebar</div>;
    }
  };

  return (
    <div className="dashboard">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="dashboard-content">
        <header>
          <h1>XSeller8 - Inventory Management</h1>
        </header>
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          renderContent()
        )}
        <Chatbot />
      </main>
    </div>
  );
};

export default Dashboard; 