import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [excelPath, setExcelPath] = useState('');
  const [logs, setLogs] = useState([]);  // System log state
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false); // Loading state

  // Reference to the scrollable div for scroll lock
  const textDisplayRef = useRef(null);

  // Scroll to the bottom whenever new text is added
  useEffect(() => {
    if (textDisplayRef.current) {
      textDisplayRef.current.scrollTop = textDisplayRef.current.scrollHeight;
    }
  }, [extractedText, logs]);

  const logAction = (message) => {
    setLogs(prevLogs => [...prevLogs, message]);
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    logAction('File selected: ' + event.target.files[0].name);
  };

  const handleProcess = async () => {
    if (!file) {
      alert('Please upload a file first.');
      return;
    }

    logAction('Starting file processing...');
    setLoading(true); // Set loading state
    const formData = new FormData();
    formData.append('file', file);
    formData.append('deliveryDate', '2024-10-12');
    formData.append('invoiceTotal', '500');

    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/process`, formData);
      setExtractedText(response.data.extractedText);
      setExcelPath(response.data.excelPath);
      logAction('File processed successfully.');
      setSuccessMsg('File processed and Excel generated successfully.');
      setErrorMsg('');
    } catch (error) {
      console.error('Error processing file:', error.response || error);
      logAction('Error during file processing: ' + error.message);
      setErrorMsg('Failed to process the file.');
      setSuccessMsg('');
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  const handleDownload = () => {
    if (!excelPath) {
      alert('No file available for download.');
      return;
    }

    logAction('Downloading Excel file...');
    window.open(`${import.meta.env.VITE_BACKEND_URL}/download/${excelPath}`);
  };

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

export default FileUpload;
