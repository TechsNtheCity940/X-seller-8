import React, { useState, useEffect } from 'react';

const ProcessedFiles = () => {
  const [processedFiles, setProcessedFiles] = useState([]);

  useEffect(() => {
    // Fetch processed files from the backend
    async function fetchProcessedFiles() {
      try {
        const response = await fetch('http://localhost:5000/files');  // Example endpoint
        const data = await response.json();
        setProcessedFiles(data);
      } catch (error) {
        console.error("Error fetching processed files:", error);
      }
    }
    fetchProcessedFiles();
  }, []);

  const handleDownload = (filePath) => {
    window.open(`http://localhost:5000/download/${filePath}`);
  };

  return (
    <div className="processed-files">
      <h2>Processed Files</h2>
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
        <p>No processed files available.</p>
      )}
    </div>
  );
};

export default ProcessedFiles;

