/**
 * Item Groups React Query Hooks
 *
 * Follows useSpecies.ts / useTaxCodes.ts pattern.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// --- Types ---------------------------------------------------------------

export interface ItemGroup {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  itemGroupType: 'MEDICINE' | 'SURGICAL_SUPPLY' | 'EQUIPMENT' | 'CONSUMABLE' | 'SERVICE';
  inventoryAccountId: string | null;
  cogsAccountId: string | null;
  purchaseAccountId: string | null;
  revenueAccountId: string | null;
  defaultSalesTaxCodeId: string | null;
  defaultPurchaseTaxCodeId: string | null;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemGroupListParams {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: string;
  itemGroupType?: string;
}

export interface CreateItemGroupInput {
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  itemGroupType: 'MEDICINE' | 'SURGICAL_SUPPLY' | 'EQUIPMENT' | 'CONSUMABLE' | 'SERVICE';
  inventoryAccountId?: string | null;
  cogsAccountId?: string | null;
  purchaseAccountId?: string | null;
  revenueAccountId?: string | null;
  defaultSalesTaxCodeId?: string | null;
  defaultPurchaseTaxCodeId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateItemGroupInput {
  code?: string;
  name?: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  itemGroupType?: 'MEDICINE' | 'SURGICAL_SUPPLY' | 'EQUIPMENT' | 'CONSUMABLE' | 'SERVICE';
  inventoryAccountId?: string | null;
  cogsAccountId?: string | null;
  purchaseAccountId?: string | null;
  revenueAccountId?: string | null;
  defaultSalesTaxCodeId?: string | null;
  defaultPurchaseTaxCodeId?: string | null;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

// --- Query Keys ----------------------------------------------------------

export const itemGroupKeys = {
  all: ['itemGroups'] as const,
  lists: () => [...itemGroupKeys.all, 'list'] as const,
  list: (params: ItemGroupListParams) => [...itemGroupKeys.lists(), params] as const,
  details: () => [...itemGroupKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemGroupKeys.details(), id] as const,
};

// --- Hooks ---------------------------------------------------------------

export function useItemGroupsList(params: ItemGroupListParams = {}) {
  return useQuery({
    queryKey: itemGroupKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/item-groups', { params });
      return data.data as {
        data: ItemGroup[];
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

export function useItemGroupDetail(id: string | undefined) {
  return useQuery({
    queryKey: itemGroupKeys.detail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenant/item-groups/${id}`);
      return data.data as ItemGroup;
    },
    enabled: !!id,
  });
}

export function useCreateItemGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateItemGroupInput) => {
      const { data } = await apiClient.post('/tenant/item-groups', input);
      return data.data as ItemGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemGroupKeys.lists() });
    },
  });
}

export function useUpdateItemGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateItemGroupInput & { id: string }) => {
      const { data } = await apiClient.put(`/tenant/item-groups/${id}`, input);
      return data.data as ItemGroup;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: itemGroupKeys.lists() });
      queryClient.invalidateQueries({ queryKey: itemGroupKeys.detail(variables.id) });
    },
  });
}

export function useDeleteItemGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tenant/item-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemGroupKeys.lists() });
    },
  });
}
