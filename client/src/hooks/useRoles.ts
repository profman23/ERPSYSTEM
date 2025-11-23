/**
 * React Query Hooks for Role Management
 * Provides data fetching, mutations, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type {
  RoleListItem,
  CreateRoleInput,
  UpdateRoleInput,
  PaginatedResponse,
  ApiResponse,
} from '../../../types/dpf';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface UseRolesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export function useRoles(params: UseRolesParams = {}) {
  return useQuery({
    queryKey: ['roles', params],
    queryFn: async (): Promise<PaginatedResponse<RoleListItem>> => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());

      const { data } = await axios.get<ApiResponse<PaginatedResponse<RoleListItem>>>(
        `${API_BASE}/tenant/roles?${searchParams.toString()}`
      );
      return data.data!;
    },
  });
}

export function useRole(roleId: string | undefined) {
  return useQuery({
    queryKey: ['roles', roleId],
    queryFn: async (): Promise<RoleListItem> => {
      const { data } = await axios.get<ApiResponse<RoleListItem>>(
        `${API_BASE}/tenant/roles/${roleId}`
      );
      return data.data!;
    },
    enabled: !!roleId,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRoleInput) => {
      const { data } = await axios.post<ApiResponse<RoleListItem>>(
        `${API_BASE}/tenant/roles`,
        input
      );
      return data.data!;
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
      const { data } = await axios.patch<ApiResponse<RoleListItem>>(
        `${API_BASE}/tenant/roles/${id}`,
        input
      );
      return data.data!;
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
      const { data } = await axios.delete<ApiResponse<{ success: boolean; message: string }>>(
        `${API_BASE}/tenant/roles/${roleId}`
      );
      return data.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}
