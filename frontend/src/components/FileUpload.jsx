import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const FileUpload = ({ onFileUpload, onDataUpdate }) => {
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [logs, setLogs] = useState([]);
  const textDisplayRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    // Connect to WebSocket
    wsRef.current = new WebSocket('ws://localhost:5000');
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onDataUpdate(data.payload);
      addLog(`Received update: ${JSON.stringify(data.payload)}`);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setErrorMsg('WebSocket connection error');
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [onDataUpdate]);

  const addLog = useCallback((message) => {
    setLogs(prevLogs => [...prevLogs, { message, timestamp: new Date().toISOString() }]);
    if (textDisplayRef.current) {
      textDisplayRef.current.scrollTop = textDisplayRef.current.scrollHeight;
    }
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileType = file.type;
      const validTypes = ['image/png', 'image/jpeg', 'application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      
      if (!validTypes.includes(fileType)) {
        addLogEntry('Invalid file type');
        return;
      }

      setFile(file);
      onFileUpload(file);
      addLog(`File selected: ${file.name}`);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      addLog('Starting file upload...');
      const response = await axios.post('http://localhost:5000/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
          addLog(`Upload progress: ${progress}%`);
        }
      });

      addLog('File processed successfully');
      if (response.data.text) {
        addLog(`Extracted text: ${response.data.text.substring(0, 100)}...`);
      }
      setUploadProgress(0);
      setErrorMsg('');
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMsg(`Error: ${error.message}`);
      addLog(`Error during upload: ${error.message}`);
      setUploadProgress(0);
    }
  };

  return (
    <div className="file-upload">
      <h2>Upload and Process Data</h2>
      
      <div className="upload-controls">
        <input
          type="file"
          onChange={handleFileChange}
          accept=".png,.jpg,.jpeg,.pdf,.csv,.xlsx"
          data-testid="file-input"
        />
        <button 
          onClick={handleUpload}
          disabled={!file}
          data-testid="upload-button"
        >
          Process File
        </button>
      </div>

      {uploadProgress > 0 && (
        <div className="progress-bar">
          <div 
            className="progress"
            style={{ width: `${uploadProgress}%` }}
            data-testid="progress-bar"
          >
            {uploadProgress}%
          </div>
        </div>
      )}

      {errorMsg && <div className="error-msg" data-testid="error-message">{errorMsg}</div>}
      
      <div className="system-log" ref={textDisplayRef} data-testid="system-log">
        <h3>System Log:</h3>
        <div className="log-entries">
          {logs.map((log, index) => (
            <div key={index} className="log-entry">
              <span className="timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span className="message">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

FileUpload.propTypes = {
  onFileUpload: PropTypes.func.isRequired,
  onDataUpdate: PropTypes.func.isRequired
};

export default FileUpload;