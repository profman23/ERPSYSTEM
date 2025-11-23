import axios from 'axios';

// Dynamic API URL for Replit environment
// In Replit, backend runs on port 3000, accessible via the same domain
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // For Replit: Use the current origin and replace port with 3000
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Replace any port in the origin with :3000 for backend
    return origin.replace(/:\d+$/, ':3000');
  }
  
  // Fallback for SSR or build time
  return 'http://localhost:3000';
};

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);
