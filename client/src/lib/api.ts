import axios from 'axios';

// Dynamic API URL for Replit environment
// Backend runs on port 5500, API is at /api/v1
const getApiBaseUrl = () => {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5500';
  return `${base}/api/v1`;
};

const API_BASE_URL = getApiBaseUrl();

console.log('API Base URL:', API_BASE_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000,
});

// ===================================================================
// REQUEST DEDUPLICATION
// Track in-flight GET requests to prevent duplicate calls
// ===================================================================
const inflightRequests = new Map<string, AbortController>();

function getRequestKey(config: any): string | null {
  // Only deduplicate GET requests
  if (config.method?.toUpperCase() !== 'GET') return null;
  return `${config.method}:${config.baseURL || ''}${config.url}`;
}

// Request interceptor to attach auth token and handle deduplication
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Deduplicate identical GET requests
  const key = getRequestKey(config);
  if (key) {
    const existing = inflightRequests.get(key);
    if (existing) {
      existing.abort();
    }
    const controller = new AbortController();
    config.signal = config.signal || controller.signal;
    inflightRequests.set(key, controller);
  }

  return config;
});

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Clean up inflight tracking
    const key = getRequestKey(response.config);
    if (key) inflightRequests.delete(key);
    return response;
  },
  async (error) => {
    // Clean up inflight tracking
    if (error.config) {
      const key = getRequestKey(error.config);
      if (key) inflightRequests.delete(key);
    }

    // Don't process cancelled requests
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      const isAuthEndpoint = originalRequest.url?.includes('/auth/');

      const errorMessage = error.response?.data?.message || error.response?.data?.error || '';
      const isContextError = errorMessage.toLowerCase().includes('tenant') ||
                             errorMessage.toLowerCase().includes('context');

      if (!isAuthEndpoint && !isContextError) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken } = response.data;
            localStorage.setItem('accessToken', accessToken);

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(error);
        }
      }
    }

    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
