// API configuration
// Automatically uses REACT_APP_API_URL in production (Firebase/Cloud Run)
// Falls back to relative path in development or if REACT_APP_API_URL is not set

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export const getApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Always add /api prefix since backend routes are mounted at /api
  const apiEndpoint = `/api${cleanEndpoint}`;
  
  if (API_BASE_URL) {
    // Production: Use full URL from environment variable + /api prefix
    // API_BASE_URL should be the base URL (e.g., https://backend-url.run.app)
    return `${API_BASE_URL}${apiEndpoint}`;
  }
  
  // Development: Use relative path with /api prefix
  return apiEndpoint;
};

export default API_BASE_URL;
