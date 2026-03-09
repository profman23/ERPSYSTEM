/**
 * React Query Hooks for Role Management
 * Uses apiClient exclusively for consistent auth, dedup, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  RoleListItem,
  CreateRoleInput,
  UpdateRoleInput,
  PaginatedResponse,
} from '@shared/dpf';

interface UseRolesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  tenantId?: string;
  systemOnly?: boolean;
  enabled?: boolean;
}

export function useRoles(params: UseRolesParams = {}) {
  const { enabled = true, ...queryParams } = params;

  return useQuery({
    queryKey: ['roles', queryParams],
    queryFn: async (): Promise<PaginatedResponse<RoleListItem>> => {
      const searchParams = new URLSearchParams();
      if (queryParams.page) searchParams.append('page', queryParams.page.toString());
      if (queryParams.limit) searchParams.append('limit', queryParams.limit.toString());
      if (queryParams.search) searchParams.append('search', queryParams.search);
      if (queryParams.isActive !== undefined) searchParams.append('isActive', queryParams.isActive.toString());
      if (queryParams.tenantId) searchParams.append('tenantId', queryParams.tenantId);
      if (queryParams.systemOnly) searchParams.append('systemOnly', 'true');

      const { data } = await apiClient.get(`/tenant/roles?${searchParams.toString()}`);
      return data.data;
    },
    enabled,
  });
}

export function useRole(roleId: string | undefined) {
  return useQuery({
    queryKey: ['roles', roleId],
    queryFn: async (): Promise<RoleListItem> => {
      const { data } = await apiClient.get(`/tenant/roles/${roleId}`);
      return data.data;
    },
    enabled: !!roleId,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRoleInput) => {
      const { data } = await apiClient.post('/tenant/roles', input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateRoleInput }) => {
      const { data } = await apiClient.patch(`/tenant/roles/${id}`, input);
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['roles', variables.id] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      const { data } = await apiClient.delete(`/tenant/roles/${roleId}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

/**
 * Get role's screen authorizations (SAP B1 style)
 * GET /api/v1/tenant/roles/:id/authorizations
 * Returns: Record<screenCode, authorizationLevel (0/1/2)>
 */
export function useTenantRoleAuthorizations(roleId: string | undefined) {
  return useQuery({
    queryKey: ['roles', roleId, 'authorizations'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data } = await apiClient.get(`/tenant/roles/${roleId}/authorizations`);
      return data.data || {};
    },
    enabled: !!roleId,
    staleTime: 0,
    refetchOnMount: 'always' as const,
    gcTime: 0,
  });
}

/**
 * Update role's screen authorizations (SAP B1 style)
 * PUT /api/v1/tenant/roles/:id/authorizations
 */
export function useUpdateTenantRoleAuthorizations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roleId, authorizations }: { roleId: string; authorizations: Record<string, number> }) => {
      const { data } = await apiClient.put(`/tenant/roles/${roleId}/authorizations`, authorizations);
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles', variables.roleId, 'authorizations'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

/**
 * Create role with screen authorizations in one call (SAP B1 style)
 * POST /api/v1/tenant/roles — body includes screenAuthorizations
 */
export function useCreateRoleWithAuthorizations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRoleInput) => {
      const { data } = await apiClient.post('/tenant/roles', input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}
