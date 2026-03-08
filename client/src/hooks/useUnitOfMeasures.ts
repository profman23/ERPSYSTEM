/**
 * Unit of Measure React Query Hooks
 *
 * Simple dictionary CRUD — no conversion logic (handled at Item level).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────

export interface UnitOfMeasure {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  nameAr?: string;
  symbol?: string;
  description?: string;
  descriptionAr?: string;
  baseUnitCode: string | null;
  conversionFactor: string | null;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnitOfMeasureListParams {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: string;
}

export interface CreateUnitOfMeasureInput {
  code: string;
  name: string;
  nameAr?: string;
  symbol?: string;
  description?: string;
  descriptionAr?: string;
}

export interface UpdateUnitOfMeasureInput {
  code?: string;
  name?: string;
  nameAr?: string;
  symbol?: string;
  description?: string;
  descriptionAr?: string;
  isActive?: boolean;
  version: number;
}

// ─── Query Keys ──────────────────────────────────────────────────────────

export const unitOfMeasureKeys = {
  all: ['unitOfMeasures'] as const,
  lists: () => [...unitOfMeasureKeys.all, 'list'] as const,
  list: (params: UnitOfMeasureListParams) => [...unitOfMeasureKeys.lists(), params] as const,
  details: () => [...unitOfMeasureKeys.all, 'detail'] as const,
  detail: (id: string) => [...unitOfMeasureKeys.details(), id] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────

export function useUnitOfMeasuresList(params: UnitOfMeasureListParams = {}) {
  return useQuery({
    queryKey: unitOfMeasureKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/units-of-measure', { params });
      return data.data as {
        data: UnitOfMeasure[];
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
    staleTime: 30_000,
  });
}

export function useUnitOfMeasureDetail(id: string | undefined) {
  return useQuery({
    queryKey: unitOfMeasureKeys.detail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenant/units-of-measure/${id}`);
      return data.data as UnitOfMeasure;
    },
    enabled: !!id,
  });
}

export function useCreateUnitOfMeasure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUnitOfMeasureInput) => {
      const { data } = await apiClient.post('/tenant/units-of-measure', input);
      return data.data as UnitOfMeasure;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitOfMeasureKeys.lists() });
    },
  });
}

export function useUpdateUnitOfMeasure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateUnitOfMeasureInput & { id: string }) => {
      const { data } = await apiClient.put(`/tenant/units-of-measure/${id}`, input);
      return data.data as UnitOfMeasure;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: unitOfMeasureKeys.lists() });
      queryClient.invalidateQueries({ queryKey: unitOfMeasureKeys.detail(variables.id) });
    },
  });
}

export function useDeleteUnitOfMeasure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tenant/units-of-measure/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitOfMeasureKeys.lists() });
    },
  });
}
