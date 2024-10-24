import React from 'react';
import ReactDOM from 'react-dom/client';  // Import from 'react-dom/client' for React 18
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Instead of ReactDOM.render(), use createRoot
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();