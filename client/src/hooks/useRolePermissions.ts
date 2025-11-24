/**
 * React Query Hooks for Permission Management
 * Provides permission matrix and role permission assignment
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import type {
  PermissionMatrixModule,
  DPFPermission,
  AssignPermissionsInput,
  ApiResponse,
} from '../../../types/dpf';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function usePermissionMatrix() {
  return useQuery({
    queryKey: ['permissions', 'matrix'],
    queryFn: async (): Promise<PermissionMatrixModule[]> => {
      const { data } = await axios.get<ApiResponse<PermissionMatrixModule[]>>(
        `${API_BASE}/tenant/permissions/matrix`
      );
      return data.data!;
    },
  });
}

export function useAllPermissions() {
  return useQuery({
    queryKey: ['permissions', 'all'],
    queryFn: async (): Promise<DPFPermission[]> => {
      const { data } = await axios.get<ApiResponse<DPFPermission[]>>(
        `${API_BASE}/tenant/permissions/all`
      );
      return data.data!;
    },
  });
}

export function useRolePermissions(roleId: string | undefined) {
  return useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: async (): Promise<string[]> => {
      const { data } = await axios.get<ApiResponse<string[]>>(
        `${API_BASE}/tenant/roles/${roleId}/permissions`
      );
      return data.data!;
    },
    enabled: !!roleId,
  });
}

export function useBatchRolePermissions(roleIds: string[]) {
  const { accessToken } = useAuth();
  
  return useQuery({
    queryKey: ['batch-role-permissions', roleIds.sort().join(',')],
    queryFn: async () => {
      if (roleIds.length === 0 || !accessToken) {
        return { permissions: [], rolePermissionsMap: {} };
      }

      const responses = await Promise.all(
        roleIds.map(roleId =>
          axios.get<ApiResponse<{ roleId: string; permissions: DPFPermission[] }>>(
            `${API_BASE}/tenant/roles/${roleId}/permissions`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          ).catch(() => ({ data: { data: { roleId, permissions: [] } } }))
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
          
          permissions.forEach(perm => {
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
    enabled: roleIds.length > 0 && !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssignPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignPermissionsInput) => {
      const { data } = await axios.post<ApiResponse<{ success: boolean }>>(
        `${API_BASE}/tenant/roles/${input.roleId}/permissions`,
        { permissionIds: input.permissionIds }
      );
      return data.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.roleId] });
      queryClient.invalidateQueries({ queryKey: ['batch-role-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['roles', variables.roleId] });
    },
  });
}
