import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { uploadFile } from '../services/api';
import { config } from '../config/config';
import { toast } from 'react-toastify';

const FileUpload = ({ onFileUpload, onDataUpdate }) => {
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = (file) => {
    if (!config.uploads.allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type');
    }
    if (file.size > config.uploads.maxSize) {
      throw new Error('File too large');
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    try {
      validateFile(selectedFile);
      setFile(selectedFile);
      onFileUpload(selectedFile);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    try {
      const response = await uploadFile(file, setUploadProgress);
      onDataUpdate(response.data);
      setUploadProgress(0);
      toast.success('File processed successfully');
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
      setUploadProgress(0);
    }
  }, [file, onDataUpdate]);

  return (
    <div className="file-upload">
      <h2>Upload and Process Data</h2>
      
      <div className="upload-controls">
        <input
          type="file"
          onChange={handleFileChange}
          accept={config.uploads.allowedTypes.join(',')}
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
    </div>
  );
};

FileUpload.propTypes = {
  onFileUpload: PropTypes.func.isRequired,
  onDataUpdate: PropTypes.func.isRequired
};

export default FileUpload;