/**
 * useScreenPermission — SAP B1 Style Screen Authorization Hook
 *
 * Consolidates canAccess (level >= 1) and canModify (level === 2) into a single
 * memoized call. Use this in every page component to enforce DPF authorization.
 *
 * Usage:
 *   const { canAccess, canModify, isLoading } = useScreenPermission('BRANCHES');
 */

import { useMemo } from 'react';
import { usePermissions } from './usePermissions';

export function useScreenPermission(screenCode: string) {
  const { canAccessScreen, canModifyScreen, loading } = usePermissions();

  return useMemo(() => ({
    canAccess: canAccessScreen(screenCode),
    canModify: canModifyScreen(screenCode),
    isLoading: loading,
  }), [canAccessScreen, canModifyScreen, loading, screenCode]);
}
