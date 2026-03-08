/**
 * Species Hooks (Reference Feature Template)
 *
 * COPY THIS FILE for any new domain entity hooks.
 * Pattern:
 *   - Uses apiClient exclusively (NEVER raw axios)
 *   - Query keys follow [entity, ...filters] pattern
 *   - Mutations invalidate related queries on success
 *   - All hooks are typed with proper generics
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Species {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SpeciesListParams {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: string;
}

export interface CreateSpeciesInput {
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateSpeciesInput = Partial<CreateSpeciesInput>;

// ─── Query Keys ──────────────────────────────────────────────────────────────

const speciesKeys = {
  all: ['species'] as const,
  lists: () => [...speciesKeys.all, 'list'] as const,
  list: (params: SpeciesListParams) => [...speciesKeys.lists(), params] as const,
  details: () => [...speciesKeys.all, 'detail'] as const,
  detail: (id: string) => [...speciesKeys.details(), id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useSpeciesList(params: SpeciesListParams = {}) {
  return useQuery({
    queryKey: speciesKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/species', { params });
      return data.data as {
        data: Species[];
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

export function useSpeciesDetail(id: string | undefined) {
  return useQuery({
    queryKey: speciesKeys.detail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenant/species/${id}`);
      return data.data as Species;
    },
    enabled: !!id,
  });
}

export function useCreateSpecies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSpeciesInput) => {
      const { data } = await apiClient.post('/tenant/species', input);
      return data.data as Species;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speciesKeys.lists() });
    },
  });
}

export function useUpdateSpecies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateSpeciesInput & { id: string }) => {
      const { data } = await apiClient.put(`/tenant/species/${id}`, input);
      return data.data as Species;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: speciesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: speciesKeys.detail(variables.id) });
    },
  });
}

export function useDeleteSpecies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tenant/species/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: speciesKeys.lists() });
    },
  });
}
