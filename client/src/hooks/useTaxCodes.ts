/**
 * Tax Codes React Query Hooks
 *
 * Follows useSpecies.ts pattern with active codes endpoint for dropdowns.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────

export interface TaxCode {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  taxType: 'OUTPUT_TAX' | 'INPUT_TAX' | 'EXEMPT';
  rate: string;
  calculationMethod: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'TAX_INCLUDED';
  salesTaxAccountId: string | null;
  purchaseTaxAccountId: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  jurisdiction: string | null;
  metadata?: Record<string, unknown>;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxCodeListParams {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: string;
  taxType?: string;
}

export interface CreateTaxCodeInput {
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  taxType: 'OUTPUT_TAX' | 'INPUT_TAX' | 'EXEMPT';
  rate: number;
  calculationMethod?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'TAX_INCLUDED';
  salesTaxAccountId?: string | null;
  purchaseTaxAccountId?: string | null;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  jurisdiction?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaxCodeInput {
  code?: string;
  name?: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  rate?: number;
  calculationMethod?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'TAX_INCLUDED';
  salesTaxAccountId?: string | null;
  purchaseTaxAccountId?: string | null;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  jurisdiction?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
  version: number;
}

// ─── Query Keys ──────────────────────────────────────────────────────────

export const taxCodeKeys = {
  all: ['taxCodes'] as const,
  lists: () => [...taxCodeKeys.all, 'list'] as const,
  list: (params: TaxCodeListParams) => [...taxCodeKeys.lists(), params] as const,
  active: (taxType?: string) => [...taxCodeKeys.all, 'active', taxType] as const,
  details: () => [...taxCodeKeys.all, 'detail'] as const,
  detail: (id: string) => [...taxCodeKeys.details(), id] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────

export function useTaxCodesList(params: TaxCodeListParams = {}) {
  return useQuery({
    queryKey: taxCodeKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/tax-codes', { params });
      return data.data as {
        data: TaxCode[];
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

export function useActiveTaxCodes(taxType?: string) {
  return useQuery({
    queryKey: taxCodeKeys.active(taxType),
    queryFn: async () => {
      const params = taxType ? { taxType } : undefined;
      const { data } = await apiClient.get('/tenant/tax-codes/active', { params });
      return data.data as TaxCode[];
    },
    staleTime: 5 * 60 * 1000, // 5min — config-level data for dropdowns
  });
}

export function useTaxCodeDetail(id: string | undefined) {
  return useQuery({
    queryKey: taxCodeKeys.detail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenant/tax-codes/${id}`);
      return data.data as TaxCode;
    },
    enabled: !!id,
  });
}

export function useCreateTaxCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaxCodeInput) => {
      const { data } = await apiClient.post('/tenant/tax-codes', input);
      return data.data as TaxCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxCodeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taxCodeKeys.active() });
    },
  });
}

export function useUpdateTaxCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTaxCodeInput & { id: string }) => {
      const { data } = await apiClient.put(`/tenant/tax-codes/${id}`, input);
      return data.data as TaxCode;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taxCodeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taxCodeKeys.active() });
      queryClient.invalidateQueries({ queryKey: taxCodeKeys.detail(variables.id) });
    },
  });
}

export function useDeleteTaxCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tenant/tax-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxCodeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taxCodeKeys.active() });
    },
  });
}
