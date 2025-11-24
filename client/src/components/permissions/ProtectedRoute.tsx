/**
 * Protected Route Component
 * Conditional rendering based on DPF permissions
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
  fallback,
  redirectTo = '/unauthorized',
}: ProtectedRouteProps) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hasAccess =
    (!requiredPermission || hasPermission(requiredPermission)) &&
    !requiredRole; // Role checking removed - use permission-based access control

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

interface ProtectedActionProps {
  children: ReactNode;
  requiredPermission: string;
  fallback?: ReactNode;
}

export function ProtectedAction({ children, requiredPermission, fallback = null }: ProtectedActionProps) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(requiredPermission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
