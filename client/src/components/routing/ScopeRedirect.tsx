/**
 * ScopeRedirect - HARDENED Scope-Based Dashboard Redirect
 * 
 * PHASE 3 HARDENED - Dec 2024
 * 
 * SECURITY GUARANTEES:
 * 1. Validates user authentication before redirect
 * 2. Derives redirect path ONLY from user's accessScope (not URL)
 * 3. Handles edge cases: no user, invalid scope, loading states
 * 4. Clears any stale session data on redirect to login
 * 
 * Redirect Rules:
 * - 'system' scope → /system/dashboard
 * - 'tenant', 'business_line', 'branch', 'mixed' → /app/dashboard
 * - Unauthenticated → /login
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { getScopeBasePath } from '@/hooks/useScopePath';

const VALID_SCOPES = ['system', 'tenant', 'business_line', 'branch', 'mixed'];

function isValidScope(scope: string | undefined): boolean {
  return !!scope && VALID_SCOPES.includes(scope);
}

export default function ScopeRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      navigate('/login', { 
        replace: true,
        state: { from: location }
      });
      return;
    }

    const accessScope = user.accessScope;

    if (!isValidScope(accessScope)) {
      console.error(`Invalid access scope detected: ${accessScope}. Forcing logout.`);
      logout().then(() => {
        navigate('/login', { replace: true });
      });
      return;
    }

    setRedirecting(true);

    const targetPath = `${getScopeBasePath(accessScope)}/dashboard`;

    const timer = setTimeout(() => {
      navigate(targetPath, { replace: true });
    }, 100);

    return () => clearTimeout(timer);
  }, [user, isLoading, isAuthenticated, navigate, logout, location]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--color-accent)' }} />
        <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>
          {redirecting ? 'Redirecting to your dashboard...' : 'Verifying access...'}
        </p>
      </div>
    </div>
  );
}
