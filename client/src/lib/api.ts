import axios from 'axios';

// Dynamic API URL for Replit environment
// Backend ALWAYS runs on port 3000
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // For Replit: Remove any existing port and ALWAYS append :3000
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Remove existing port (if any) then add :3000
    const baseWithoutPort = origin.replace(/:\d+$/, '');
    return `${baseWithoutPort}:3000`;
  }
  
  // Fallback for SSR or build time
  return 'http://localhost:3000';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔧 API Base URL:', API_BASE_URL);

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
