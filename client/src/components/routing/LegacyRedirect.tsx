/**
 * LegacyRedirect - HARDENED Legacy URL Redirect with Auth Check
 * 
 * PHASE 3 HARDENED - Dec 2024
 * 
 * SECURITY GUARANTEES:
 * 1. Validates user authentication before redirect
 * 2. Derives target panel ONLY from user's accessScope (not URL)
 * 3. Unauthenticated users are sent to login, not redirected to panel
 * 4. Preserves original path segments, query params, and hash
 * 
 * Purpose:
 * Redirects legacy routes (e.g., /tenants, /users) to panel-aware routes
 * (e.g., /system/tenants, /admin/users) based on user's scope.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getScopeBasePath } from '@/hooks/useScopePath';
import { Loader2 } from 'lucide-react';

interface LegacyRedirectProps {
  baseFrom: string;
  resource: string;
}

export default function LegacyRedirect({ baseFrom, resource }: LegacyRedirectProps) {
  const location = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--color-accent)' }} />
          <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const pathAfterBase = location.pathname.substring(baseFrom.length);

  const scopeBasePath = getScopeBasePath(user.accessScope);

  const sanitizedResource = resource.replace(/^\/+/, '').replace(/\/+$/, '');
  const sanitizedPath = pathAfterBase.replace(/^\/+/, '');

  let newPath = `${scopeBasePath}/${sanitizedResource}`;
  if (sanitizedPath) {
    newPath += `/${sanitizedPath}`;
  }

  newPath = newPath.replace(/\/+/g, '/');

  if (location.search) {
    newPath += location.search;
  }
  if (location.hash) {
    newPath += location.hash;
  }

  return <Navigate to={newPath} replace />;
}
