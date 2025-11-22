import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * ProtectedRoute - Route wrapper for authenticated pages
 * 
 * Phase 3: Full authentication implementation
 * 
 * Features:
 * - Check authentication status
 * - Auto-refresh expired tokens
 * - Redirect to /login if not authenticated
 * - Show loading state during auth check
 */

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, accessToken, refreshAccessToken } = useAuth();

  // Auto-refresh token if it's expired
  useEffect(() => {
    const checkTokenExpiry = async () => {
      if (!accessToken) return;

      try {
        // Decode JWT to check expiry
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const expiryTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;

        // If token expires in less than 1 minute, refresh it
        if (timeUntilExpiry < 60000 && timeUntilExpiry > 0) {
          await refreshAccessToken();
        }
      } catch (error) {
        console.error('Error checking token expiry:', error);
      }
    };

    checkTokenExpiry();
    
    // Check every 30 seconds
    const interval = setInterval(checkTokenExpiry, 30000);

    return () => clearInterval(interval);
  }, [accessToken, refreshAccessToken]);

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
