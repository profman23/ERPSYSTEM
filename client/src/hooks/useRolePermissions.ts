/**
 * React Query Hooks for Permission Management
 * Uses apiClient exclusively for consistent auth, dedup, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  PermissionMatrixModule,
  DPFPermission,
  AssignPermissionsInput,
} from '@types/dpf';

/**
 * GET /api/v1/tenant/dpf/permissions/matrix
 */
export function usePermissionMatrix() {
  return useQuery({
    queryKey: ['permissions', 'matrix'],
    queryFn: async (): Promise<PermissionMatrixModule[]> => {
      const { data } = await apiClient.get('/tenant/dpf/permissions/matrix');
      return data.data;
    },
  });
}

/**
 * GET /api/v1/tenant/dpf/permissions/all
 */
export function useAllPermissions() {
  return useQuery({
    queryKey: ['permissions', 'all'],
    queryFn: async (): Promise<DPFPermission[]> => {
      const { data } = await apiClient.get('/tenant/dpf/permissions/all');
      return data.data;
    },
  });
}

/**
 * GET /api/v1/tenant/dpf/permissions/roles/:roleId/permissions
 */
export function useRolePermissions(roleId: string | undefined) {
  return useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: async (): Promise<string[]> => {
      const { data } = await apiClient.get(`/tenant/dpf/permissions/roles/${roleId}/permissions`);
      return data.data;
    },
    enabled: !!roleId,
  });
}

/**
 * Batch fetch permissions for multiple roles
 */
export function useBatchRolePermissions(roleIds: string[]) {
  return useQuery({
    queryKey: ['batch-role-permissions', roleIds.sort().join(',')],
    queryFn: async () => {
      if (roleIds.length === 0) {
        return { permissions: [], rolePermissionsMap: {} };
      }

      const responses = await Promise.all(
        roleIds.map(roleId =>
          apiClient.get(`/tenant/dpf/permissions/roles/${roleId}/permissions`)
            .catch(() => ({ data: { data: { roleId, permissions: [] } } }))
        )
      );

      const rolePermissionsMap: Record<string, DPFPermission[]> = {};
      const allPermissions: DPFPermission[] = [];
      const permissionCodesSeen = new Set<string>();

      responses.forEach(response => {
        const responseData = response.data.data;
        if (responseData && responseData.permissions) {
          const { roleId, permissions } = responseData;
          rolePermissionsMap[roleId] = permissions;

          permissions.forEach((perm: DPFPermission) => {
            if (!permissionCodesSeen.has(perm.permissionCode)) {
              permissionCodesSeen.add(perm.permissionCode);
              allPermissions.push(perm);
            }
          });
        }
      });

      return {
        permissions: allPermissions,
        rolePermissionsMap,
      };
    },
    enabled: roleIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * POST /api/v1/tenant/dpf/permissions/roles/:roleId/permissions
 */
export function useAssignPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignPermissionsInput) => {
      const { data } = await apiClient.post(
        `/tenant/dpf/permissions/roles/${input.roleId}/permissions`,
        { permissionIds: input.permissionIds }
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.roleId] });
      queryClient.invalidateQueries({ queryKey: ['batch-role-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['roles', variables.roleId] });
    },
  });
}
