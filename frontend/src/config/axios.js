// Axios configuration for API calls
import axios from 'axios';
import { getApiUrl } from './api';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  timeout: 30000,
});

// Request interceptor to add API path
apiClient.interceptors.request.use(
  (config) => {
    // If baseURL is not set, use getApiUrl for each request
    if (!config.baseURL) {
      config.url = getApiUrl(config.url);
    } else {
      // If baseURL is set, ensure URL starts with /
      if (!config.url.startsWith('/')) {
        config.url = '/' + config.url;
      }
    }
    
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

