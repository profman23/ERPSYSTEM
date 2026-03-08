/**
 * ProtectedRoute - HARDENED Multi-Panel Access Control
 * 
 * PHASE 3 HARDENED - Dec 2024
 * 
 * SECURITY GUARANTEES:
 * 1. Authentication required for all protected routes
 * 2. Panel-level scope enforcement (system/admin/app isolation)
 * 3. Token expiry validation with auto-refresh
 * 4. Cross-tab session synchronization
 * 5. Scope change detection during active session
 * 6. URL manipulation prevention
 * 
 * Access Rules:
 * - /system/* → Only 'system' scope users
 * - /app/*    → All authenticated users (system, tenant, branch, etc.)
 */

import { useEffect, useState, useCallback } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { 
  getCurrentPanelFromPath, 
  isPanelAccessAllowed, 
  getScopeBasePath 
} from '@/hooks/useScopePath';

interface ProtectedRouteProps {
  allowedScopes?: string[];
  redirectTo?: string;
}

const STORAGE_SYNC_KEY = 'auth_sync';
const TOKEN_CHECK_INTERVAL = 30000;

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000;
    return Date.now() >= expiryTime;
  } catch {
    return true;
  }
}

function isTokenExpiringSoon(token: string, thresholdMs: number = 60000): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000;
    const timeUntilExpiry = expiryTime - Date.now();
    return timeUntilExpiry > 0 && timeUntilExpiry < thresholdMs;
  } catch {
    return true;
  }
}

export default function ProtectedRoute({ allowedScopes, redirectTo }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, accessToken, refreshAccessToken, logout } = useAuth();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);

  const validateAndRefreshToken = useCallback(async () => {
    if (!accessToken) {
      setIsValidating(false);
      return;
    }

    if (isTokenExpired(accessToken)) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        await logout();
      }
    } else if (isTokenExpiringSoon(accessToken)) {
      await refreshAccessToken();
    }

    setIsValidating(false);
  }, [accessToken, refreshAccessToken, logout]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      validateAndRefreshToken();
    } else if (!isLoading) {
      setIsValidating(false);
    }
  }, [isLoading, isAuthenticated, validateAndRefreshToken]);

  useEffect(() => {
    if (!accessToken) return;

    const interval = setInterval(() => {
      if (isTokenExpiringSoon(accessToken)) {
        refreshAccessToken();
      }
    }, TOKEN_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken' && !e.newValue) {
        logout();
      }
      
      if (e.key === 'user' && e.newValue) {
        try {
          const newUser = JSON.parse(e.newValue);
          if (user && newUser.accessScope !== user.accessScope) {
            window.location.reload();
          }
        } catch {
        }
      }

      if (e.key === STORAGE_SYNC_KEY) {
        window.location.reload();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user, logout]);

  if (isLoading || isValidating) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--color-accent)' }} />
          <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userScope = user.accessScope || 'branch';
  const currentPanel = getCurrentPanelFromPath(location.pathname);

  if (currentPanel && !isPanelAccessAllowed(userScope, currentPanel)) {
    const correctPath = `${getScopeBasePath(userScope)}/dashboard`;
    return <Navigate to={correctPath} replace />;
  }

  if (allowedScopes && allowedScopes.length > 0) {
    if (!allowedScopes.includes(userScope)) {
      if (redirectTo) {
        return <Navigate to={redirectTo} replace />;
      }

      const correctPath = `${getScopeBasePath(userScope)}/dashboard`;
      return <Navigate to={correctPath} replace />;
    }
  }

  return <Outlet />;
}

export function useSessionSync() {
  const triggerSync = useCallback(() => {
    localStorage.setItem(STORAGE_SYNC_KEY, Date.now().toString());
    localStorage.removeItem(STORAGE_SYNC_KEY);
  }, []);

  return { triggerSync };
}
