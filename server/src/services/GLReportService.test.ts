import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_TENANT_A } from '../test/helpers';

// Mock chain functions
const mockOrderBy = vi.fn();
const mockGroupBy = vi.fn();
const mockWhere = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInnerJoin = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();

function setupChain() {
  // Default chain: select() → from() → innerJoin() → where() → groupBy/orderBy → ...
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ innerJoin: mockInnerJoin });
  mockInnerJoin.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({
    groupBy: mockGroupBy,
    orderBy: mockOrderBy,
    limit: mockLimit,
  });
  mockGroupBy.mockReturnValue({ orderBy: mockOrderBy });
  mockOrderBy.mockReturnValue({ limit: mockLimit });
  mockLimit.mockReturnValue({ offset: mockOffset });
  mockOffset.mockResolvedValue([]);
}

vi.mock('../db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

// Import AFTER mocking
import { GLReportService } from './GLReportService';

describe('GLReportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  // ─── Trial Balance ──────────────────────────────────────────────────────────

  describe('trialBalance', () => {
    const defaultParams = {
      fiscalYear: 2025,
      periodFrom: 1,
      periodTo: 12,
    };

    it('returns accounts with debit/credit totals', async () => {
      const mockRows = [
        {
          accountId: 'acc-1',
          code: '1100',
          name: 'Cash',
          nameAr: null,
          accountType: 'ASSET',
          normalBalance: 'DEBIT',
          totalDebit: '5000.0000',
          totalCredit: '2000.0000',
          netBalance: '3000.0000',
        },
        {
          accountId: 'acc-2',
          code: '2100',
          name: 'Accounts Payable',
          nameAr: null,
          accountType: 'LIABILITY',
          normalBalance: 'CREDIT',
          totalDebit: '1000.0000',
          totalCredit: '4000.0000',
          netBalance: '-3000.0000',
        },
      ];

      mockOrderBy.mockResolvedValueOnce(mockRows);

      const result = await GLReportService.trialBalance(TEST_TENANT_A, defaultParams);

      expect(result.accounts).toHaveLength(2);
      expect(result.accounts[0].code).toBe('1100');
      expect(result.accounts[0].totalDebit).toBe('5000.0000');
      expect(result.accounts[1].totalCredit).toBe('4000.0000');
    });

    it('returns empty accounts array when no balances', async () => {
      mockOrderBy.mockResolvedValueOnce([]);

      const result = await GLReportService.trialBalance(TEST_TENANT_A, defaultParams);

      expect(result.accounts).toEqual([]);
      expect(result.totals.totalDebit).toBe('0.0000');
      expect(result.totals.totalCredit).toBe('0.0000');
    });

    it('calculates grand totals correctly', async () => {
      const mockRows = [
        { accountId: 'a1', code: '1100', name: 'Cash', nameAr: null, accountType: 'ASSET', normalBalance: 'DEBIT', totalDebit: '3000.5000', totalCredit: '1000.2500', netBalance: '2000.2500' },
        { accountId: 'a2', code: '1200', name: 'Bank', nameAr: null, accountType: 'ASSET', normalBalance: 'DEBIT', totalDebit: '2000.0000', totalCredit: '500.7500', netBalance: '1499.2500' },
      ];

      mockOrderBy.mockResolvedValueOnce(mockRows);

      const result = await GLReportService.trialBalance(TEST_TENANT_A, defaultParams);

      expect(result.totals.totalDebit).toBe('5000.5000');
      expect(result.totals.totalCredit).toBe('1501.0000');
    });

    it('passes branchId filter when provided', async () => {
      mockOrderBy.mockResolvedValueOnce([]);

      await GLReportService.trialBalance(TEST_TENANT_A, {
        ...defaultParams,
        branchId: 'branch-1',
      });

      // select was called (query was built)
      expect(mockSelect).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });

    it('returns correct metadata', async () => {
      mockOrderBy.mockResolvedValueOnce([]);

      const result = await GLReportService.trialBalance(TEST_TENANT_A, {
        fiscalYear: 2025,
        periodFrom: 3,
        periodTo: 6,
      });

      expect(result.fiscalYear).toBe(2025);
      expect(result.periodFrom).toBe(3);
      expect(result.periodTo).toBe(6);
      expect(result.branchId).toBeNull();
    });
  });

  // ─── Account Ledger ─────────────────────────────────────────────────────────

  describe('accountLedger', () => {
    const defaultParams = {
      accountId: 'acc-1',
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
      page: 1,
      limit: 20,
    };

    const mockAccountInfo = {
      id: 'acc-1',
      code: '1100',
      name: 'Cash',
      nameAr: null,
      accountType: 'ASSET',
      normalBalance: 'DEBIT',
    };

    /**
     * Helper to set up mock chain for accountLedger.
     * The method issues 3 queries on page 1 (count, data, accountInfo)
     * and 4 queries on page > 1 (count, data, priorSum, accountInfo).
     */
    function setupLedgerMocks(opts: {
      countTotal: number;
      rows: Record<string, unknown>[];
      accountInfo?: Record<string, unknown> | null;
      priorSums?: { priorDebit: string; priorCredit: string } | null;
    }) {
      const callResults: Array<unknown> = [];

      // Call 1: COUNT query → select().from().innerJoin().where()
      // Returns [{ total: N }]
      const countChain = {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: opts.countTotal }]),
          }),
        }),
      };
      callResults.push(countChain);

      // Call 2: DATA query → select().from().innerJoin().where().orderBy().limit().offset()
      const dataOffset = vi.fn().mockResolvedValue(opts.rows);
      const dataLimit = vi.fn().mockReturnValue({ offset: dataOffset });
      const dataOrderBy = vi.fn().mockReturnValue({ limit: dataLimit });
      const dataChain = {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: dataOrderBy,
            }),
          }),
        }),
      };
      callResults.push(dataChain);

      // Call 3 (only if page > 1): PRIOR SUM query
      if (opts.priorSums) {
        const priorLimit = vi.fn().mockResolvedValue([opts.priorSums]);
        const priorOrderBy = vi.fn().mockReturnValue({ limit: priorLimit });
        const priorChain = {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: priorOrderBy,
              }),
            }),
          }),
        };
        callResults.push(priorChain);
      }

      // Call 3 or 4: ACCOUNT INFO query → select().from().where().limit()
      const acctInfo = opts.accountInfo !== undefined ? opts.accountInfo : mockAccountInfo;
      const acctLimit = vi.fn().mockResolvedValue(acctInfo ? [acctInfo] : []);
      const acctChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: acctLimit,
          }),
        }),
      };
      callResults.push(acctChain);

      // Override mockSelect to return each chain in sequence
      for (let i = 0; i < callResults.length; i++) {
        mockSelect.mockReturnValueOnce(callResults[i]);
      }
    }

    it('returns entries with running balance', async () => {
      const rows = [
        { date: '2025-01-15', jeCode: '10000001', jeId: 'je-1', sourceType: 'MANUAL', remarks: 'Opening', lineRemarks: null, debit: '5000.0000', credit: '0.0000' },
        { date: '2025-02-01', jeCode: '10000002', jeId: 'je-2', sourceType: 'MANUAL', remarks: 'Payment', lineRemarks: null, debit: '0.0000', credit: '2000.0000' },
      ];

      setupLedgerMocks({ countTotal: 2, rows });

      const result = await GLReportService.accountLedger(TEST_TENANT_A, defaultParams);

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].runningBalance).toBe('5000.0000');
      expect(result.entries[1].runningBalance).toBe('3000.0000');
    });

    it('returns empty entries for no data', async () => {
      setupLedgerMocks({ countTotal: 0, rows: [] });

      const result = await GLReportService.accountLedger(TEST_TENANT_A, defaultParams);

      expect(result.entries).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('pagination metadata is correct', async () => {
      const rows = [
        { date: '2025-01-15', jeCode: '10000001', jeId: 'je-1', sourceType: 'MANUAL', remarks: null, lineRemarks: null, debit: '1000.0000', credit: '0.0000' },
      ];

      setupLedgerMocks({ countTotal: 45, rows });

      const result = await GLReportService.accountLedger(TEST_TENANT_A, {
        ...defaultParams,
        page: 1,
        limit: 20,
      });

      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 45,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('returns account info header', async () => {
      setupLedgerMocks({ countTotal: 0, rows: [] });

      const result = await GLReportService.accountLedger(TEST_TENANT_A, defaultParams);

      expect(result.account).toEqual(mockAccountInfo);
      expect(result.account?.code).toBe('1100');
      expect(result.account?.accountType).toBe('ASSET');
    });

    it('handles page > 1 with prior balance calculation', async () => {
      const rows = [
        { date: '2025-03-01', jeCode: '10000021', jeId: 'je-21', sourceType: 'MANUAL', remarks: null, lineRemarks: null, debit: '1000.0000', credit: '0.0000' },
      ];

      setupLedgerMocks({
        countTotal: 25,
        rows,
        priorSums: { priorDebit: '8000.0000', priorCredit: '3000.0000' },
      });

      const result = await GLReportService.accountLedger(TEST_TENANT_A, {
        ...defaultParams,
        page: 2,
        limit: 20,
      });

      // Opening balance = 8000 - 3000 = 5000, then +1000 debit
      expect(result.entries[0].runningBalance).toBe('6000.0000');
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.hasPrev).toBe(true);
    });
  });
});
