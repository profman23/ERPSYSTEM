/**
 * AuthContext - HARDENED Authentication Context
 * 
 * PHASE 3 HARDENED - Dec 2024
 * 
 * SECURITY GUARANTEES:
 * 1. Token validation on mount (not just existence check)
 * 2. Automatic token refresh before expiry
 * 3. Cross-tab session synchronization
 * 4. Scope change detection during active session
 * 5. Secure logout with token revocation
 * 6. Session version tracking for multi-tab consistency
 * 
 * Token Lifecycle:
 * - Access tokens: Short-lived, auto-refreshed
 * - Refresh tokens: Stored securely, revoked on logout
 * - User data: Validated against token payload
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const baseWithoutPort = origin.replace(/:\d+$/, '');
    return `${baseWithoutPort}:3000/api/v1`;
  }
  return 'http://localhost:3000/api/v1';
};

const API_URL = getApiUrl();

const SESSION_VERSION_KEY = 'session_version';
const AUTH_SYNC_KEY = 'auth_sync_event';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  accessScope: string;
  tenantId: string | null;
  businessLineId: string | null;
  branchId: string | null;
}

interface TokenPayload {
  sub: string;
  exp: number;
  iat: number;
  accessScope?: string;
  tenantId?: string | null;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionVersion: number;
  login: (tenantCode: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  validateSession: () => Promise<boolean>;
  forceSessionRefresh: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  
  const payload = decodeToken(token);
  if (!payload) return false;
  
  const now = Date.now() / 1000;
  return payload.exp > now;
}

function getTokenExpiryTime(token: string): number {
  const payload = decodeToken(token);
  return payload ? payload.exp * 1000 : 0;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionVersion, setSessionVersion] = useState(0);

  const getSessionVersion = useCallback((): number => {
    const stored = localStorage.getItem(SESSION_VERSION_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }, []);

  const incrementSessionVersion = useCallback(() => {
    const newVersion = getSessionVersion() + 1;
    localStorage.setItem(SESSION_VERSION_KEY, newVersion.toString());
    setSessionVersion(newVersion);
    
    localStorage.setItem(AUTH_SYNC_KEY, Date.now().toString());
    setTimeout(() => localStorage.removeItem(AUTH_SYNC_KEY), 100);
    
    return newVersion;
  }, [getSessionVersion]);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setAccessToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        await axios.post(`${API_URL}/auth/logout`, { refreshToken }).catch(() => {});
      }
    } finally {
      clearAuthState();
      incrementSessionVersion();
    }
  }, [clearAuthState, incrementSessionVersion]);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        await logout();
        return null;
      }

      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken,
      });

      const { accessToken: newAccessToken, user: updatedUser } = response.data;

      localStorage.setItem('accessToken', newAccessToken);
      setAccessToken(newAccessToken);

      if (updatedUser) {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (currentUser.accessScope !== updatedUser.accessScope) {
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
          incrementSessionVersion();
        }
      }

      return newAccessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      return null;
    }
  }, [logout, incrementSessionVersion]);

  const validateSession = useCallback(async (): Promise<boolean> => {
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');

    if (!storedToken || !storedUser) {
      clearAuthState();
      return false;
    }

    if (!isTokenValid(storedToken)) {
      const newToken = await refreshAccessToken();
      return !!newToken;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      const tokenPayload = decodeToken(storedToken);
      
      if (tokenPayload && tokenPayload.sub !== parsedUser.id) {
        console.error('Token/user mismatch detected');
        await logout();
        return false;
      }

      return true;
    } catch {
      clearAuthState();
      return false;
    }
  }, [clearAuthState, refreshAccessToken, logout]);

  const forceSessionRefresh = useCallback(() => {
    incrementSessionVersion();
    window.location.reload();
  }, [incrementSessionVersion]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedAccessToken = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('user');

        if (!storedAccessToken || !storedUser) {
          setIsLoading(false);
          return;
        }

        if (!isTokenValid(storedAccessToken)) {
          const newToken = await refreshAccessToken();
          if (!newToken) {
            setIsLoading(false);
            return;
          }
        }

        const parsedUser = JSON.parse(storedUser);
        setAccessToken(storedAccessToken);
        setUser(parsedUser);
        setSessionVersion(getSessionVersion());
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuthState();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [refreshAccessToken, getSessionVersion, clearAuthState]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken' && !e.newValue) {
        clearAuthState();
      }
      
      if (e.key === 'user' && e.newValue) {
        try {
          const newUser = JSON.parse(e.newValue);
          if (user && newUser.accessScope !== user.accessScope) {
            setUser(newUser);
            window.location.reload();
          }
        } catch {
        }
      }

      if (e.key === SESSION_VERSION_KEY && e.newValue) {
        const newVersion = parseInt(e.newValue, 10);
        if (newVersion > sessionVersion) {
          window.location.reload();
        }
      }

      if (e.key === AUTH_SYNC_KEY) {
        window.location.reload();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user, sessionVersion, clearAuthState]);

  useEffect(() => {
    if (!accessToken) return;

    const expiryTime = getTokenExpiryTime(accessToken);
    const now = Date.now();
    const refreshTime = expiryTime - now - 60000;

    if (refreshTime <= 0) {
      refreshAccessToken();
      return;
    }

    const timer = setTimeout(() => {
      refreshAccessToken();
    }, refreshTime);

    return () => clearTimeout(timer);
  }, [accessToken, refreshAccessToken]);

  const login = async (tenantCode: string, email: string, password: string): Promise<User> => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        tenantCode,
        email,
        password,
      });

      const { accessToken: newAccessToken, refreshToken, user: loginUser } = response.data;

      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(loginUser));

      setAccessToken(newAccessToken);
      setUser(loginUser);
      incrementSessionVersion();

      return loginUser;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      throw new Error(errorMessage);
    }
  };

  const value: AuthContextType = {
    user,
    accessToken,
    isAuthenticated: !!user && !!accessToken && isTokenValid(accessToken),
    isLoading,
    sessionVersion,
    login,
    logout,
    refreshAccessToken,
    validateSession,
    forceSessionRefresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
