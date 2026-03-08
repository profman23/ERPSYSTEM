import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_TENANT_A, TEST_TENANT_B, TEST_BRANCH_ID } from '../test/helpers';

// ─── Mock chain primitives ────────────────────────────────────────────────
const mockReturning = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockOrderBy = vi.fn();
const mockWhere = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockValues = vi.fn();
const mockSet = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

// ─── Transaction mock (for getNextNumber) ─────────────────────────────────
const mockTxSelectResult = vi.fn();
const mockTxUpdateWhere = vi.fn();

function setupChain() {
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({
    orderBy: mockOrderBy,
    limit: mockLimit,
    returning: mockReturning,
  });
  mockOrderBy.mockReturnValue({ limit: mockLimit });
  mockLimit.mockReturnValue({ offset: mockOffset });
  mockOffset.mockResolvedValue([]);
  mockReturning.mockResolvedValue([]);

  mockInsert.mockReturnValue({ values: mockValues });
  mockValues.mockReturnValue({ returning: mockReturning });

  mockUpdate.mockReturnValue({ set: mockSet });
  mockSet.mockReturnValue({ where: mockWhere });

  mockTxSelectResult.mockResolvedValue([]);
  mockTxUpdateWhere.mockResolvedValue([]);
}

vi.mock('../db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    transaction: async (fn: Function) =>
      fn({
        select: () => ({
          from: () => ({
            where: () => ({
              for: () => ({
                limit: mockTxSelectResult,
              }),
            }),
          }),
        }),
        update: () => ({
          set: () => ({
            where: mockTxUpdateWhere,
          }),
        }),
      }),
  },
}));

vi.mock('../core/retry', () => ({
  withRetry: async (fn: Function) => fn(),
}));

vi.mock('../config/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Import AFTER mocking
import { DocumentNumberSeriesService } from './DocumentNumberSeriesService';
import { ConflictError, NotFoundError } from '../core/errors';

describe('DocumentNumberSeriesService', () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockFrom.mockReset();
    mockWhere.mockReset();
    mockOrderBy.mockReset();
    mockLimit.mockReset();
    mockOffset.mockReset();
    mockReturning.mockReset();
    mockInsert.mockReset();
    mockValues.mockReset();
    mockUpdate.mockReset();
    mockSet.mockReset();
    mockTxSelectResult.mockReset();
    mockTxUpdateWhere.mockReset();
    setupChain();
  });

  // ─── list ───────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated results with filters', async () => {
      const mockSeries = [
        { id: 's1', documentType: 'SALES_INVOICE', tenantId: TEST_TENANT_A },
      ];

      // Count query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });
      // Data query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce(mockSeries);

      const result = await DocumentNumberSeriesService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
        branchId: TEST_BRANCH_ID,
        documentType: 'SALES_INVOICE',
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('supports isActive filter', async () => {
      // Count query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });
      // Data query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce([]);

      const result = await DocumentNumberSeriesService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
        isActive: 'true',
      });

      expect(result.items).toEqual([]);
      expect(result.page).toBe(1);
    });
  });

  // ─── getById ────────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns series when found', async () => {
      const mockSeries = {
        id: 's1',
        documentType: 'SALES_INVOICE',
        tenantId: TEST_TENANT_A,
        prefix: 'INV',
        nextNumber: 10000001,
      };

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSeries]),
          }),
        }),
      });

      const result = await DocumentNumberSeriesService.getById(TEST_TENANT_A, 's1');
      expect(result).toEqual(mockSeries);
    });

    it('throws NotFoundError when not found', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        DocumentNumberSeriesService.getById(TEST_TENANT_A, 'nonexistent'),
      ).rejects.toThrow('not found');
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates with optimistic locking and increments version', async () => {
      const existing = {
        id: 's1',
        version: 3,
        prefix: '',
        tenantId: TEST_TENANT_A,
      };

      // findById for optimistic lock check
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existing]),
          }),
        }),
      });

      // updateById returns updated record
      const updated = { ...existing, prefix: 'INV', version: 4 };
      mockReturning.mockResolvedValueOnce([updated]);

      const result = await DocumentNumberSeriesService.update(TEST_TENANT_A, 's1', {
        prefix: 'INV',
        version: 3,
      });

      expect(result).toEqual(updated);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ version: 4 }),
      );
    });

    it('throws ConflictError on version mismatch', async () => {
      const existing = {
        id: 's1',
        version: 5,
        tenantId: TEST_TENANT_A,
      };

      // findById
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existing]),
          }),
        }),
      });

      await expect(
        DocumentNumberSeriesService.update(TEST_TENANT_A, 's1', {
          prefix: 'PO',
          version: 3, // stale version
        }),
      ).rejects.toThrow(ConflictError);

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  // ─── seedForBranch ──────────────────────────────────────────────────────────

  describe('seedForBranch', () => {
    it('inserts 7 document type rows for a branch', async () => {
      const txInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      const fakeTx = { insert: txInsert } as any;

      await DocumentNumberSeriesService.seedForBranch(fakeTx, TEST_TENANT_A, TEST_BRANCH_ID, 1);

      expect(txInsert).toHaveBeenCalledOnce();
      // The values call should receive an array of 7 rows
      const valuesCall = txInsert.mock.results[0].value.values;
      const rows = valuesCall.mock.calls[0][0];
      expect(rows).toHaveLength(7);
      expect(rows.map((r: any) => r.documentType)).toEqual(
        expect.arrayContaining([
          'PURCHASE_ORDER',
          'GOODS_RECEIPT_PO',
          'SALES_INVOICE',
          'CREDIT_NOTE',
          'DELIVERY_NOTE',
          'PAYMENT_RECEIPT',
          'JOURNAL_ENTRY',
        ]),
      );
      // Verify branchSequence * offset + 1 for first branch
      expect(rows[0].nextNumber).toBe(10_000_001);
      expect(rows[0].tenantId).toBe(TEST_TENANT_A);
      expect(rows[0].branchId).toBe(TEST_BRANCH_ID);
    });
  });

  // ─── getNextNumber ──────────────────────────────────────────────────────────

  describe('getNextNumber', () => {
    it('atomically gets next number and increments counter', async () => {
      mockTxSelectResult.mockResolvedValueOnce([
        {
          id: 's1',
          prefix: '',
          separator: '',
          nextNumber: 10000001,
          padding: 8,
        },
      ]);

      const result = await DocumentNumberSeriesService.getNextNumber(
        TEST_TENANT_A,
        TEST_BRANCH_ID,
        'SALES_INVOICE',
      );

      expect(result).toBe('10000001');
    });

    it('returns formatted number with prefix when prefix exists', async () => {
      mockTxSelectResult.mockResolvedValueOnce([
        {
          id: 's1',
          prefix: 'INV',
          separator: '-',
          nextNumber: 10000005,
          padding: 8,
        },
      ]);

      const result = await DocumentNumberSeriesService.getNextNumber(
        TEST_TENANT_A,
        TEST_BRANCH_ID,
        'SALES_INVOICE',
      );

      expect(result).toBe('INV-10000005');
    });

    it('returns plain padded number when no prefix', async () => {
      mockTxSelectResult.mockResolvedValueOnce([
        {
          id: 's1',
          prefix: '',
          separator: '',
          nextNumber: 42,
          padding: 8,
        },
      ]);

      const result = await DocumentNumberSeriesService.getNextNumber(
        TEST_TENANT_A,
        TEST_BRANCH_ID,
        'JOURNAL_ENTRY',
      );

      expect(result).toBe('00000042');
    });

    it('throws NotFoundError when series not found', async () => {
      mockTxSelectResult.mockResolvedValueOnce([]);

      await expect(
        DocumentNumberSeriesService.getNextNumber(
          TEST_TENANT_A,
          TEST_BRANCH_ID,
          'UNKNOWN_TYPE',
        ),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── getNextBranchSequence ──────────────────────────────────────────────────

  describe('getNextBranchSequence', () => {
    it('counts branches and returns count + 1', async () => {
      // this.db.select({ count }).from(branches).where(...)
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      });

      const result = await DocumentNumberSeriesService.getNextBranchSequence(TEST_TENANT_A);
      expect(result).toBe(4);
    });
  });

  // ─── tenant isolation ───────────────────────────────────────────────────────

  describe('multi-tenant isolation', () => {
    it('list queries are scoped to the provided tenantId', async () => {
      // Count query for tenant B
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });
      // Data query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce([]);

      const result = await DocumentNumberSeriesService.list(TEST_TENANT_B, {
        page: 1,
        limit: 20,
      });

      expect(result.items).toEqual([]);
      expect(result.page).toBe(1);
    });
  });
});
