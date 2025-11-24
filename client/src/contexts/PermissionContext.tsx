/**
 * Enterprise-Grade Permission Context
 * Complete DPF-AGI permission management with real-time updates
 * 
 * Features:
 * - Full permission matrix loading (hierarchical DPF structure)
 * - Flat permission codes for fast lookups
 * - Auto-refresh on login, role changes, permission updates
 * - Socket.IO real-time synchronization
 * - React Query integration for caching and invalidation
 */

import { createContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from '../providers/SocketProvider';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { 
  PermissionMatrixModule, 
  DPFPermission, 
  DPFModule,
  DPFScreen,
  DPFAction 
} from '../../../types/dpf';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface PermissionContextType {
  // Permission Data
  permissionCodes: string[];
  rolePermissions: string[];
  permissionMatrix: PermissionMatrixModule[];
  allPermissions: DPFPermission[];
  
  // DPF Structure
  modules: DPFModule[];
  screens: DPFScreen[];
  actions: DPFAction[];
  
  // State
  loading: boolean;
  error: string | null;
  
  // Permission Check Methods
  hasPermission: (code: string) => boolean;
  hasAction: (module: string, screen: string, action: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  hasAllPermissions: (codes: string[]) => boolean;
  
  // Utility Methods
  refreshPermissions: () => Promise<void>;
  clearPermissions: () => void;
}

export const PermissionContext = createContext<PermissionContextType | null>(null);

// ═══════════════════════════════════════════════════════════════
// PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { user, accessToken } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  
  // State
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrixModule[]>([]);
  const [allPermissions, setAllPermissions] = useState<DPFPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════
  // FETCH PERMISSIONS - CORE LOADING LOGIC
  // ═══════════════════════════════════════════════════════════════

  const fetchPermissions = useCallback(async () => {
    if (!user || !accessToken) {
      setPermissionCodes([]);
      setRolePermissions([]);
      setPermissionMatrix([]);
      setAllPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Parallel fetch: Load both flat list AND hierarchical matrix
      const [permissionsResponse, matrixResponse] = await Promise.all([
        axios.get(`${API_BASE}/tenant/permissions/all`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        axios.get(`${API_BASE}/tenant/permissions/matrix`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      ]);

      // Extract flat permission codes
      const permissions: DPFPermission[] = permissionsResponse.data.data || [];
      const codes = permissions
        .filter(p => p.isActive === 'true')
        .map(p => p.permissionCode);

      // Extract hierarchical matrix
      const matrix: PermissionMatrixModule[] = matrixResponse.data.data || [];

      // Store all data
      setAllPermissions(permissions);
      setPermissionCodes(codes);
      setRolePermissions(codes); // TODO: Filter by user's actual roles when user-role endpoint exists
      setPermissionMatrix(matrix);

      console.log('✅ Permissions loaded:', {
        totalPermissions: permissions.length,
        activeCodes: codes.length,
        modules: matrix.length,
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load permissions';
      setError(errorMessage);
      console.error('❌ Permission loading failed:', err);
      
      // Clear permissions on error
      setPermissionCodes([]);
      setRolePermissions([]);
      setPermissionMatrix([]);
      setAllPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user, accessToken]);

  // ═══════════════════════════════════════════════════════════════
  // AUTO-REFRESH ON LOGIN
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    if (user && accessToken) {
      console.log('🔄 User logged in - loading permissions...');
      fetchPermissions();
    } else {
      console.log('🔓 User logged out - clearing permissions...');
      setPermissionCodes([]);
      setRolePermissions([]);
      setPermissionMatrix([]);
      setAllPermissions([]);
      setLoading(false);
    }
  }, [user, accessToken, fetchPermissions]);

  // ═══════════════════════════════════════════════════════════════
  // SOCKET.IO REAL-TIME UPDATES
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!socket || !user) return;

    const handlePermissionsUpdated = () => {
      console.log('🔄 Permissions updated via Socket.IO - refreshing...');
      fetchPermissions();
      
      // Invalidate React Query cache
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

    // Listen to permission-related Socket.IO events
    socket.on('permissions-updated', handlePermissionsUpdated);
    socket.on('role-updated', handleRoleUpdated);
    socket.on('role-assigned', handleRoleAssigned);

    return () => {
      socket.off('permissions-updated', handlePermissionsUpdated);
      socket.off('role-updated', handleRoleUpdated);
      socket.off('role-assigned', handleRoleAssigned);
    };
  }, [socket, user, fetchPermissions, queryClient]);

  // ═══════════════════════════════════════════════════════════════
  // PERMISSION CHECK METHODS
  // ═══════════════════════════════════════════════════════════════

  const hasPermission = useCallback(
    (code: string): boolean => {
      return permissionCodes.includes(code);
    },
    [permissionCodes]
  );

  const hasAction = useCallback(
    (module: string, screen: string, action: string): boolean => {
      // Build DPF-style permission code: MODULE:SCREEN:ACTION
      const permissionCode = `${module}:${screen}:${action}`;
      return permissionCodes.includes(permissionCode);
    },
    [permissionCodes]
  );

  const hasAnyPermission = useCallback(
    (codes: string[]): boolean => {
      return codes.some(code => permissionCodes.includes(code));
    },
    [permissionCodes]
  );

  const hasAllPermissions = useCallback(
    (codes: string[]): boolean => {
      return codes.every(code => permissionCodes.includes(code));
    },
    [permissionCodes]
  );

  const clearPermissions = useCallback(() => {
    setPermissionCodes([]);
    setRolePermissions([]);
    setPermissionMatrix([]);
    setAllPermissions([]);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // EXTRACT DPF STRUCTURE FROM MATRIX
  // ═══════════════════════════════════════════════════════════════

  const modules = useMemo(() => {
    return permissionMatrix.map(m => m.module);
  }, [permissionMatrix]);

  const screens = useMemo(() => {
    return permissionMatrix.flatMap(m =>
      m.screens.map(s => s.screen)
    );
  }, [permissionMatrix]);

  const actions = useMemo(() => {
    return permissionMatrix.flatMap(m =>
      m.screens.flatMap(s => s.actions)
    );
  }, [permissionMatrix]);

  // ═══════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════

  const value: PermissionContextType = {
    permissionCodes,
    rolePermissions,
    permissionMatrix,
    allPermissions,
    modules,
    screens,
    actions,
    loading,
    error,
    hasPermission,
    hasAction,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions: fetchPermissions,
    clearPermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}
