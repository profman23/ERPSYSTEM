/**
 * Permission Context
 * Global permission state management with Socket.IO real-time updates
 */

import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from '../providers/SocketProvider';

interface PermissionContextType {
  userPermissions: string[];
  userRoles: string[];
  loading: boolean;
  checkPermission: (permissionCode: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

export const PermissionContext = createContext<PermissionContextType | null>(null);

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setUserPermissions([]);
      setUserRoles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/permissions/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserPermissions(data.permissions || []);
        setUserRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  useEffect(() => {
    if (!socket || !user) return;

    const handlePermissionsUpdated = () => {
      console.log('🔄 Permissions updated via Socket.IO');
      fetchPermissions();
    };

    socket.on('permissions:updated', handlePermissionsUpdated);

    return () => {
      socket.off('permissions:updated', handlePermissionsUpdated);
    };
  }, [user, fetchPermissions]);

  const checkPermission = useCallback(
    (permissionCode: string): boolean => {
      return userPermissions.includes(permissionCode);
    },
    [userPermissions]
  );

  const value: PermissionContextType = {
    userPermissions,
    userRoles,
    loading,
    checkPermission,
    refreshPermissions: fetchPermissions,
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}
