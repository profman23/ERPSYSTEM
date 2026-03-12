import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createHookWrapper, createTestQueryClient } from '../test/renderWithProviders';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { useTrialBalance, useAccountLedger, glReportKeys } from './useGLReports';

const API = 'http://localhost:5500/api/v1';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockTrialBalance = {
  fiscalYear: 2025,
  periodFrom: 1,
  periodTo: 12,
  branchId: null,
  totals: { totalDebit: '50000.00', totalCredit: '50000.00' },
  accounts: [
    {
      accountId: 'acc-1',
      code: '1100',
      name: 'Cash',
      nameAr: null,
      accountType: 'ASSET',
      normalBalance: 'DEBIT',
      totalDebit: '30000.00',
      totalCredit: '10000.00',
      netBalance: '20000.00',
    },
    {
      accountId: 'acc-2',
      code: '2100',
      name: 'Accounts Payable',
      nameAr: null,
      accountType: 'LIABILITY',
      normalBalance: 'CREDIT',
      totalDebit: '20000.00',
      totalCredit: '40000.00',
      netBalance: '-20000.00',
    },
  ],
};

const mockAccountLedger = {
  account: {
    id: 'acc-1',
    code: '1100',
    name: 'Cash',
    nameAr: null,
    accountType: 'ASSET',
    normalBalance: 'DEBIT',
  },
  entries: [
    {
      jeId: 'je-1',
      jeCode: '10000001',
      postingDate: '2025-01-15',
      remarks: 'Opening balance',
      remarksAr: null,
      sourceType: 'MANUAL',
      lineRemarks: null,
      debit: '30000.00',
      credit: '0.00',
      runningBalance: '30000.00',
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
  summary: {
    totalDebit: '30000.00',
    totalCredit: '0.00',
    closingBalance: '30000.00',
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useTrialBalance', () => {
  it('fetches and returns trial balance data', async () => {
    server.use(
      http.get(`${API}/tenant/gl-reports/trial-balance`, () => {
        return HttpResponse.json({ success: true, data: mockTrialBalance });
      }),
    );

    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(
      () => useTrialBalance({ fiscalYear: 2025, periodFrom: 1, periodTo: 12 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.accounts).toHaveLength(2);
    expect(result.current.data?.totals.totalDebit).toBe('50000.00');
    expect(result.current.data?.totals.totalCredit).toBe('50000.00');
    expect(result.current.data?.fiscalYear).toBe(2025);
  });

  it('is disabled when fiscalYear is falsy', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(
      () => useTrialBalance({ fiscalYear: 0 }),
      { wrapper },
    );

    // Should not fetch — stays idle
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.isSuccess).toBe(false);
  });

  it('query key contains params', () => {
    const params = { fiscalYear: 2025, periodFrom: 1, periodTo: 6 };
    const key = glReportKeys.trialBalance(params);

    expect(key).toEqual(['gl-reports', 'trial-balance', params]);
    expect(key[2]).toMatchObject({ fiscalYear: 2025, periodFrom: 1, periodTo: 6 });
  });
});

describe('useAccountLedger', () => {
  it('fetches and returns account ledger data', async () => {
    server.use(
      http.get(`${API}/tenant/gl-reports/account-ledger`, () => {
        return HttpResponse.json({ success: true, data: mockAccountLedger });
      }),
    );

    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(
      () =>
        useAccountLedger({
          accountId: 'acc-1',
          dateFrom: '2025-01-01',
          dateTo: '2025-12-31',
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.entries).toHaveLength(1);
    expect(result.current.data?.account.code).toBe('1100');
    expect(result.current.data?.summary.closingBalance).toBe('30000.00');
    expect(result.current.data?.pagination.total).toBe(1);
  });

  it('is disabled when accountId is empty', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(
      () =>
        useAccountLedger({
          accountId: '',
          dateFrom: '2025-01-01',
          dateTo: '2025-12-31',
        }),
      { wrapper },
    );

    // Should not fetch — stays idle
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.isSuccess).toBe(false);
  });

  it('query key contains params', () => {
    const params = {
      accountId: 'acc-1',
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
      branchId: 'branch-1',
    };
    const key = glReportKeys.accountLedger(params);

    expect(key).toEqual(['gl-reports', 'account-ledger', params]);
    expect(key[2]).toMatchObject({ accountId: 'acc-1', branchId: 'branch-1' });
  });
});
