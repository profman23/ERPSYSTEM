/**
 * DPF Module Hooks — Dynamic Permission Framework
 *
 * Single Source of Truth: dpfStructure.ts → DB → API → this hook → ScreenAuthorizationGrid
 * NEVER hardcode screen lists in frontend — always fetch dynamically via this hook.
 *
 * Endpoints:
 *   Tenant: GET /api/v1/tenant/dpf/modules/tree
 *   System: GET /api/v1/system/dpf/modules/tree
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ModuleDefinition } from '@/components/roles/ScreenAuthorizationGrid';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const dpfModuleKeys = {
  all: ['dpf-modules'] as const,
  tree: (scope: 'tenant' | 'system') => [...dpfModuleKeys.all, 'tree', scope] as const,
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModuleTreeResponse {
  moduleCode: string;
  moduleName: string;
  moduleNameAr: string | null;
  screens: {
    screenCode: string;
    screenName: string;
    screenNameAr: string | null;
  }[];
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetch module tree dynamically from the API.
 * Used by ScreenAuthorizationGrid in role create/edit pages.
 *
 * @param scope - 'tenant' for app/admin panel, 'system' for system panel
 * @param options.enabled - disable query when permissions are still loading
 */
export function useDPFModuleTree(
  scope: 'tenant' | 'system' = 'tenant',
  options?: { enabled?: boolean; useSystemEndpoint?: boolean }
) {
  const endpoint = scope === 'system'
    ? '/system/dpf/modules/tree'
    : options?.useSystemEndpoint
      ? '/system/dpf/modules/tree?scope=tenant'
      : '/tenant/dpf/modules/tree';

  return useQuery<ModuleDefinition[]>({
    queryKey: dpfModuleKeys.tree(scope),
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: ModuleTreeResponse[] }>(endpoint);
      // Transform API response to ModuleDefinition[] (ScreenAuthorizationGrid format)
      return (data.data || []).map((mod): ModuleDefinition => ({
        moduleCode: mod.moduleCode,
        moduleName: mod.moduleName,
        moduleNameAr: mod.moduleNameAr ?? '',
        screens: mod.screens.map((scr) => ({
          screenCode: scr.screenCode,
          screenName: scr.screenName,
          screenNameAr: scr.screenNameAr ?? '',
        })),
      }));
    },
    staleTime: 24 * 60 * 60 * 1000, // 24hr — config data per CLAUDE.md
    enabled: options?.enabled !== false,
  });
}
