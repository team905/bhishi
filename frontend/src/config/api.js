// API configuration
// Uses REACT_APP_API_URL in production (Railway)
// Falls back to localhost in development

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005';

export const getApiUrl = (endpoint) => {
  // Remove leading slash if present, we'll add it
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // If API_BASE_URL is set (production), use it; otherwise use localhost (development)
  if (API_BASE_URL) {
    // Ensure endpoint starts with /api
    const apiEndpoint = cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;
    return `${API_BASE_URL}${apiEndpoint}`;
  }
  
  // Development fallback
  return `http://localhost:5005/api${cleanEndpoint}`;
};

export default API_BASE_URL;

