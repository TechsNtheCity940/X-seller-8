import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const ProcessedFiles = () => {
  const [processedFiles, setProcessedFiles] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchProcessedFiles() {
      try {
        const response = await fetch('http://localhost:5000/files');
        if (!response.ok) throw new Error('Failed to fetch processed files');
        const data = await response.json();
        setProcessedFiles(data);
      } catch (error) {
        console.error("Error fetching processed files:", error);
        setError('Failed to load processed files');
      }
    }

    fetchProcessedFiles();
  }, []);

  const handleDownload = useCallback((filePath) => {
    window.open(`http://localhost:5000/download/${filePath}`);
  }, []);

  return (
    <div className="processed-files">
      <h2>Processed Files</h2>
      {error && <p className="error">{error}</p>}
      {processedFiles.length > 0 ? (
        <ul>
          {processedFiles.map((file, index) => (
            <li key={index}>
              <span>{file.name}</span>
              <button onClick={() => handleDownload(file.path)}>Download</button>
            </li>
          ))}
        </ul>
      ) : (
        !error && <p>No processed files available.</p>
      )}
    </div>
  );
};

ProcessedFiles.propTypes = {
  processedFiles: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    path: PropTypes.string,
  })),
};

export default ProcessedFiles;
