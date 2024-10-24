import './App.css';
import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload.jsx';  // Import the file upload component
import Inventory from './components/Inventory.jsx'; // Import the Inventory component
import CostTracking from './components/CostTracking.jsx';  // Cost tracking component
import InventoryBarChart from './components/InventoryBarChart.jsx';  // Bar chart for inventory
import InventoryPriceTrend from './components/InventoryPriceTrend.jsx';  // Price trend chart
import Forecasting from './components/Forecasting.jsx';  // Forecasting component
import ChatBox from './components/ChatBox.jsx'; // Import the ChatBox component
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [activeTab, setActiveTab] = useState('fileUpload');
  const [invoices, setInvoices] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);

  // Fetch inventory data from the server (backend)
  useEffect(() => {
    async function fetchInventoryData() {
      try {
        const response = await fetch('http://localhost:5000/inventory');
        const data = await response.json();
        setInventoryData(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching inventory data:", error);
        setLoading(false);
      }
    }

    fetchInventoryData();
  }, []);

  // Handle file upload and update the inventory
  const handleFileUpload = (parsedData) => {
    setInvoices([...invoices, ...parsedData]);
    updateInventory(parsedData);
    updateCostTracking(parsedData);
    toast.success('File uploaded successfully!');
  };

  const updateInventory = (invoiceData) => {
    const updatedInventory = invoiceData.map(item => ({
      itemNumber: item.itemNumber,
      itemName: item.name,
      brand: item.brand,
      packSize: item.packSize,
      price: item.price,
      ordered: item.quantity,
      status: item.status,
    }));

    setInventoryData([...inventoryData, ...updatedInventory]);
  };

  const updateCostTracking = (invoiceData) => {
    const totalCost = invoiceData.reduce((acc, item) => acc + item.price * item.quantity, 0);
    setSales([...sales, { month: new Date().getMonth(), cost: totalCost }]);
  };

  const renderContent = () => {
    if (loading) {
      return <div>Loading...</div>;
    }

    return (
      <div className="content-container">
        {activeTab === 'fileUpload' && <FileUpload onFileUpload={handleFileUpload} />}
        {activeTab === 'costTracking' && <CostTracking invoices={invoices} />}
        {activeTab === 'inventory' && (
          <div>
            <Inventory data={inventoryData} />  {/* Inventory Table */}
            <InventoryBarChart data={inventoryData} />  {/* Inventory Bar Chart */}
            <InventoryPriceTrend data={inventoryData} />  {/* Inventory Price Trend */}
          </div>
        )}
        {activeTab === 'forecasting' && <Forecasting sales={sales} />}
        {activeTab === 'chat' && <ChatBox />}  {/* Render the ChatBox component */}
      </div>
    );
  };

  return (
    <div className="App">
      <div className="background"></div>
      <img src={`${process.env.PUBLIC_URL}/TiTCneons.png`} alt="Corner Logo" className="corner-logo" />
      <aside className="sidebar">
        <h1>XseLLer8</h1>
        <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="XseLLer8 Logo" className="logo" />
        <nav>
          <button className={activeTab === 'fileUpload' ? 'active' : ''} onClick={() => setActiveTab('fileUpload')}>
            Upload Invoice
          </button>
          <button className={activeTab === 'costTracking' ? 'active' : ''} onClick={() => setActiveTab('costTracking')}>
            Cost Tracking
          </button>
          <button className={activeTab === 'inventory' ? 'active' : ''} onClick={() => setActiveTab('inventory')}>
            Inventory
          </button>
          <button className={activeTab === 'forecasting' ? 'active' : ''} onClick={() => setActiveTab('forecasting')}>
            Forecasting
          </button>
          <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')}>
            AI Chat
          </button>  {/* Add a button for the AI Chat */}
        </nav>
      </aside>
      <main className="content-area">
        {renderContent()}
      </main>
      
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} closeOnClick pauseOnHover draggable />
    </div>
  );
}

export default App;