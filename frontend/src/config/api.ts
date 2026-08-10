// API Configuration
export const API_CONFIG = {
  // Default to port 5001 where the backend server is running
  // You can override this with REACT_APP_API_URL environment variable
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  TIMEOUT: 10000,
};

// Update the API service to use this configuration
export default API_CONFIG;
