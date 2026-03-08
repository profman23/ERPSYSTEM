/**
 * Clients (Pet Owners) Hooks
 *
 * React Query hooks for client CRUD operations.
 * Includes useClientSearch for typeahead in patient form.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  tenantId: string;
  code: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientListParams {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: string;
}

export interface CreateClientInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
}

export type UpdateClientInput = Partial<CreateClientInput>;

// ─── Query Keys ──────────────────────────────────────────────────────────────

const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (params: ClientListParams) => [...clientKeys.lists(), params] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientKeys.details(), id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useClientsList(params: ClientListParams = {}) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/clients', { params });
      return data.data as {
        data: Client[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      };
    },
  });
}

/**
 * Search clients by name/email — for typeahead in patient form.
 * Debounce should be applied at the component level.
 */
export function useClientSearch(search: string) {
  return useQuery({
    queryKey: clientKeys.list({ search, limit: 10, isActive: 'true' }),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/clients', {
        params: { search, limit: 10, isActive: 'true' },
      });
      return data.data as {
        data: Client[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      };
    },
    enabled: search.length >= 2,
  });
}

export function useClientDetail(id: string | undefined) {
  return useQuery({
    queryKey: clientKeys.detail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenant/clients/${id}`);
      return data.data as Client;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClientInput) => {
      const { data } = await apiClient.post('/tenant/clients', input);
      return data.data as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateClientInput & { id: string }) => {
      const { data } = await apiClient.put(`/tenant/clients/${id}`, input);
      return data.data as Client;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(variables.id) });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tenant/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
    },
  });
}
