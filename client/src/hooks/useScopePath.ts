/**
 * useScopePath Hook - Scope-Aware Navigation Paths
 * 
 * This hook provides scope-aware path generation for multi-panel architecture.
 * Ensures SYSTEM users navigate within /system/*, TENANT users within /admin/*,
 * and BRANCH users within /app/*.
 * 
 * CRITICAL: This prevents cross-panel navigation bugs like SYSTEM users
 * being redirected to /admin/* routes.
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

type AccessScope = 'system' | 'tenant' | 'business_line' | 'branch' | 'mixed';

interface ScopePathResult {
  basePath: string;
  scope: AccessScope;
  isSystemScope: boolean;
  isTenantScope: boolean;
  isBranchScope: boolean;
  getPath: (relativePath: string) => string;
  getUsersPath: () => string;
  getUsersCreatePath: (queryParams?: string) => string;
  getRolesPath: () => string;
  getRolePermissionsPath: (roleId: string) => string;
  getUserRolesPath: (userId: string) => string;
}

export function useScopePath(): ScopePathResult {
  const { user } = useAuth();
  const location = useLocation();
  
  const accessScope = (user?.accessScope || 'branch') as AccessScope;
  
  const basePath = useMemo(() => {
    if (location.pathname.startsWith('/system')) {
      return '/system';
    }
    if (location.pathname.startsWith('/admin')) {
      return '/admin';
    }
    if (location.pathname.startsWith('/app')) {
      return '/app';
    }
    
    switch (accessScope) {
      case 'system':
        return '/system';
      case 'tenant':
        return '/admin';
      case 'business_line':
      case 'branch':
      case 'mixed':
      default:
        return '/app';
    }
  }, [accessScope, location.pathname]);

  const isSystemScope = basePath === '/system';
  const isTenantScope = basePath === '/admin';
  const isBranchScope = basePath === '/app';

  const getPath = useCallback(
    (relativePath: string): string => {
      const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
      return `${basePath}/${cleanPath}`;
    },
    [basePath]
  );

  const getUsersPath = useCallback(() => getPath('users'), [getPath]);

  const getUsersCreatePath = useCallback(
    (queryParams?: string): string => {
      const path = getPath('users/create');
      return queryParams ? `${path}?${queryParams}` : path;
    },
    [getPath]
  );

  const getRolesPath = useCallback(() => getPath('roles'), [getPath]);

  const getRolePermissionsPath = useCallback(
    (roleId: string): string => getPath(`roles/${roleId}/permissions`),
    [getPath]
  );

  const getUserRolesPath = useCallback(
    (userId: string): string => getPath(`users/${userId}/roles`),
    [getPath]
  );

  return {
    basePath,
    scope: accessScope,
    isSystemScope,
    isTenantScope,
    isBranchScope,
    getPath,
    getUsersPath,
    getUsersCreatePath,
    getRolesPath,
    getRolePermissionsPath,
    getUserRolesPath,
  };
}

export function getScopeBasePath(accessScope: string | undefined): string {
  switch (accessScope) {
    case 'system':
      return '/system';
    case 'tenant':
      return '/admin';
    case 'business_line':
    case 'branch':
    case 'mixed':
    default:
      return '/app';
  }
}
