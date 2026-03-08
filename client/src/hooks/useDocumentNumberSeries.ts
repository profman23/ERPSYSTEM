/**
 * Document Number Series React Query Hooks
 *
 * Follows useTaxCodes.ts pattern.
 * No create/delete mutations — series are auto-seeded on branch creation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────

export interface DocumentNumberSeries {
  id: string;
  tenantId: string;
  branchId: string;
  documentType: string;
  prefix: string;
  separator: string;
  nextNumber: number;
  padding: number;
  branchSequence: number;
  name: string;
  nameAr?: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentNumberSeriesListParams {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: string;
  branchId?: string;
  documentType?: string;
}

export interface UpdateDocumentNumberSeriesInput {
  prefix?: string;
  separator?: string;
  nextNumber?: number;
  padding?: number;
  version: number;
}

// ─── Query Keys ──────────────────────────────────────────────────────────

export const documentNumberSeriesKeys = {
  all: ['documentNumberSeries'] as const,
  lists: () => [...documentNumberSeriesKeys.all, 'list'] as const,
  list: (params: DocumentNumberSeriesListParams) => [...documentNumberSeriesKeys.lists(), params] as const,
  details: () => [...documentNumberSeriesKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentNumberSeriesKeys.details(), id] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────

export function useDocumentNumberSeriesList(params: DocumentNumberSeriesListParams = {}) {
  return useQuery({
    queryKey: documentNumberSeriesKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/document-number-series', { params });
      return data.data as {
        data: DocumentNumberSeries[];
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

export function useDocumentNumberSeriesDetail(id: string | undefined) {
  return useQuery({
    queryKey: documentNumberSeriesKeys.detail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenant/document-number-series/${id}`);
      return data.data as DocumentNumberSeries;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateDocumentNumberSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateDocumentNumberSeriesInput & { id: string }) => {
      const { data } = await apiClient.put(`/tenant/document-number-series/${id}`, input);
      return data.data as DocumentNumberSeries;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: documentNumberSeriesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentNumberSeriesKeys.detail(variables.id) });
    },
  });
}
