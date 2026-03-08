/**
 * usePermissions Hook - SAP B1 Style Authorization
 * Screen-level authorization with 3 levels: None (0), Read (1), Full (2)
 */

import { useContext, useCallback, useMemo } from 'react';
import { PermissionContext, AuthorizationLevel } from '../contexts/PermissionContext';

export function usePermissions() {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }

  const {
    screenAuthorizations,
    loading,
    error,
    getScreenAuth,
    canAccessScreen,
    canModifyScreen,
    hasReadAccess,
    hasFullAccess,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
    clearPermissions,
  } = context;

  // ===================================================================
  // CRUD HELPER METHODS (RESOURCE-BASED)
  // Maps legacy resource.action to screen authorization
  // ===================================================================

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

  // ===================================================================
  // SAP B1 STYLE HELPERS
  // ===================================================================

  // Check if user can access any screen in a module
  const canAccessModule = useCallback(
    (moduleCode: string): boolean => {
      // Check if any screen with module prefix has access
      for (const [screenCode, level] of Object.entries(screenAuthorizations)) {
        if (screenCode.startsWith(moduleCode) && level >= AuthorizationLevel.READ_ONLY) {
          return true;
        }
      }
      return false;
    },
    [screenAuthorizations]
  );

  // Get all screens user has access to
  const getAccessibleScreens = useCallback((): string[] => {
    return Object.entries(screenAuthorizations)
      .filter(([_, level]) => level >= AuthorizationLevel.READ_ONLY)
      .map(([screenCode]) => screenCode);
  }, [screenAuthorizations]);

  // Get screens with full access
  const getModifiableScreens = useCallback((): string[] => {
    return Object.entries(screenAuthorizations)
      .filter(([_, level]) => level === AuthorizationLevel.FULL)
      .map(([screenCode]) => screenCode);
  }, [screenAuthorizations]);

  // ===================================================================
  // RETURN COMPREHENSIVE API
  // ===================================================================

  return {
    // Raw Data (SAP B1 Style)
    screenAuthorizations,

    // State
    loading,
    error,

    // SAP B1 Style Check Methods
    getScreenAuth,
    canAccessScreen,
    canModifyScreen,
    hasReadAccess,
    hasFullAccess,

    // Legacy compatibility (maps to screen auth)
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // CRUD Helpers (Resource-based)
    can,
    canCreate,
    canView,
    canUpdate,
    canDelete,

    // Module/Screen Helpers
    canAccessModule,
    getAccessibleScreens,
    getModifiableScreens,

    // Utility
    refresh: refreshPermissions,
    clear: clearPermissions,
  };
}

// ===================================================================
// SPECIALIZED HOOKS FOR OPTIMIZED CHECKS
// ===================================================================

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
    permissionCodes.forEach((code: string) => {
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
 * Check if user can access a screen (SAP B1 style)
 */
export function useScreenAccess(screenCode: string): boolean {
  const { canAccessScreen } = usePermissions();
  return useMemo(() => canAccessScreen(screenCode), [canAccessScreen, screenCode]);
}

/**
 * Check if user can modify a screen (SAP B1 style)
 */
export function useScreenModify(screenCode: string): boolean {
  const { canModifyScreen } = usePermissions();
  return useMemo(() => canModifyScreen(screenCode), [canModifyScreen, screenCode]);
}

/**
 * Get screen authorization level (SAP B1 style)
 */
export function useScreenAuth(screenCode: string): AuthorizationLevel {
  const { getScreenAuth } = usePermissions();
  return useMemo(() => getScreenAuth(screenCode), [getScreenAuth, screenCode]);
}

/**
 * Check CRUD permissions for a resource (legacy compatibility)
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
