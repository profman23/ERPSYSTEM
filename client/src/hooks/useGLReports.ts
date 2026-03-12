/**
 * GL Reports React Query Hooks
 *
 * Trial Balance + Account Ledger report queries.
 * staleTime: 30s (live financial data).
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────

export interface TrialBalanceAccount {
  accountId: string;
  code: string;
  name: string;
  nameAr: string | null;
  accountType: string;
  normalBalance: string;
  totalDebit: string;
  totalCredit: string;
  netBalance: string;
}

export interface TrialBalanceResult {
  fiscalYear: number;
  periodFrom: number;
  periodTo: number;
  branchId: string | null;
  totals: {
    totalDebit: string;
    totalCredit: string;
  };
  accounts: TrialBalanceAccount[];
}

export interface TrialBalanceParams {
  fiscalYear: number;
  periodFrom?: number;
  periodTo?: number;
  branchId?: string;
}

export interface AccountLedgerEntry {
  jeId: string;
  jeCode: string;
  date: string;
  remarks: string | null;
  sourceType: string;
  lineRemarks: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface AccountLedgerResult {
  account: {
    id: string;
    code: string;
    name: string;
    nameAr: string | null;
    accountType: string;
    normalBalance: string;
  };
  entries: AccountLedgerEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  summary: {
    totalDebit: string;
    totalCredit: string;
    closingBalance: string;
  };
}

export interface AccountLedgerParams {
  accountId: string;
  dateFrom: string;
  dateTo: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface AccountBalanceResult {
  accountId: string;
  fiscalYear: number;
  totalDebit: string;
  totalCredit: string;
  netBalance: string;
}

// ─── Query Keys ──────────────────────────────────────────────────────────

export const glReportKeys = {
  all: ['gl-reports'] as const,
  trialBalance: (params: TrialBalanceParams) => [...glReportKeys.all, 'trial-balance', params] as const,
  accountLedger: (params: AccountLedgerParams) => [...glReportKeys.all, 'account-ledger', params] as const,
  accountBalance: (accountId: string) => [...glReportKeys.all, 'account-balance', accountId] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────

export function useTrialBalance(params: TrialBalanceParams) {
  return useQuery({
    queryKey: glReportKeys.trialBalance(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/gl-reports/trial-balance', { params });
      return data.data as TrialBalanceResult;
    },
    staleTime: 30_000,
    enabled: !!params.fiscalYear,
  });
}

export function useAccountBalance(accountId: string | undefined) {
  return useQuery({
    queryKey: glReportKeys.accountBalance(accountId!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenant/gl-reports/account-balance/${accountId}`);
      return data.data as AccountBalanceResult;
    },
    staleTime: 30_000,
    enabled: !!accountId,
  });
}

export function useAccountLedger(params: AccountLedgerParams) {
  return useQuery({
    queryKey: glReportKeys.accountLedger(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/gl-reports/account-ledger', { params });
      return data.data as AccountLedgerResult;
    },
    staleTime: 30_000,
    enabled: !!params.accountId && !!params.dateFrom && !!params.dateTo,
  });
}
