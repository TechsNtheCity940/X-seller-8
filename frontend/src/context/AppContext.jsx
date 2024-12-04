import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import WebSocketService from '../services/websocket';
import { getInventory } from '../services/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Connect WebSocket
    WebSocketService.connect();

    // Add WebSocket listener for inventory updates
    const removeListener = WebSocketService.addListener((data) => {
      if (data.type === 'INVENTORY_UPDATE') {
        setInventory(data.payload);
      }
    });

    // Initial inventory load
    loadInventory();

    return () => {
      removeListener();
      WebSocketService.disconnect();
    };
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await getInventory();
      setInventory(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    inventory,
    loading,
    error,
    refreshInventory: loadInventory
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

AppProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 