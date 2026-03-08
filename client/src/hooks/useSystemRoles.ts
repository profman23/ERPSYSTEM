/**
 * React Query Hooks for System Role Management
 * Handles SYSTEM-level roles (platform-wide)
 *
 * NEW: Uses /system/* endpoints with SYSTEM_ROLE_LIST screen authorization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  RoleListItem,
  CreateRoleInput,
  UpdateRoleInput,
  PaginatedResponse,
  ApiResponse,
  PermissionMatrixModule,
} from '@types/dpf';

interface UseSystemRolesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

/**
 * Get SYSTEM roles
 * Uses new /system/roles endpoint with SYSTEM_ROLE_LIST authorization
 */
export function useSystemRoles(params: UseSystemRolesParams = {}) {
  return useQuery({
    queryKey: ['system-roles', params],
    queryFn: async (): Promise<PaginatedResponse<RoleListItem>> => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
      // System roles are fetched automatically from SYSTEM tenant
      searchParams.append('systemOnly', 'true');

      const queryString = searchParams.toString();
      const { data } = await apiClient.get<ApiResponse<PaginatedResponse<RoleListItem>>>(
        `/system/roles${queryString ? `?${queryString}` : ''}`
      );
      return data.data!;
    },
  });
}

/**
 * Get single system role by ID
 */
export function useSystemRole(roleId: string | undefined) {
  return useQuery({
    queryKey: ['system-roles', roleId],
    queryFn: async (): Promise<RoleListItem> => {
      const { data } = await apiClient.get<ApiResponse<RoleListItem>>(
        `/system/roles/${roleId}`
      );
      return data.data!;
    },
    enabled: !!roleId,
  });
}

/**
 * Get SYSTEM permission matrix (only SYSTEM modules)
 * Used for creating/editing system roles
 */
export function useSystemPermissionMatrix() {
  return useQuery({
    queryKey: ['permissions', 'matrix', 'system'],
    queryFn: async (): Promise<PermissionMatrixModule[]> => {
      const { data } = await apiClient.get<ApiResponse<PermissionMatrixModule[]>>(
        `/system/dpf/permissions/matrix`
      );
      return data.data!;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Get permissions assigned to a system role
 */
export function useSystemRolePermissions(roleId: string | undefined) {
  return useQuery({
    queryKey: ['system-role-permissions', roleId],
    queryFn: async (): Promise<string[]> => {
      const { data } = await apiClient.get<ApiResponse<{ roleId: string; permissionIds: string[] }>>(
        `/system/dpf/permissions/roles/${roleId}/permissions`
      );
      return data.data?.permissionIds || [];
    },
    enabled: !!roleId,
  });
}

/**
 * Create a new system role
 */
export function useCreateSystemRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRoleInput & { isSystemRole?: boolean }) => {
      const { data } = await apiClient.post<ApiResponse<RoleListItem>>(
        `/system/roles`,
        { ...input, isSystemRole: true }
      );
      return data.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-roles'] });
    },
  });
}

/**
 * Update a system role
 */
export function useUpdateSystemRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateRoleInput }) => {
      const { data } = await apiClient.patch<ApiResponse<RoleListItem>>(
        `/system/roles/${id}`,
        input
      );
      return data.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system-roles'] });
      queryClient.invalidateQueries({ queryKey: ['system-roles', variables.id] });
    },
  });
}

/**
 * Deactivate a system role (No Delete Policy)
 * Uses PATCH to set isActive: false
 */
export function useDeactivateSystemRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      const { data } = await apiClient.patch<ApiResponse<RoleListItem>>(
        `/system/roles/${roleId}`,
        { isActive: false }
      );
      return data.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-roles'] });
    },
  });
}

/**
 * Delete (deactivate) a system role
 * NOTE: Following No Delete Policy - this actually deactivates the role
 * @alias useDeactivateSystemRole
 */
export function useDeleteSystemRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      // No Delete Policy: deactivate instead of delete
      const { data } = await apiClient.patch<ApiResponse<RoleListItem>>(
        `/system/roles/${roleId}`,
        { isActive: false }
      );
      return data.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-roles'] });
    },
  });
}

/**
 * Assign permissions to a system role
 */
export function useAssignSystemPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => {
      const { data } = await apiClient.post<ApiResponse<{ success: boolean }>>(
        `/system/dpf/permissions/roles/${roleId}/permissions`,
        { permissionIds }
      );
      return data.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system-role-permissions', variables.roleId] });
      queryClient.invalidateQueries({ queryKey: ['system-roles'] });
    },
  });
}

/**
 * Get role's screen authorizations (SAP B1 style)
 * Returns: { screenCode: authorizationLevel (0/1/2) }
 */
export function useRoleAuthorizations(roleId: string | undefined) {
  return useQuery({
    queryKey: ['role-authorizations', roleId],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data } = await apiClient.get<ApiResponse<Record<string, number>>>(
        `/system/roles/${roleId}/authorizations`
      );
      return data.data || {};
    },
    enabled: !!roleId,
    staleTime: 0,
    refetchOnMount: 'always',
    gcTime: 0,
  });
}

/**
 * Update role's screen authorizations (SAP B1 style)
 */
export function useUpdateRoleAuthorizations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roleId, authorizations }: { roleId: string; authorizations: Record<string, number> }) => {
      const { data } = await apiClient.put<ApiResponse<{ success: boolean; message: string }>>(
        `/system/roles/${roleId}/authorizations`,
        authorizations
      );
      return data.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-authorizations', variables.roleId] });
      queryClient.invalidateQueries({ queryKey: ['system-roles'] });
    },
  });
}
