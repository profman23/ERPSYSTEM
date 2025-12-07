/**
 * useSessionGuard Hook - HARDENED Session Security
 * 
 * PHASE 3 HARDENED - Dec 2024
 * 
 * SECURITY GUARANTEES:
 * 1. Real-time scope mismatch detection
 * 2. Multi-tab session synchronization
 * 3. Role change detection during active session
 * 4. Automatic redirect on scope violation
 * 5. Session integrity validation
 * 
 * Usage:
 * Call this hook in any component that needs session security.
 * It will automatically handle scope changes and multi-tab scenarios.
 */

import { useEffect, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getCurrentPanelFromPath, 
  isPanelAccessAllowed, 
  getScopeBasePath 
} from './useScopePath';

interface SessionGuardResult {
  isValid: boolean;
  isScopeMismatch: boolean;
  currentPanel: 'system' | 'admin' | 'app' | null;
  expectedPanel: 'system' | 'admin' | 'app';
  correctPath: string;
  forceRedirect: () => void;
}

const SCOPE_CHECK_INTERVAL = 5000;

export function useSessionGuard(): SessionGuardResult {
  const { user, isAuthenticated, validateSession, forceSessionRefresh } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isValid, setIsValid] = useState(true);
  const [isScopeMismatch, setIsScopeMismatch] = useState(false);

  const userScope = user?.accessScope || 'branch';
  const currentPanel = getCurrentPanelFromPath(location.pathname);
  
  const expectedPanel = (() => {
    switch (userScope) {
      case 'system': return 'system' as const;
      case 'tenant': return 'admin' as const;
      default: return 'app' as const;
    }
  })();

  const correctPath = `${getScopeBasePath(userScope)}/dashboard`;

  const checkScopeMismatch = useCallback(() => {
    if (!user || !currentPanel) {
      setIsScopeMismatch(false);
      return false;
    }

    const hasAccess = isPanelAccessAllowed(user.accessScope, currentPanel);
    setIsScopeMismatch(!hasAccess);
    return !hasAccess;
  }, [user, currentPanel]);

  const forceRedirect = useCallback(() => {
    navigate(correctPath, { replace: true });
  }, [navigate, correctPath]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsValid(false);
      return;
    }

    const mismatch = checkScopeMismatch();
    if (mismatch) {
      setIsValid(false);
      const timer = setTimeout(() => {
        forceRedirect();
      }, 2000);
      return () => clearTimeout(timer);
    }

    setIsValid(true);
  }, [isAuthenticated, checkScopeMismatch, forceRedirect]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      const sessionValid = await validateSession();
      if (!sessionValid) {
        navigate('/login', { replace: true });
      }
    }, SCOPE_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [isAuthenticated, validateSession, navigate]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        const sessionValid = await validateSession();
        if (!sessionValid) {
          navigate('/login', { replace: true });
          return;
        }

        checkScopeMismatch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, validateSession, navigate, checkScopeMismatch]);

  useEffect(() => {
    const handleFocus = async () => {
      if (isAuthenticated) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            if (user && parsedUser.accessScope !== user.accessScope) {
              forceSessionRefresh();
            }
          } catch {
          }
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, user, forceSessionRefresh]);

  return {
    isValid,
    isScopeMismatch,
    currentPanel,
    expectedPanel,
    correctPath,
    forceRedirect,
  };
}

export function useScopeMismatchAlert(): {
  showAlert: boolean;
  message: string;
  onDismiss: () => void;
} {
  const { isScopeMismatch, expectedPanel, forceRedirect } = useSessionGuard();
  const [dismissed, setDismissed] = useState(false);

  const panelNames = {
    system: 'System Admin',
    admin: 'Tenant Admin',
    app: 'App',
  };

  return {
    showAlert: isScopeMismatch && !dismissed,
    message: `You don't have access to this area. Redirecting to ${panelNames[expectedPanel]} panel...`,
    onDismiss: () => {
      setDismissed(true);
      forceRedirect();
    },
  };
}

export default useSessionGuard;
