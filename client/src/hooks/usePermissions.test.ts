import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { PermissionContext, AuthorizationLevel } from '../contexts/PermissionContext';
import type { ReactNode } from 'react';
import { usePermissions } from './usePermissions';

// Helper to create a wrapper with mocked PermissionContext
function createPermissionWrapper(authorizations: Record<string, AuthorizationLevel> = {}) {
  const mockContext = {
    screenAuthorizations: authorizations,
    loading: false,
    error: null,
    getScreenAuth: (code: string) => authorizations[code] ?? AuthorizationLevel.NONE,
    canAccessScreen: (code: string) => (authorizations[code] ?? 0) >= AuthorizationLevel.READ_ONLY,
    canModifyScreen: (code: string) => (authorizations[code] ?? 0) === AuthorizationLevel.FULL,
    hasReadAccess: (code: string) => (authorizations[code] ?? 0) >= AuthorizationLevel.READ_ONLY,
    hasFullAccess: (code: string) => (authorizations[code] ?? 0) === AuthorizationLevel.FULL,
    hasPermission: (code: string) => {
      const screenCode = code.split('.')[0]?.toUpperCase() || '';
      const level = authorizations[screenCode] ?? 0;
      if (code.includes('.view') || code.includes('.read') || code.includes('.list')) {
        return level >= AuthorizationLevel.READ_ONLY;
      }
      return level === AuthorizationLevel.FULL;
    },
    hasAnyPermission: (codes: string[]) => codes.some(c => {
      const sc = c.split('.')[0]?.toUpperCase() || '';
      return (authorizations[sc] ?? 0) >= AuthorizationLevel.READ_ONLY;
    }),
    hasAllPermissions: (codes: string[]) => codes.every(c => {
      const sc = c.split('.')[0]?.toUpperCase() || '';
      return (authorizations[sc] ?? 0) >= AuthorizationLevel.READ_ONLY;
    }),
    refreshPermissions: async () => {},
    clearPermissions: () => {},
  };

  return function PermissionWrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      PermissionContext.Provider,
      { value: mockContext },
      children,
    );
  };
}

function createLoadingPermissionWrapper() {
  const mockContext = {
    screenAuthorizations: {},
    loading: true,
    error: null,
    getScreenAuth: () => AuthorizationLevel.NONE,
    canAccessScreen: () => false,
    canModifyScreen: () => false,
    hasReadAccess: () => false,
    hasFullAccess: () => false,
    hasPermission: () => false,
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
    refreshPermissions: async () => {},
    clearPermissions: () => {},
  };

  return function PermissionWrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      PermissionContext.Provider,
      { value: mockContext },
      children,
    );
  };
}

describe('usePermissions', () => {
  it('returns permission check functions', () => {
    const wrapper = createPermissionWrapper({ USERS: AuthorizationLevel.FULL });
    const { result } = renderHook(() => usePermissions(), { wrapper });

    expect(typeof result.current.canAccessScreen).toBe('function');
    expect(typeof result.current.canModifyScreen).toBe('function');
    expect(typeof result.current.hasPermission).toBe('function');
    expect(typeof result.current.can).toBe('function');
    expect(typeof result.current.canCreate).toBe('function');
    expect(typeof result.current.canView).toBe('function');
  });

  it('checks if user has permission for a screen', () => {
    const wrapper = createPermissionWrapper({
      USERS: AuthorizationLevel.FULL,
      REPORTS: AuthorizationLevel.READ_ONLY,
    });
    const { result } = renderHook(() => usePermissions(), { wrapper });

    expect(result.current.canAccessScreen('USERS')).toBe(true);
    expect(result.current.canModifyScreen('USERS')).toBe(true);
    expect(result.current.canAccessScreen('REPORTS')).toBe(true);
    expect(result.current.canModifyScreen('REPORTS')).toBe(false);
  });

  it('handles no permissions gracefully', () => {
    const wrapper = createPermissionWrapper({});
    const { result } = renderHook(() => usePermissions(), { wrapper });

    expect(result.current.canAccessScreen('USERS')).toBe(false);
    expect(result.current.canModifyScreen('USERS')).toBe(false);
    expect(result.current.getAccessibleScreens()).toEqual([]);
    expect(result.current.getModifiableScreens()).toEqual([]);
  });

  it('loading state while fetching', () => {
    const wrapper = createLoadingPermissionWrapper();
    const { result } = renderHook(() => usePermissions(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.canAccessScreen('USERS')).toBe(false);
  });

  it('returns false for unknown screens', () => {
    const wrapper = createPermissionWrapper({
      USERS: AuthorizationLevel.FULL,
    });
    const { result } = renderHook(() => usePermissions(), { wrapper });

    expect(result.current.canAccessScreen('NONEXISTENT_SCREEN')).toBe(false);
    expect(result.current.canModifyScreen('NONEXISTENT_SCREEN')).toBe(false);
    expect(result.current.getScreenAuth('NONEXISTENT_SCREEN')).toBe(AuthorizationLevel.NONE);
  });

  it('caches permission data via screenAuthorizations', () => {
    const authorizations = {
      USERS: AuthorizationLevel.FULL,
      ITEMS: AuthorizationLevel.READ_ONLY,
    };
    const wrapper = createPermissionWrapper(authorizations);
    const { result } = renderHook(() => usePermissions(), { wrapper });

    // screenAuthorizations is the raw cached data
    expect(result.current.screenAuthorizations).toEqual(authorizations);
    expect(Object.keys(result.current.screenAuthorizations)).toHaveLength(2);

    // Derived helpers use the same data
    expect(result.current.getAccessibleScreens()).toEqual(['USERS', 'ITEMS']);
    expect(result.current.getModifiableScreens()).toEqual(['USERS']);
  });
});
