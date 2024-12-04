import { AppProvider } from './context/AppContext';
import { ToastContainer } from 'react-toastify';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './components/Dashboard';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <div className="app">
          <ToastContainer />
          <Dashboard />
        </div>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;