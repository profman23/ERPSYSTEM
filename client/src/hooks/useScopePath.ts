/**
 * useScopePath Hook - HARDENED Scope-Aware Navigation Paths
 * 
 * PHASE 3 HARDENED - Dec 2024
 * 
 * This hook provides scope-aware path generation for multi-panel architecture.
 * Ensures SYSTEM users navigate within /system/*, TENANT users within /admin/*,
 * and BRANCH users within /app/*.
 * 
 * CRITICAL SECURITY: basePath is ALWAYS derived from user's accessScope,
 * NOT from the current URL. This prevents scope escalation via URL manipulation.
 * 
 * The hook also validates that the current URL matches the user's scope,
 * enabling detection of unauthorized panel access attempts.
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

type AccessScope = 'system' | 'tenant' | 'business_line' | 'branch' | 'mixed';

type PanelType = 'system' | 'admin' | 'app';

interface ScopePathResult {
  basePath: string;
  scope: AccessScope;
  currentPanel: PanelType | null;
  expectedPanel: PanelType;
  isSystemScope: boolean;
  isTenantScope: boolean;
  isBranchScope: boolean;
  isPanelMismatch: boolean;
  getPath: (relativePath: string) => string;
  getUsersPath: () => string;
  getUsersCreatePath: (queryParams?: string) => string;
  getRolesPath: () => string;
  getRolePermissionsPath: (roleId: string) => string;
  getUserRolesPath: (userId: string) => string;
  getCorrectPanelPath: () => string;
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

export function getExpectedPanel(accessScope: string | undefined): PanelType {
  switch (accessScope) {
    case 'system':
      return 'system';
    case 'tenant':
      return 'admin';
    case 'business_line':
    case 'branch':
    case 'mixed':
    default:
      return 'app';
  }
}

export function getCurrentPanelFromPath(pathname: string): PanelType | null {
  if (pathname.startsWith('/system')) return 'system';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/app')) return 'app';
  return null;
}

export function isPanelAccessAllowed(userScope: string | undefined, targetPanel: PanelType): boolean {
  const scope = userScope || 'branch';
  
  switch (targetPanel) {
    case 'system':
      return scope === 'system';
    case 'admin':
      return scope === 'system' || scope === 'tenant';
    case 'app':
      return true;
    default:
      return false;
  }
}

export function useScopePath(): ScopePathResult {
  const { user } = useAuth();
  const location = useLocation();
  
  const accessScope = (user?.accessScope || 'branch') as AccessScope;
  
  const basePath = useMemo(() => {
    return getScopeBasePath(accessScope);
  }, [accessScope]);

  const expectedPanel = useMemo(() => {
    return getExpectedPanel(accessScope);
  }, [accessScope]);

  const currentPanel = useMemo(() => {
    return getCurrentPanelFromPath(location.pathname);
  }, [location.pathname]);

  const isPanelMismatch = useMemo(() => {
    if (!currentPanel) return false;
    return !isPanelAccessAllowed(accessScope, currentPanel);
  }, [accessScope, currentPanel]);

  const isSystemScope = accessScope === 'system';
  const isTenantScope = accessScope === 'tenant';
  const isBranchScope = accessScope === 'business_line' || accessScope === 'branch' || accessScope === 'mixed';

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

  const getCorrectPanelPath = useCallback((): string => {
    return `${basePath}/dashboard`;
  }, [basePath]);

  return {
    basePath,
    scope: accessScope,
    currentPanel,
    expectedPanel,
    isSystemScope,
    isTenantScope,
    isBranchScope,
    isPanelMismatch,
    getPath,
    getUsersPath,
    getUsersCreatePath,
    getRolesPath,
    getRolePermissionsPath,
    getUserRolesPath,
    getCorrectPanelPath,
  };
}

export function validateScopeForPanel(accessScope: string | undefined, panel: PanelType): boolean {
  return isPanelAccessAllowed(accessScope, panel);
}
