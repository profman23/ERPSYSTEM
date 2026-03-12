import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import glReportsRouter from './glReports';
import { TEST_TENANT_A } from '../../test/helpers';

// ─── Mock GLReportService ───────────────────────────────────────────────────
// All service methods are mocked — we are testing the route/controller layer,
// not business logic (that's covered in GLReportService.test.ts).

const mockTrialBalance = vi.fn();
const mockAccountLedger = vi.fn();

vi.mock('../../services/GLReportService', () => ({
  GLReportService: {
    trialBalance: (...args: unknown[]) => mockTrialBalance(...args),
    accountLedger: (...args: unknown[]) => mockAccountLedger(...args),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(glReportsRouter, { tenantId: TEST_TENANT_A, ...options });
}

const sampleTrialBalance = {
  fiscalYear: 2025,
  periodFrom: 1,
  periodTo: 12,
  branchId: null,
  totals: { totalDebit: '10000.0000', totalCredit: '10000.0000' },
  accounts: [
    {
      accountId: 'acc-1',
      code: '1100',
      name: 'Cash',
      nameAr: 'نقد',
      accountType: 'ASSET',
      normalBalance: 'DEBIT',
      totalDebit: '10000',
      totalCredit: '5000',
      netBalance: '5000',
    },
  ],
};

const sampleAccountLedger = {
  account: {
    id: 'acc-1',
    code: '1100',
    name: 'Cash',
    nameAr: 'نقد',
    accountType: 'ASSET',
    normalBalance: 'DEBIT',
  },
  entries: [],
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  },
  summary: {
    totalDebit: '0.0000',
    totalCredit: '0.0000',
    closingBalance: '0.0000',
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /trial-balance', () => {
  it('returns 200 with trial balance data', async () => {
    mockTrialBalance.mockResolvedValue(sampleTrialBalance);

    const res = await request(app())
      .get('/trial-balance?fiscalYear=2025')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      fiscalYear: 2025,
      totals: { totalDebit: '10000.0000', totalCredit: '10000.0000' },
    });
    expect(res.body.data.accounts).toHaveLength(1);
    expect(mockTrialBalance).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ fiscalYear: 2025, periodFrom: 1, periodTo: 12 }),
    );
  });

  it('returns 400 when fiscalYear is missing', async () => {
    const res = await request(app())
      .get('/trial-balance')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(mockTrialBalance).not.toHaveBeenCalled();
  });

  it('passes periodFrom and periodTo params correctly', async () => {
    mockTrialBalance.mockResolvedValue({
      ...sampleTrialBalance,
      periodFrom: 1,
      periodTo: 6,
    });

    await request(app())
      .get('/trial-balance?fiscalYear=2025&periodFrom=1&periodTo=6')
      .expect(200);

    expect(mockTrialBalance).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ fiscalYear: 2025, periodFrom: 1, periodTo: 6 }),
    );
  });

  it('returns 400 when periodFrom is greater than periodTo', async () => {
    const res = await request(app())
      .get('/trial-balance?fiscalYear=2025&periodFrom=8&periodTo=3')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(mockTrialBalance).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app({ authenticated: false }))
      .get('/trial-balance?fiscalYear=2025')
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
    expect(mockTrialBalance).not.toHaveBeenCalled();
  });
});

describe('GET /account-ledger', () => {
  const validAccountId = '00000000-0000-0000-0000-000000000099';

  it('returns 200 with account ledger data', async () => {
    mockAccountLedger.mockResolvedValue(sampleAccountLedger);

    const res = await request(app())
      .get(`/account-ledger?accountId=${validAccountId}&dateFrom=2025-01-01&dateTo=2025-12-31`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.account).toMatchObject({ code: '1100', name: 'Cash' });
    expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 50 });
    expect(mockAccountLedger).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({
        accountId: validAccountId,
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      }),
    );
  });

  it('returns 400 when accountId is missing', async () => {
    const res = await request(app())
      .get('/account-ledger?dateFrom=2025-01-01&dateTo=2025-12-31')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(mockAccountLedger).not.toHaveBeenCalled();
  });

  it('returns 400 when date format is invalid', async () => {
    const res = await request(app())
      .get(`/account-ledger?accountId=${validAccountId}&dateFrom=01-01-2025&dateTo=2025-12-31`)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(mockAccountLedger).not.toHaveBeenCalled();
  });

  it('passes pagination params correctly', async () => {
    mockAccountLedger.mockResolvedValue({
      ...sampleAccountLedger,
      pagination: { page: 3, limit: 25, total: 100, totalPages: 4, hasNext: true, hasPrev: true },
    });

    await request(app())
      .get(`/account-ledger?accountId=${validAccountId}&dateFrom=2025-01-01&dateTo=2025-12-31&page=3&limit=25`)
      .expect(200);

    expect(mockAccountLedger).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ page: 3, limit: 25 }),
    );
  });

  it('response has correct shape with success and data fields', async () => {
    mockAccountLedger.mockResolvedValue(sampleAccountLedger);

    const res = await request(app())
      .get(`/account-ledger?accountId=${validAccountId}&dateFrom=2025-01-01&dateTo=2025-12-31`)
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('account');
    expect(res.body.data).toHaveProperty('entries');
    expect(res.body.data).toHaveProperty('pagination');
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app({ authenticated: false }))
      .get(`/account-ledger?accountId=${validAccountId}&dateFrom=2025-01-01&dateTo=2025-12-31`)
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
    expect(mockAccountLedger).not.toHaveBeenCalled();
  });
});
