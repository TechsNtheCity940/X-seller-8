import axios from 'axios';
import { config } from '../config/config';

const api = axios.create({
  baseURL: config.api.baseUrl,
  timeout: 30000,
});

// Add request interceptor for error handling
api.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response?.status === 413) {
      throw new Error('File too large');
    }
    throw error;
  }
);

export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post('/process', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      onProgress?.(progress);
    }
  });
};

export const getInventory = () => api.get('/inventory');
export const getSales = () => api.get('/sales');
export const getForecast = () => api.get('/forecast');

export default api; 