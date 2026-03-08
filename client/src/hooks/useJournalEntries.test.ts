import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { createHookWrapper, createTestQueryClient } from '../test/renderWithProviders';
import {
  useJournalEntriesList,
  useJournalEntryDetail,
  useCreateJournalEntry,
  useReverseJournalEntry,
} from './useJournalEntries';

const API = 'http://localhost:5500/api/v1';

const MOCK_ENTRY = {
  id: 'je-1',
  tenantId: 't1',
  branchId: 'br1',
  code: '10000001',
  postingDate: '2025-06-01',
  documentDate: '2025-06-01',
  remarks: 'Test entry',
  sourceType: 'MANUAL',
  status: 'POSTED' as const,
  totalDebit: '1000.00',
  totalCredit: '1000.00',
  version: 1,
  isActive: true,
  createdAt: '2025-06-01T00:00:00.000Z',
  updatedAt: '2025-06-01T00:00:00.000Z',
  lines: [
    { id: 'jl-1', tenantId: 't1', journalEntryId: 'je-1', lineNumber: 1, accountId: 'acc-1', debit: '1000.00', credit: '0.00', isActive: true, createdAt: '2025-06-01T00:00:00.000Z', updatedAt: '2025-06-01T00:00:00.000Z' },
    { id: 'jl-2', tenantId: 't1', journalEntryId: 'je-1', lineNumber: 2, accountId: 'acc-2', debit: '0.00', credit: '1000.00', isActive: true, createdAt: '2025-06-01T00:00:00.000Z', updatedAt: '2025-06-01T00:00:00.000Z' },
  ],
};

describe('useJournalEntries', () => {
  describe('useJournalEntriesList', () => {
    it('fetches paginated journal entries', async () => {
      server.use(
        http.get(`${API}/tenant/journal-entries`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              data: [MOCK_ENTRY],
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
            },
          });
        }),
      );

      const queryClient = createTestQueryClient();
      const wrapper = createHookWrapper({ queryClient });
      const { result } = renderHook(() => useJournalEntriesList(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].code).toBe('10000001');
      expect(result.current.data?.pagination.total).toBe(1);
    });

    it('passes status filter', async () => {
      let capturedUrl = '';
      server.use(
        http.get(`${API}/tenant/journal-entries`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
            },
          });
        }),
      );

      const queryClient = createTestQueryClient();
      const wrapper = createHookWrapper({ queryClient });
      const { result } = renderHook(() => useJournalEntriesList({ status: 'REVERSED' }), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(capturedUrl).toContain('status=REVERSED');
    });
  });

  describe('useJournalEntryDetail', () => {
    it('fetches single entry with lines', async () => {
      server.use(
        http.get(`${API}/tenant/journal-entries/:id`, ({ params }) => {
          if (params.id === 'je-1') {
            return HttpResponse.json({ success: true, data: MOCK_ENTRY });
          }
          return HttpResponse.json({ success: false, error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
        }),
      );

      const queryClient = createTestQueryClient();
      const wrapper = createHookWrapper({ queryClient });
      const { result } = renderHook(() => useJournalEntryDetail('je-1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe('je-1');
      expect(result.current.data?.lines).toHaveLength(2);
      expect(result.current.data?.status).toBe('POSTED');
    });

    it('is disabled when id is undefined', () => {
      const queryClient = createTestQueryClient();
      const wrapper = createHookWrapper({ queryClient });
      const { result } = renderHook(() => useJournalEntryDetail(undefined), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreateJournalEntry', () => {
    it('calls POST and invalidates lists', async () => {
      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const wrapper = createHookWrapper({ queryClient });

      const { result } = renderHook(() => useCreateJournalEntry(), { wrapper });

      act(() => {
        result.current.mutate({
          branchId: 'br1',
          postingDate: '2025-06-01',
          documentDate: '2025-06-01',
          lines: [
            { accountId: 'acc-1', debit: 500, credit: 0 },
            { accountId: 'acc-2', debit: 0, credit: 500 },
          ],
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data?.status).toBe('POSTED');
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['journalEntries', 'list'] }),
      );
    });
  });

  describe('useReverseJournalEntry', () => {
    it('calls PUT /:id/reverse and invalidates', async () => {
      server.use(
        http.put(`${API}/tenant/journal-entries/:id/reverse`, async ({ params }) => {
          return HttpResponse.json({
            success: true,
            data: {
              ...MOCK_ENTRY,
              id: 'je-2',
              code: '10000002',
              status: 'POSTED',
              reversalOfId: params.id,
            },
          });
        }),
      );

      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const wrapper = createHookWrapper({ queryClient });

      const { result } = renderHook(() => useReverseJournalEntry(), { wrapper });

      act(() => {
        result.current.mutate({
          id: 'je-1',
          reversalDate: '2025-06-15',
          remarks: 'Reversing entry',
          version: 1,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data?.reversalOfId).toBe('je-1');
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['journalEntries', 'list'] }),
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['journalEntries', 'detail', 'je-1'] }),
      );
    });
  });
});
