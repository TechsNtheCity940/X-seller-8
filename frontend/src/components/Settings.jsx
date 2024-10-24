import React, { useState } from 'react';

const Settings = () => {
  const [ocrLanguage, setOcrLanguage] = useState('eng'); // Example setting

  const handleSave = () => {
    alert('Settings saved!');
    // Save settings in backend or local storage
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
    </div>
  );
};

export default Settings;
