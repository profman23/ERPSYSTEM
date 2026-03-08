/**
 * Breeds Hooks
 *
 * React Query hooks for breed CRUD operations.
 * Includes useBreedsBySpecies for cascading dropdown in patient form.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Breed {
  id: string;
  tenantId: string;
  speciesId: string;
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BreedListParams {
  search?: string;
  speciesId?: string;
  page?: number;
  limit?: number;
  isActive?: string;
}

export interface CreateBreedInput {
  speciesId: string;
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
}

export type UpdateBreedInput = Partial<CreateBreedInput>;

// ─── Query Keys ──────────────────────────────────────────────────────────────

const breedKeys = {
  all: ['breeds'] as const,
  lists: () => [...breedKeys.all, 'list'] as const,
  list: (params: BreedListParams) => [...breedKeys.lists(), params] as const,
  details: () => [...breedKeys.all, 'detail'] as const,
  detail: (id: string) => [...breedKeys.details(), id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useBreedsList(params: BreedListParams = {}) {
  return useQuery({
    queryKey: breedKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/breeds', { params });
      return data.data as {
        data: Breed[];
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
 * Fetch breeds filtered by species ID — used for cascading dropdown.
 * Only fires when speciesId is provided.
 */
export function useBreedsBySpecies(speciesId: string | undefined) {
  return useQuery({
    queryKey: breedKeys.list({ speciesId, limit: 100, isActive: 'true' }),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/breeds', {
        params: { speciesId, limit: 100, isActive: 'true' },
      });
      return data.data as {
        data: Breed[];
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
    enabled: !!speciesId,
  });
}

export function useBreedDetail(id: string | undefined) {
  return useQuery({
    queryKey: breedKeys.detail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenant/breeds/${id}`);
      return data.data as Breed;
    },
    enabled: !!id,
  });
}

export function useCreateBreed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBreedInput) => {
      const { data } = await apiClient.post('/tenant/breeds', input);
      return data.data as Breed;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: breedKeys.lists() });
    },
  });
}

export function useUpdateBreed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateBreedInput & { id: string }) => {
      const { data } = await apiClient.put(`/tenant/breeds/${id}`, input);
      return data.data as Breed;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: breedKeys.lists() });
      queryClient.invalidateQueries({ queryKey: breedKeys.detail(variables.id) });
    },
  });
}

export function useDeleteBreed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tenant/breeds/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: breedKeys.lists() });
    },
  });
}
