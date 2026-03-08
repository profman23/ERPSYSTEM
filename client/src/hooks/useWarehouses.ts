/**
 * Warehouses React Query Hooks
 *
 * Follows useSpecies.ts pattern with branch-filtered list endpoint.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────

export interface Warehouse {
  id: string;
  tenantId: string;
  branchId: string;
  code: string;
  name: string;
  warehouseType: 'STANDARD' | 'COLD_STORAGE' | 'DROP_SHIP';
  location?: string;
  managerName?: string;
  phone?: string;
  email?: string;
  isDefault: boolean;
  description?: string;
  metadata?: Record<string, unknown>;
  // GL Accounts (SAP B1 Standard)
  inventoryAccountId: string | null;
  cogsAccountId: string | null;
  priceDifferenceAccountId: string | null;
  revenueAccountId: string | null;
  expenseAccountId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseListParams {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: string;
  branchId?: string;
  warehouseType?: string;
}

export interface CreateWarehouseInput {
  branchId: string;
  code: string;
  name: string;
  warehouseType?: 'STANDARD' | 'COLD_STORAGE' | 'DROP_SHIP';
  location?: string;
  managerName?: string;
  phone?: string;
  email?: string;
  isDefault?: boolean;
  description?: string;
  metadata?: Record<string, unknown>;
  inventoryAccountId?: string | null;
  cogsAccountId?: string | null;
  priceDifferenceAccountId?: string | null;
  revenueAccountId?: string | null;
  expenseAccountId?: string | null;
}

export type UpdateWarehouseInput = Partial<CreateWarehouseInput>;

// ─── Query Keys ──────────────────────────────────────────────────────────

export const warehouseKeys = {
  all: ['warehouses'] as const,
  lists: () => [...warehouseKeys.all, 'list'] as const,
  list: (params: WarehouseListParams) => [...warehouseKeys.lists(), params] as const,
  byBranch: (branchId: string) => [...warehouseKeys.all, 'branch', branchId] as const,
  details: () => [...warehouseKeys.all, 'detail'] as const,
  detail: (id: string) => [...warehouseKeys.details(), id] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────

export function useWarehousesList(params: WarehouseListParams = {}) {
  return useQuery({
    queryKey: warehouseKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/warehouses', { params });
      return data.data as {
        data: Warehouse[];
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

export function useWarehousesByBranch(branchId: string | undefined) {
  return useQuery({
    queryKey: warehouseKeys.byBranch(branchId!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenant/warehouses/branch/${branchId}`);
      return data.data as { items: Warehouse[]; total: number };
    },
    enabled: !!branchId,
  });
}

export function useWarehouseDetail(id: string | undefined) {
  return useQuery({
    queryKey: warehouseKeys.detail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenant/warehouses/${id}`);
      return data.data as Warehouse;
    },
    enabled: !!id,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWarehouseInput) => {
      const { data } = await apiClient.post('/tenant/warehouses', input);
      return data.data as Warehouse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateWarehouseInput & { id: string }) => {
      const { data } = await apiClient.put(`/tenant/warehouses/${id}`, input);
      return data.data as Warehouse;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.detail(variables.id) });
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tenant/warehouses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
  });
}

export function useToggleWarehouseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/tenant/warehouses/${id}/status`);
      return data.data as { id: string; isActive: boolean };
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.detail(id) });
    },
  });
}
