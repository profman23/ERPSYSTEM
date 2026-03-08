/**
 * SAP B1 Style Permission Context
 * Screen-level authorization with 3 levels: None (0), Read (1), Full (2)
 *
 * Features:
 * - Screen-level authorization levels instead of granular permissions
 * - Auto-refresh on login, role changes
 * - Socket.IO real-time synchronization
 * - React Query integration for caching and invalidation
 */

import { createContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from '../providers/SocketProvider';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// Authorization Levels (SAP B1 Style)
export enum AuthorizationLevel {
  NONE = 0,        // No Authorization - screen hidden, route blocked
  READ_ONLY = 1,   // Read Only - view only, no create/update
  FULL = 2,        // Full Authorization - all operations allowed
}

// Screen Authorization Map: screenCode -> AuthorizationLevel
export type ScreenAuthorizations = Record<string, AuthorizationLevel>;

// ===================================================================
// TYPES
// ===================================================================

interface PermissionContextType {
  // SAP B1 Style Authorization
  screenAuthorizations: ScreenAuthorizations;

  // State
  loading: boolean;
  error: string | null;

  // SAP B1 Style Check Methods
  getScreenAuth: (screenCode: string) => AuthorizationLevel;
  canAccessScreen: (screenCode: string) => boolean;          // Level >= 1 (READ_ONLY or FULL)
  canModifyScreen: (screenCode: string) => boolean;          // Level == 2 (FULL only)
  hasReadAccess: (screenCode: string) => boolean;            // Level >= 1
  hasFullAccess: (screenCode: string) => boolean;            // Level == 2

  // Legacy compatibility methods (maps to screen auth)
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  hasAllPermissions: (codes: string[]) => boolean;

  // Utility Methods
  refreshPermissions: () => Promise<void>;
  clearPermissions: () => void;
}

export const PermissionContext = createContext<PermissionContextType | null>(null);

// ===================================================================
// PROVIDER COMPONENT
// ===================================================================

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { user, accessToken } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  // State - SAP B1 Style
  const [screenAuthorizations, setScreenAuthorizations] = useState<ScreenAuthorizations>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===================================================================
  // FETCH SCREEN AUTHORIZATIONS - CORE LOADING LOGIC
  // ===================================================================

  const fetchPermissions = useCallback(async () => {
    if (!user || !accessToken) {
      setScreenAuthorizations({});
      setLoading(false);
      return;
    }

    // Only SUPER_ADMIN and SYSTEM_ADMIN roles get automatic full access
    // Other system users must have their permissions checked via API
    if (user.accessScope === 'system' && (user.role === 'super_admin' || user.role === 'system_admin')) {
      setScreenAuthorizations({ '*': AuthorizationLevel.FULL });
      setLoading(false);
      return;
    }

    // TENANT_ADMIN users have FULL access to all tenant screens
    if (user.accessScope === 'tenant' && user.role === 'tenant_admin') {
      setScreenAuthorizations({ '*': AuthorizationLevel.FULL });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch user's screen authorizations via apiClient (correct base URL + auth interceptor)
      const response = await apiClient.get('/tenant/users/me/screen-authorizations');

      const authorizations: ScreenAuthorizations = response.data.data || {};
      setScreenAuthorizations(authorizations);

      const screenCount = Object.keys(authorizations).length;
      console.log('✅ Screen authorizations loaded:', {
        screenCount,
        screens: authorizations,
        withAccess: Object.values(authorizations).filter(level => level >= 1).length,
        withFullAccess: Object.values(authorizations).filter(level => level === 2).length,
      });
      if (screenCount === 0) {
        console.warn('⚠️ No screen authorizations found — sidebar will be empty. Check if user has a role assigned in dpf_user_roles table.');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load permissions';
      console.error('❌ Permission loading failed:', err);

      // If endpoint doesn't exist yet, don't show error - fallback to wildcard for admins
      if (err.response?.status === 404) {
        console.warn('⚠️ Screen authorizations endpoint not found - using fallback');
        if (user.role === 'admin' || user.role === 'system_user') {
          setScreenAuthorizations({ '*': AuthorizationLevel.FULL });
        } else {
          setScreenAuthorizations({});
        }
        setError(null);
      } else {
        setError(errorMessage);
        setScreenAuthorizations({});
      }
    } finally {
      setLoading(false);
    }
  }, [user, accessToken]);

  // ===================================================================
  // AUTO-REFRESH ON LOGIN
  // ===================================================================

  useEffect(() => {
    if (user && accessToken) {
      console.log('🔄 User logged in - loading screen authorizations...');
      fetchPermissions();
    } else {
      console.log('🔓 User logged out - clearing authorizations...');
      setScreenAuthorizations({});
      setLoading(false);
    }
  }, [user, accessToken, fetchPermissions]);

  // ===================================================================
  // SOCKET.IO REAL-TIME UPDATES
  // ===================================================================

  useEffect(() => {
    if (!socket || !user) return;

    const handlePermissionsUpdated = () => {
      console.log('🔄 Permissions updated via Socket.IO - refreshing...');
      fetchPermissions();
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    };

    const handleRoleUpdated = () => {
      console.log('🔄 Role updated via Socket.IO - refreshing permissions...');
      fetchPermissions();
    };

    const handleRoleAssigned = () => {
      console.log('🔄 Role assigned via Socket.IO - refreshing permissions...');
      fetchPermissions();
    };

    socket.on('permissions-updated', handlePermissionsUpdated);
    socket.on('role-updated', handleRoleUpdated);
    socket.on('role-assigned', handleRoleAssigned);

    return () => {
      socket.off('permissions-updated', handlePermissionsUpdated);
      socket.off('role-updated', handleRoleUpdated);
      socket.off('role-assigned', handleRoleAssigned);
    };
  }, [socket, user, fetchPermissions, queryClient]);

  // ===================================================================
  // SAP B1 STYLE AUTHORIZATION CHECK METHODS
  // ===================================================================

  const isFullAccessUser = useMemo(() => {
    // SUPER_ADMIN, SYSTEM_ADMIN, and TENANT_ADMIN get automatic full access
    // Other users rely on their role's screen authorizations
    return (user?.accessScope === 'system' && (user?.role === 'super_admin' || user?.role === 'system_admin')) ||
           (user?.accessScope === 'tenant' && user?.role === 'tenant_admin') ||
           screenAuthorizations['*'] === AuthorizationLevel.FULL;
  }, [user?.accessScope, user?.role, screenAuthorizations]);

  // Get authorization level for a screen (returns 0 if not found)
  const getScreenAuth = useCallback(
    (screenCode: string): AuthorizationLevel => {
      if (isFullAccessUser) return AuthorizationLevel.FULL;
      return screenAuthorizations[screenCode] ?? AuthorizationLevel.NONE;
    },
    [screenAuthorizations, isFullAccessUser]
  );

  // Can user access the screen? (Level >= 1 = READ_ONLY or FULL)
  const canAccessScreen = useCallback(
    (screenCode: string): boolean => {
      if (isFullAccessUser) return true;
      return (screenAuthorizations[screenCode] ?? 0) >= AuthorizationLevel.READ_ONLY;
    },
    [screenAuthorizations, isFullAccessUser]
  );

  // Can user modify data on the screen? (Level == 2 = FULL only)
  const canModifyScreen = useCallback(
    (screenCode: string): boolean => {
      if (isFullAccessUser) return true;
      return (screenAuthorizations[screenCode] ?? 0) === AuthorizationLevel.FULL;
    },
    [screenAuthorizations, isFullAccessUser]
  );

  // Alias for canAccessScreen
  const hasReadAccess = canAccessScreen;

  // Alias for canModifyScreen
  const hasFullAccess = canModifyScreen;

  // ===================================================================
  // LEGACY COMPATIBILITY METHODS
  // Maps old permission codes to screen codes
  // ===================================================================

  // Extract screen code from permission code (e.g., "tenants.view" -> "TENANTS")
  const extractScreenCode = (permissionCode: string): string => {
    const parts = permissionCode.split('.');
    return parts[0]?.toUpperCase() || '';
  };

  // Legacy: hasPermission - checks if user has access based on action type
  const hasPermission = useCallback(
    (code: string): boolean => {
      if (isFullAccessUser) return true;

      const screenCode = extractScreenCode(code);
      const level = screenAuthorizations[screenCode] ?? 0;

      // For 'view' actions, READ_ONLY is sufficient
      if (code.includes('.view') || code.includes('.read') || code.includes('.list')) {
        return level >= AuthorizationLevel.READ_ONLY;
      }

      // For modifying actions (create, update, delete, full_control), need FULL access
      return level === AuthorizationLevel.FULL;
    },
    [screenAuthorizations, isFullAccessUser]
  );

  // Legacy: hasAnyPermission
  const hasAnyPermission = useCallback(
    (codes: string[]): boolean => {
      if (isFullAccessUser) return true;
      return codes.some(code => hasPermission(code));
    },
    [hasPermission, isFullAccessUser]
  );

  // Legacy: hasAllPermissions
  const hasAllPermissions = useCallback(
    (codes: string[]): boolean => {
      if (isFullAccessUser) return true;
      return codes.every(code => hasPermission(code));
    },
    [hasPermission, isFullAccessUser]
  );

  const clearPermissions = useCallback(() => {
    setScreenAuthorizations({});
  }, []);

  // ===================================================================
  // CONTEXT VALUE
  // ===================================================================

  // Memoize context value to prevent unnecessary consumer re-renders
  const value = useMemo<PermissionContextType>(() => ({
    screenAuthorizations,
    loading,
    error,

    // SAP B1 Style methods
    getScreenAuth,
    canAccessScreen,
    canModifyScreen,
    hasReadAccess,
    hasFullAccess,

    // Legacy compatibility
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Utility
    refreshPermissions: fetchPermissions,
    clearPermissions,
  }), [
    screenAuthorizations, loading, error,
    getScreenAuth, canAccessScreen, canModifyScreen, hasReadAccess, hasFullAccess,
    hasPermission, hasAnyPermission, hasAllPermissions,
    fetchPermissions, clearPermissions,
  ]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}
