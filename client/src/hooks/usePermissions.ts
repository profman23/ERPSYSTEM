/**
 * usePermissions Hook
 * React hook for DPF permission checking with real-time updates
 */

import { useContext, useCallback, useMemo } from 'react';
import { PermissionContext } from '../contexts/PermissionContext';

export function usePermissions() {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }

  const { userPermissions, userRoles, loading, checkPermission, refreshPermissions } = context;

  const hasPermission = useCallback(
    (permissionCode: string): boolean => {
      return checkPermission(permissionCode);
    },
    [checkPermission]
  );

  const hasAnyPermission = useCallback(
    (permissionCodes: string[]): boolean => {
      return permissionCodes.some((code) => checkPermission(code));
    },
    [checkPermission]
  );

  const hasAllPermissions = useCallback(
    (permissionCodes: string[]): boolean => {
      return permissionCodes.every((code) => checkPermission(code));
    },
    [checkPermission]
  );

  const hasRole = useCallback(
    (roleCode: string): boolean => {
      return userRoles.includes(roleCode);
    },
    [userRoles]
  );

  const can = useCallback(
    (action: string, resource?: string): boolean => {
      const permissionCode = resource ? `${resource}:${action}` : action;
      return checkPermission(permissionCode);
    },
    [checkPermission]
  );

  const canCreate = useCallback(
    (resource: string): boolean => {
      return can('CREATE', resource);
    },
    [can]
  );

  const canRead = useCallback(
    (resource: string): boolean => {
      return can('READ', resource);
    },
    [can]
  );

  const canUpdate = useCallback(
    (resource: string): boolean => {
      return can('UPDATE', resource);
    },
    [can]
  );

  const canDelete = useCallback(
    (resource: string): boolean => {
      return can('DELETE', resource);
    },
    [can]
  );

  return {
    permissions: userPermissions,
    roles: userRoles,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    can,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    refresh: refreshPermissions,
  };
}

export function usePermissionCheck(permissionCode: string): boolean {
  const { hasPermission } = usePermissions();
  return useMemo(() => hasPermission(permissionCode), [hasPermission, permissionCode]);
}

export function useRoleCheck(roleCode: string): boolean {
  const { hasRole } = usePermissions();
  return useMemo(() => hasRole(roleCode), [hasRole, roleCode]);
}
