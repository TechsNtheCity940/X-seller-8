import PropTypes from 'prop-types';
import { config } from '../config/config';

const Sidebar = ({ activeView, onViewChange }) => {
  const menuItems = [
    { id: 'upload', label: 'Upload Data', icon: '📤' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <img src={`${config.paths.uploads}/logo.png`} alt="XSeller8 Logo" className="logo" />
      </div>
      <nav>
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`nav-button ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="icon">{item.icon}</span>
            <span className="label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

Sidebar.propTypes = {
  activeView: PropTypes.string.isRequired,
  onViewChange: PropTypes.func.isRequired
};

export default Sidebar; 