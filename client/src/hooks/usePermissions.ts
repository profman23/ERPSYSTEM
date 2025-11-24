/**
 * usePermissions Hook - Enterprise RBAC Permission Checking
 * Complete DPF-AGI integration with hierarchical permission checks
 */

import { useContext, useCallback, useMemo } from 'react';
import { PermissionContext } from '../contexts/PermissionContext';

export function usePermissions() {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }

  const {
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
    refreshPermissions,
    clearPermissions,
  } = context;

  // ═══════════════════════════════════════════════════════════════
  // CRUD HELPER METHODS (RESOURCE-BASED)
  // ═══════════════════════════════════════════════════════════════

  const can = useCallback(
    (action: string, resource?: string): boolean => {
      const permissionCode = resource ? `${resource}.${action}` : action;
      return hasPermission(permissionCode);
    },
    [hasPermission]
  );

  const canCreate = useCallback(
    (resource: string): boolean => {
      return can('create', resource);
    },
    [can]
  );

  const canView = useCallback(
    (resource: string): boolean => {
      return can('view', resource);
    },
    [can]
  );

  const canUpdate = useCallback(
    (resource: string): boolean => {
      return can('update', resource);
    },
    [can]
  );

  const canDelete = useCallback(
    (resource: string): boolean => {
      return can('delete', resource);
    },
    [can]
  );

  // ═══════════════════════════════════════════════════════════════
  // DPF HIERARCHICAL HELPERS
  // ═══════════════════════════════════════════════════════════════

  const canAccessModule = useCallback(
    (moduleCode: string): boolean => {
      // Check if user has ANY permission within this module
      return permissionCodes.some(code => code.startsWith(`${moduleCode}:`));
    },
    [permissionCodes]
  );

  const canAccessScreen = useCallback(
    (moduleCode: string, screenCode: string): boolean => {
      // Check if user has ANY permission for this screen
      const prefix = `${moduleCode}:${screenCode}`;
      return permissionCodes.some(code => code.startsWith(prefix));
    },
    [permissionCodes]
  );

  const getModulePermissions = useCallback(
    (moduleCode: string): string[] => {
      return permissionCodes.filter(code => code.startsWith(`${moduleCode}:`));
    },
    [permissionCodes]
  );

  const getScreenPermissions = useCallback(
    (moduleCode: string, screenCode: string): string[] => {
      const prefix = `${moduleCode}:${screenCode}`;
      return permissionCodes.filter(code => code.startsWith(prefix));
    },
    [permissionCodes]
  );

  // ═══════════════════════════════════════════════════════════════
  // RETURN COMPREHENSIVE API
  // ═══════════════════════════════════════════════════════════════

  return {
    // Raw Data
    permissions: permissionCodes,
    rolePermissions,
    permissionMatrix,
    allPermissions,
    modules,
    screens,
    actions,
    
    // State
    loading,
    error,
    
    // Core Permission Checks
    hasPermission,
    hasAction,
    hasAnyPermission,
    hasAllPermissions,
    
    // CRUD Helpers (Resource-based)
    can,
    canCreate,
    canView,
    canUpdate,
    canDelete,
    
    // DPF Hierarchical Helpers
    canAccessModule,
    canAccessScreen,
    getModulePermissions,
    getScreenPermissions,
    
    // Utility
    refresh: refreshPermissions,
    clear: clearPermissions,
  };
}

// ═══════════════════════════════════════════════════════════════
// SPECIALIZED HOOKS FOR OPTIMIZED CHECKS
// ═══════════════════════════════════════════════════════════════

/**
 * Check a single permission with memoization
 * Use this in components that need to check one specific permission
 */
export function usePermissionCheck(permissionCode: string): boolean {
  const { hasPermission } = usePermissions();
  return useMemo(() => hasPermission(permissionCode), [hasPermission, permissionCode]);
}

/**
 * Check multiple permissions with memoization
 * Returns boolean for each permission code
 */
export function usePermissionChecks(permissionCodes: string[]): Record<string, boolean> {
  const { hasPermission } = usePermissions();
  return useMemo(() => {
    const result: Record<string, boolean> = {};
    permissionCodes.forEach(code => {
      result[code] = hasPermission(code);
    });
    return result;
  }, [hasPermission, permissionCodes]);
}

/**
 * Check if user can access a module
 */
export function useModuleAccess(moduleCode: string): boolean {
  const { canAccessModule } = usePermissions();
  return useMemo(() => canAccessModule(moduleCode), [canAccessModule, moduleCode]);
}

/**
 * Check if user can access a screen
 */
export function useScreenAccess(moduleCode: string, screenCode: string): boolean {
  const { canAccessScreen } = usePermissions();
  return useMemo(
    () => canAccessScreen(moduleCode, screenCode),
    [canAccessScreen, moduleCode, screenCode]
  );
}

/**
 * Check CRUD permissions for a resource
 */
export function useResourcePermissions(resource: string) {
  const { canCreate, canView, canUpdate, canDelete } = usePermissions();
  
  return useMemo(() => ({
    canCreate: canCreate(resource),
    canView: canView(resource),
    canUpdate: canUpdate(resource),
    canDelete: canDelete(resource),
  }), [canCreate, canView, canUpdate, canDelete, resource]);
}
