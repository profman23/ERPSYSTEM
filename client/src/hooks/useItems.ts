/**
 * Item Master Data React Query Hooks
 *
 * Follows useItemGroups.ts / useUnitOfMeasures.ts pattern.
 * Adds image upload/remove mutations (multipart/form-data).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────

export interface Item {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  imageUrl?: string;
  itemType: 'ITEM' | 'SERVICE';
  itemGroupId: string | null;
  isInventoryItem: boolean;
  isSalesItem: boolean;
  isPurchaseItem: boolean;
  isCounterSell: boolean;
  inventoryUomId: string | null;
  purchaseUomId: string | null;
  purchaseUomFactor: string;
  salesUomId: string | null;
  salesUomFactor: string;
  standardCost: string | null;
  lastPurchasePrice: string | null;
  defaultSellingPrice: string | null;
  barcode: string | null;
  minimumStock: string | null;
  maximumStock: string | null;
  defaultWarehouseId: string | null;
  preferredVendor: string | null;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemListParams {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: string;
  itemType?: string;
  itemGroupId?: string;
}

export interface CreateItemInput {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  itemType: 'ITEM' | 'SERVICE';
  itemGroupId?: string | null;
  isInventoryItem?: boolean;
  isSalesItem?: boolean;
  isPurchaseItem?: boolean;
  isCounterSell?: boolean;
  inventoryUomId?: string | null;
  purchaseUomId?: string | null;
  purchaseUomFactor?: number;
  salesUomId?: string | null;
  salesUomFactor?: number;
  standardCost?: number | null;
  lastPurchasePrice?: number | null;
  defaultSellingPrice?: number | null;
  barcode?: string | null;
  minimumStock?: number | null;
  maximumStock?: number | null;
  defaultWarehouseId?: string | null;
  preferredVendor?: string | null;
}

export interface UpdateItemInput {
  name?: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  itemType?: 'ITEM' | 'SERVICE';
  itemGroupId?: string | null;
  isInventoryItem?: boolean;
  isSalesItem?: boolean;
  isPurchaseItem?: boolean;
  isCounterSell?: boolean;
  inventoryUomId?: string | null;
  purchaseUomId?: string | null;
  purchaseUomFactor?: number;
  salesUomId?: string | null;
  salesUomFactor?: number;
  standardCost?: number | null;
  lastPurchasePrice?: number | null;
  defaultSellingPrice?: number | null;
  barcode?: string | null;
  minimumStock?: number | null;
  maximumStock?: number | null;
  defaultWarehouseId?: string | null;
  preferredVendor?: string | null;
  isActive?: boolean;
  version: number;
}

// ─── Query Keys ──────────────────────────────────────────────────────────

export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (params: ItemListParams) => [...itemKeys.lists(), params] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────

export function useItemsList(params: ItemListParams = {}) {
  return useQuery({
    queryKey: itemKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/items', { params });
      return data.data as {
        data: Item[];
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

export function useItemDetail(id: string | undefined) {
  return useQuery({
    queryKey: itemKeys.detail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenant/items/${id}`);
      return data.data as Item;
    },
    enabled: !!id,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateItemInput) => {
      const { data } = await apiClient.post('/tenant/items', input);
      return data.data as Item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateItemInput & { id: string }) => {
      const { data } = await apiClient.put(`/tenant/items/${id}`, input);
      return data.data as Item;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(variables.id) });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tenant/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

export function useToggleItemActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive, version }: { id: string; isActive: boolean; version: number }) => {
      const { data } = await apiClient.put(`/tenant/items/${id}`, { isActive, version });
      return data.data as Item;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(variables.id) });
    },
  });
}

export function useUploadItemImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await apiClient.post(`/tenant/items/${id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as Item;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(variables.id) });
    },
  });
}

export function useRemoveItemImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/tenant/items/${id}/image`);
      return data.data as Item;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(id) });
    },
  });
}
