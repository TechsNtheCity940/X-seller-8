import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';

const FileUpload = ({ onFileUpload }) => {
  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [excelPath, setExcelPath] = useState('');
  const [logs, setLogs] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const textDisplayRef = useRef(null);

  useEffect(() => {
    if (textDisplayRef.current) {
      textDisplayRef.current.scrollTop = textDisplayRef.current.scrollHeight;
    }















    
  }, [extractedText, logs]);

  const logAction = (message, level = 'info') => {
    const logEntry = `[${new Date().toISOString()}] [${level.toUpperCase()}] - ${message}`;
    setLogs(prevLogs => [...prevLogs, logEntry]);
    console[level](logEntry);
    toast(message);
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    logAction('File selected: ' + selectedFile.name);
    if (onFileUpload) {
      onFileUpload(selectedFile);
    }
  };

  const handleProcess = useCallback(async () => {
    if (!file) {
      logAction('Please upload a file first.', 'error');
      return;
    }

    logAction('Starting file processing...');
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/process`, formData);
      setExtractedText(response.data.extractedText);
      setExcelPath(response.data.excelPath);
      logAction('File processed successfully.', 'info');
      setSuccessMsg('File processed and Excel generated successfully.');
      setErrorMsg('');
    } catch (error) {
      let errorMessage = 'Failed to process the file.';
      if (error.response) {
        errorMessage = `Request failed with status ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage = 'No response received from the server.';
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      logAction(`Error during file processing: ${errorMessage}`, 'error');
      setErrorMsg(errorMessage);
      setSuccessMsg('');
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleDownload = useCallback(() => {
    if (!excelPath) {
      logAction('No file available for download.', 'error');
      return;
    }

    logAction('Downloading Excel file...');
    window.open(`${import.meta.env.VITE_BACKEND_URL}/download/${excelPath}`);
  }, [excelPath]);

  return (
    <div className="file-upload-container">
      <h2>Upload and Process Invoice</h2>
      <div className="file-upload-section">
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleProcess} disabled={!file || loading}>
          {loading ? 'Processing...' : 'Process File'}
        </button>
      </div>
      {extractedText && (
        <div className="extracted-text">
          <h3>Extracted Text:</h3>
          <pre ref={textDisplayRef}>{extractedText}</pre>
        </div>
      )}
      {excelPath && (
        <button className="download-btn" onClick={handleDownload}>Download Excel</button>
      )}
      {successMsg && <div className="success-msg">{successMsg}</div>}
      {errorMsg && <div className="error-msg">{errorMsg}</div>}
      {logs.length > 0 && (
        <div className="system-log">
          <h3>System Log:</h3>
          <ul>
            {logs.map((log, index) => (
              <li key={index}>{log}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

FileUpload.propTypes = {
  onFileUpload: PropTypes.func,
};

export default FileUpload;
