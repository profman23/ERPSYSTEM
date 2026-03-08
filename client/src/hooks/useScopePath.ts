/**
 * useScopePath Hook - HARDENED Scope-Aware Navigation Paths
 *
 * 2-Panel Architecture: /system + /app
 *
 * CRITICAL SECURITY: basePath is ALWAYS derived from user's accessScope,
 * NOT from the current URL. This prevents scope escalation via URL manipulation.
 *
 * Panels:
 * - /system/* → System admin (platform management)
 * - /app/*    → Unified application (admin + clinical + operations)
 *
 * /app/administration/* → Tenant admin features (users, roles, business lines, branches, settings)
 * /app/*               → Clinical & operational features (appointments, patients, tasks, reports)
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

type AccessScope = 'system' | 'tenant' | 'business_line' | 'branch' | 'mixed';

type PanelType = 'system' | 'app';

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
    case 'business_line':
    case 'branch':
    case 'mixed':
    default:
      return 'app';
  }
}

export function getCurrentPanelFromPath(pathname: string): PanelType | null {
  if (pathname.startsWith('/system')) return 'system';
  // /admin/* is legacy — treat as /app panel for backward compat
  if (pathname.startsWith('/admin')) return 'app';
  if (pathname.startsWith('/app')) return 'app';
  return null;
}

export function isPanelAccessAllowed(userScope: string | undefined, targetPanel: PanelType): boolean {
  const scope = userScope || 'branch';

  switch (targetPanel) {
    case 'system':
      return scope === 'system';
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

  const getUsersPath = useCallback(() => getPath('administration/users'), [getPath]);

  const getUsersCreatePath = useCallback(
    (queryParams?: string): string => {
      const path = getPath('administration/users/create');
      return queryParams ? `${path}?${queryParams}` : path;
    },
    [getPath]
  );

  const getRolesPath = useCallback(() => getPath('administration/roles'), [getPath]);

  const getRolePermissionsPath = useCallback(
    (roleId: string): string => getPath(`administration/roles/${roleId}/permissions`),
    [getPath]
  );

  const getUserRolesPath = useCallback(
    (userId: string): string => getPath(`administration/users/${userId}/roles`),
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
