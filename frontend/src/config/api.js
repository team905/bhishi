// API configuration
// Automatically uses relative URLs in production (Vercel handles routing)
// Falls back to localhost in development

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export const getApiUrl = (endpoint) => {
  // Remove leading slash if present, we'll add it
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // If API_BASE_URL is set, use it; otherwise use relative URL (works with Vercel)
  if (API_BASE_URL) {
    return `${API_BASE_URL}${cleanEndpoint}`;
  }
  
  // Relative URL - Vercel will route /api/* to serverless functions
  return `/api${cleanEndpoint}`;
};

export default API_BASE_URL;

