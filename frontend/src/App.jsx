import './App.css';
import { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload.jsx';
import Inventory from './components/Inventory.jsx';
import CostTracking from './components/CostTracking.jsx';
import InventoryBarChart from './components/InventoryBarChart.jsx';
import InventoryPriceTrend from './components/InventoryPriceTrend.jsx';
import Forecasting from './components/Forecasting.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import Chatbot from './components/Chatbot.jsx';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [activeTab, setActiveTab] = useState('fileUpload');
  const [invoices, setInvoices] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [inventoryFileContent, setInventoryFileContent] = useState('');

  // Fetch inventory data from inventory.json
  useEffect(() => {
    if (activeTab === 'inventory') {
      async function fetchInventoryFile() {
        setLoading(true);  // Added to ensure the loading indicator shows correctly during fetch
        try {
          const response = await fetch('http://localhost:5000/public/inventory.json'); // Changed to JSON for easier handling
          if (!response.ok) throw new Error(`Failed to load inventory file. Status: ${response.status}`);
          const data = await response.json();
          setInventoryData(data);
          setInventoryFileContent(JSON.stringify(data, null, 2));  // Pretty format JSON for display
        } catch (error) {
          console.error("Error loading inventory data:", error);
          setInventoryFileContent("Error loading inventory data");
        } finally {
          setLoading(false);
        }
      }
      fetchInventoryFile();
    }
  }, [activeTab]);

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

  const handleFileUpload = (file) => {
    console.log('File uploaded:', file);
    toast.success('File uploaded successfully!');
  };

  const renderContent = () => {
    if (loading) {
      return <div className="loading-indicator">Loading...</div>;
    }
  
    return (
      <div className="content-container">
        {activeTab === 'fileUpload' && (
          <ErrorBoundary>
            <FileUpload onFileUpload={handleFileUpload} />
          </ErrorBoundary>
        )}
        {activeTab === 'costTracking' && (
          <ErrorBoundary>
            <CostTracking invoices={invoices} />
          </ErrorBoundary>
        )}
        {activeTab === 'inventory' && (
          <ErrorBoundary>
            <div>
              <Inventory data={inventoryData} />
              <InventoryBarChart data={inventoryData} />
              <InventoryPriceTrend data={inventoryData} />
              <div className="scrollable-json-container">
                <h3>Live Inventory Data (JSON)</h3>
                <pre className="scrollable-json">{inventoryFileContent}</pre>
              </div>
            </div>
          </ErrorBoundary>
        )}
        {activeTab === 'forecasting' && (
          <ErrorBoundary>
            <Forecasting sales={sales} />
          </ErrorBoundary>
        )}
      </div>
    );
  };

  return (
    <div className="App">
      <div className="background"></div>
      <img src="/TiTCneons.png" alt="Corner Logo" className="corner-logo" />
      <aside className="sidebar">
        <h1>XseLLer8</h1>
        <img src="/logo.png" alt="XseLLer8 Logo" className="logo" />
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
        </nav>
      </aside>
      <main className="content-area">
        {renderContent()}
      </main>
      {/* Persistent chatbox component */}
      <div className="chatbox-wrapper">
        <Chatbot />
      </div>
      
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} closeOnClick pauseOnHover draggable />
    </div>
  );
}

export default App;