import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedScopes?: string[];
  redirectTo?: string;
}

export default function ProtectedRoute({ allowedScopes, redirectTo }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

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

  if (allowedScopes && allowedScopes.length > 0) {
    const userScope = user.accessScope || 'branch';
    
    if (!allowedScopes.includes(userScope)) {
      if (redirectTo) {
        return <Navigate to={redirectTo} replace />;
      }

      switch (userScope) {
        case 'system':
          return <Navigate to="/system/dashboard" replace />;
        case 'tenant':
          return <Navigate to="/admin/dashboard" replace />;
        default:
          return <Navigate to="/app/dashboard" replace />;
      }
    }
  }

  return <Outlet />;
}
