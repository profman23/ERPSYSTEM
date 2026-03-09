/**
 * AuthContext - HARDENED Authentication Context
 *
 * Split into Data + Actions contexts to prevent cascading re-renders.
 * Token refresh no longer re-renders components that only use actions (login, logout).
 *
 * Hooks:
 * - useAuth()        → full context (backward compatible)
 * - useAuthData()    → user, token, isAuthenticated, isLoading (re-renders on data change)
 * - useAuthActions() → login, logout, refresh (stable references, never re-renders)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api/v1`;
  }
  return 'http://localhost:5500/api/v1';
};

const API_URL = getApiUrl();

const SESSION_VERSION_KEY = 'session_version';
const AUTH_SYNC_KEY = 'auth_sync_event';

interface UserBranch {
  id: string;
  name: string;
  code: string;
  city?: string | null;
  country?: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  accessScope: string;
  tenantId: string | null;
  businessLineId: string | null;
  branchId: string | null;
  allowedBranchIds: string[];
  branches: UserBranch[];
}

interface TokenPayload {
  sub: string;
  exp: number;
  iat: number;
  accessScope?: string;
  tenantId?: string | null;
}

// --- Split context types ---

interface AuthDataContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionVersion: number;
}

interface AuthActionsContextType {
  login: (tenantCode: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  validateSession: () => Promise<boolean>;
  forceSessionRefresh: () => void;
}

// Combined type for backward compatibility
type AuthContextType = AuthDataContextType & AuthActionsContextType;

// --- Contexts ---
const AuthDataContext = createContext<AuthDataContextType | undefined>(undefined);
const AuthActionsContext = createContext<AuthActionsContextType | undefined>(undefined);

// --- Hooks ---

/** Full auth context (backward compatible) */
export const useAuth = (): AuthContextType => {
  const data = useContext(AuthDataContext);
  const actions = useContext(AuthActionsContext);
  if (!data || !actions) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return useMemo(() => ({ ...data, ...actions }), [data, actions]);
};

/** Data-only hook: re-renders only when user/token/loading changes */
export const useAuthData = (): AuthDataContextType => {
  const context = useContext(AuthDataContext);
  if (!context) {
    throw new Error('useAuthData must be used within an AuthProvider');
  }
  return context;
};

/** Actions-only hook: stable references, never causes re-renders */
export const useAuthActions = (): AuthActionsContextType => {
  const context = useContext(AuthActionsContext);
  if (!context) {
    throw new Error('useAuthActions must be used within an AuthProvider');
  }
  return context;
};

// --- Utilities ---

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

// --- Provider ---

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionVersion, setSessionVersion] = useState(0);

  // Refs for stable callback references (avoids re-creating callbacks on state change)
  const userRef = useRef(user);
  const accessTokenRef = useRef(accessToken);
  const sessionVersionRef = useRef(sessionVersion);
  userRef.current = user;
  accessTokenRef.current = accessToken;
  sessionVersionRef.current = sessionVersion;

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
    localStorage.removeItem('user-style-preferences');
    sessionStorage.removeItem('vet_erp_active_branch');
    sessionStorage.removeItem('vet_erp_branch_selected');
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

      const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
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

  const login = useCallback(async (tenantCode: string, email: string, password: string): Promise<User> => {
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

      // Hydrate user style preferences from server response
      const stylePrefs = response.data.user?.preferences?.style;
      if (stylePrefs && typeof stylePrefs === 'object') {
        try { localStorage.setItem('user-style-preferences', JSON.stringify(stylePrefs)); } catch { /* ignore */ }
      }

      setAccessToken(newAccessToken);
      setUser(loginUser);
      incrementSessionVersion();

      return loginUser;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      throw new Error(errorMessage);
    }
  }, [incrementSessionVersion]);

  // --- Effects ---

  // Initialize auth on mount
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

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken' && !e.newValue) {
        clearAuthState();
      }

      if (e.key === 'user' && e.newValue) {
        try {
          const newUser = JSON.parse(e.newValue);
          if (userRef.current && newUser.accessScope !== userRef.current.accessScope) {
            setUser(newUser);
            window.location.reload();
          }
        } catch {
          // ignore
        }
      }

      if (e.key === SESSION_VERSION_KEY && e.newValue) {
        const newVersion = parseInt(e.newValue, 10);
        if (newVersion > sessionVersionRef.current) {
          window.location.reload();
        }
      }

      if (e.key === AUTH_SYNC_KEY) {
        window.location.reload();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [clearAuthState]);

  // Auto token refresh before expiry
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

  // --- Memoized context values ---

  const dataValue = useMemo<AuthDataContextType>(() => ({
    user,
    accessToken,
    isAuthenticated: !!user && !!accessToken && isTokenValid(accessToken),
    isLoading,
    sessionVersion,
  }), [user, accessToken, isLoading, sessionVersion]);

  const actionsValue = useMemo<AuthActionsContextType>(() => ({
    login,
    logout,
    refreshAccessToken,
    validateSession,
    forceSessionRefresh,
  }), [login, logout, refreshAccessToken, validateSession, forceSessionRefresh]);

  return (
    <AuthActionsContext.Provider value={actionsValue}>
      <AuthDataContext.Provider value={dataValue}>
        {children}
      </AuthDataContext.Provider>
    </AuthActionsContext.Provider>
  );
};
