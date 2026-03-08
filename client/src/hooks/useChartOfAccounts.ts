/**
 * Chart of Accounts React Query Hooks
 *
 * Provides data fetching, caching, and mutation hooks for COA.
 * Follows the Species hook pattern with tree-specific additions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────

export interface ChartOfAccount {
  id: string;
  tenantId: string;
  parentId: string | null;
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normalBalance: 'DEBIT' | 'CREDIT';
  isPostable: boolean;
  level: number;
  path: string;
  currency?: string;
  isCashAccount: boolean;
  isBankAccount: boolean;
  isSystemAccount: boolean;
  metadata?: Record<string, unknown>;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountTreeNode {
  account: ChartOfAccount;
  children: AccountTreeNode[];
}

export interface ChartOfAccountsListParams {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: string;
  accountType?: string;
  isPostable?: string;
  parentId?: string;
}

export interface CreateChartOfAccountInput {
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  parentId?: string | null;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normalBalance?: 'DEBIT' | 'CREDIT';
  isPostable?: boolean;
  currency?: string;
  isCashAccount?: boolean;
  isBankAccount?: boolean;
  metadata?: Record<string, unknown>;
}

export type UpdateChartOfAccountInput = Partial<Omit<CreateChartOfAccountInput, 'accountType'>> & {
  version?: number;
};

// ─── Query Key Factory ──────────────────────────────────────────────────

export const chartOfAccountsKeys = {
  all: ['chartOfAccounts'] as const,
  lists: () => [...chartOfAccountsKeys.all, 'list'] as const,
  list: (params: ChartOfAccountsListParams) =>
    [...chartOfAccountsKeys.lists(), params] as const,
  tree: (params?: { accountType?: string }) =>
    [...chartOfAccountsKeys.all, 'tree', params] as const,
  postable: (accountType?: string) =>
    [...chartOfAccountsKeys.all, 'postable', accountType] as const,
  details: () => [...chartOfAccountsKeys.all, 'detail'] as const,
  detail: (id: string) =>
    [...chartOfAccountsKeys.details(), id] as const,
};

// ─── List Query (flat, paginated) ───────────────────────────────────────

export function useChartOfAccountsList(params: ChartOfAccountsListParams = {}) {
  return useQuery({
    queryKey: chartOfAccountsKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/chart-of-accounts', { params });
      return data.data as {
        data: ChartOfAccount[];
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
    staleTime: 30_000, // 30s — CLAUDE.md: staleTime 30s lists
  });
}

// ─── Tree Query (full hierarchy) ────────────────────────────────────────

export function useChartOfAccountsTree(params?: { accountType?: string }) {
  return useQuery({
    queryKey: chartOfAccountsKeys.tree(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/chart-of-accounts/tree', { params });
      return data.data as {
        tree: AccountTreeNode[];
        flatCount: number;
      };
    },
    staleTime: 30 * 1000, // 30s
  });
}

// ─── Postable Accounts (for dropdowns) ──────────────────────────────────

export function usePostableAccounts(accountType?: string) {
  return useQuery({
    queryKey: chartOfAccountsKeys.postable(accountType),
    queryFn: async () => {
      const params = accountType ? { accountType } : undefined;
      const { data } = await apiClient.get('/tenant/chart-of-accounts/postable', { params });
      return data.data as ChartOfAccount[];
    },
    staleTime: 5 * 60 * 1000, // 5min
  });
}

// ─── Detail Query ───────────────────────────────────────────────────────

export function useChartOfAccountDetail(id: string | undefined) {
  return useQuery({
    queryKey: chartOfAccountsKeys.detail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenant/chart-of-accounts/${id}`);
      return data.data as ChartOfAccount;
    },
    enabled: !!id,
  });
}

// ─── Create Mutation ────────────────────────────────────────────────────

export function useCreateChartOfAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateChartOfAccountInput) => {
      const { data } = await apiClient.post('/tenant/chart-of-accounts', input);
      return data.data as ChartOfAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.tree() });
      queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.postable() });
    },
  });
}

// ─── Update Mutation ────────────────────────────────────────────────────

export function useUpdateChartOfAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateChartOfAccountInput & { id: string }) => {
      const { data } = await apiClient.put(`/tenant/chart-of-accounts/${id}`, input);
      return data.data as ChartOfAccount;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.tree() });
      queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.postable() });
    },
  });
}

// ─── Move Mutation ──────────────────────────────────────────────────────

export function useMoveChartOfAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newParentId }: { id: string; newParentId: string | null }) => {
      const { data } = await apiClient.put(`/tenant/chart-of-accounts/${id}/move`, { newParentId });
      return data.data as ChartOfAccount;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.tree() });
      queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.detail(variables.id) });
    },
  });
}

// ─── Delete Mutation ────────────────────────────────────────────────────

export function useDeleteChartOfAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tenant/chart-of-accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.tree() });
      queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.postable() });
    },
  });
}
