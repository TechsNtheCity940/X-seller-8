import React, { useState } from 'react';

const Settings = () => {
  const [ocrLanguage, setOcrLanguage] = useState('eng');
  const [message, setMessage] = useState('');

  const handleSave = () => {
    localStorage.setItem('ocrLanguage', ocrLanguage);
    setMessage('Settings saved!');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="settings">
      <h2>Settings</h2>
      <label>OCR Language: </label>
      <select value={ocrLanguage} onChange={(e) => setOcrLanguage(e.target.value)}>
        <option value="eng">English</option>
        <option value="spa">Spanish</option>
        {/* Add more languages as needed */}
      </select>
      <button onClick={handleSave}>Save Settings</button>
      {message && <p className="success-message">{message}</p>}
    </div>
  );
};

export default Settings;
