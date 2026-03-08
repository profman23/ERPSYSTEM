/**
 * Posting Periods React Query Hooks
 *
 * Follows useTaxCodes.ts pattern.
 * Manages fiscal year headers and monthly sub-periods.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────

export interface PostingPeriod {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  nameAr?: string;
  fiscalYear: number;
  numberOfPeriods: number;
  startDate: string;
  endDate: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostingSubPeriod {
  id: string;
  tenantId: string;
  postingPeriodId: string;
  periodNumber: number;
  code: string;
  name: string;
  nameAr?: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'CLOSED' | 'LOCKED';
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostingPeriodListParams {
  search?: string;
  page?: number;
  limit?: number;
  fiscalYear?: number;
  isActive?: string;
}

export interface CreatePostingPeriodInput {
  fiscalYear: number;
  startDate: string;
  endDate: string;
}

export interface UpdateSubPeriodInput {
  status?: 'OPEN' | 'CLOSED' | 'LOCKED';
  isActive?: boolean;
  version: number;
}

// ─── Query Keys ──────────────────────────────────────────────────────────

export const postingPeriodKeys = {
  all: ['postingPeriods'] as const,
  lists: () => [...postingPeriodKeys.all, 'list'] as const,
  list: (params: PostingPeriodListParams) => [...postingPeriodKeys.lists(), params] as const,
  details: () => [...postingPeriodKeys.all, 'detail'] as const,
  detail: (id: string) => [...postingPeriodKeys.details(), id] as const,
  subPeriods: (id: string) => [...postingPeriodKeys.all, 'subPeriods', id] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────

export function usePostingPeriodsList(params: PostingPeriodListParams = {}) {
  return useQuery({
    queryKey: postingPeriodKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/posting-periods', { params });
      return data.data as {
        data: PostingPeriod[];
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

export function usePostingPeriodDetail(id: string | undefined) {
  return useQuery({
    queryKey: postingPeriodKeys.detail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenant/posting-periods/${id}`);
      return data.data as PostingPeriod;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePostingPeriodSubPeriods(postingPeriodId: string | undefined) {
  return useQuery({
    queryKey: postingPeriodKeys.subPeriods(postingPeriodId!),
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/tenant/posting-periods/${postingPeriodId}/sub-periods`,
        { params: { limit: 12 } },
      );
      return data.data as {
        data: PostingSubPeriod[];
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
    enabled: !!postingPeriodId,
    staleTime: 30_000,
  });
}

export function useCreatePostingPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostingPeriodInput) => {
      const { data } = await apiClient.post('/tenant/posting-periods', input);
      return data.data as PostingPeriod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postingPeriodKeys.lists() });
    },
  });
}

export function useUpdatePostingSubPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subId, ...input }: UpdateSubPeriodInput & { subId: string }) => {
      const { data } = await apiClient.put(`/tenant/posting-periods/sub-periods/${subId}`, input);
      return data.data as PostingSubPeriod;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: postingPeriodKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postingPeriodKeys.subPeriods(result.postingPeriodId) });
    },
  });
}
