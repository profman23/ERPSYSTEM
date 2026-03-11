/**
 * Journal Entries React Query Hooks
 *
 * Follows usePostingPeriods.ts pattern.
 * Manages journal entry headers and lines.
 * Document Immutability: no update mutation — only create and reverse.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────

export interface JournalEntryLine {
  id: string;
  tenantId: string;
  journalEntryId: string;
  lineNumber: number;
  accountId: string;
  debit: string;
  credit: string;
  remarks?: string;
  remarksAr?: string;
  costCenter?: string;
  accountCode?: string;
  accountName?: string;
  accountNameAr?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  branchId: string;
  code: string;
  postingDate: string;
  documentDate: string;
  dueDate?: string;
  remarks?: string;
  remarksAr?: string;
  reference?: string;
  sourceType: string;
  sourceId?: string;
  status: 'POSTED' | 'REVERSED';
  reversalOfId?: string;
  reversedById?: string;
  totalDebit: string;
  totalCredit: string;
  createdBy?: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lines?: JournalEntryLine[];
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
}

export interface JournalEntryDetail extends JournalEntry {
  lines: JournalEntryLine[];
  createdByUser: UserInfo | null;
  reversedByUser: (UserInfo & { reversedAt: string }) | null;
}

export interface JournalEntryListParams {
  search?: string;
  page?: number;
  limit?: number;
  status?: 'POSTED' | 'REVERSED';
  branchId?: string;
  postingDateFrom?: string;
  postingDateTo?: string;
  sourceType?: string;
}

export interface CreateJournalEntryInput {
  branchId: string;
  postingDate: string;
  documentDate: string;
  dueDate?: string;
  remarks?: string;
  remarksAr?: string;
  reference?: string;
  lines: {
    accountId: string;
    debit: number;
    credit: number;
    remarks?: string;
    remarksAr?: string;
  }[];
}

export interface ReverseJournalEntryInput {
  reversalDate: string;
  remarks?: string;
  version: number;
}

// ─── Query Keys ──────────────────────────────────────────────────────────

export const journalEntryKeys = {
  all: ['journalEntries'] as const,
  lists: () => [...journalEntryKeys.all, 'list'] as const,
  list: (params: JournalEntryListParams) => [...journalEntryKeys.lists(), params] as const,
  details: () => [...journalEntryKeys.all, 'detail'] as const,
  detail: (id: string) => [...journalEntryKeys.details(), id] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────

export function useJournalEntriesList(params: JournalEntryListParams = {}) {
  return useQuery({
    queryKey: journalEntryKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/journal-entries', { params });
      return data.data as {
        data: JournalEntry[];
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

export function useJournalEntryDetail(id: string | undefined) {
  return useQuery({
    queryKey: journalEntryKeys.detail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenant/journal-entries/${id}`);
      return data.data as JournalEntryDetail;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateJournalEntryInput) => {
      const { data } = await apiClient.post('/tenant/journal-entries', input);
      return data.data as JournalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalEntryKeys.lists() });
    },
  });
}

export function useReverseJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: ReverseJournalEntryInput & { id: string }) => {
      const { data } = await apiClient.put(`/tenant/journal-entries/${id}/reverse`, input);
      return data.data as JournalEntry;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: journalEntryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: journalEntryKeys.detail(variables.id) });
    },
  });
}
