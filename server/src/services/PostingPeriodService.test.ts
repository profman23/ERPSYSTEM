import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_TENANT_A, TEST_TENANT_B } from '../test/helpers';

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

// ─── Transaction mock ─────────────────────────────────────────────────────
const mockTxInsertValues = vi.fn();
const mockTxInsertReturning = vi.fn();

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

  mockTxInsertValues.mockReturnValue({ returning: mockTxInsertReturning });
  mockTxInsertReturning.mockResolvedValue([]);
}

vi.mock('../db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    transaction: async (fn: Function) =>
      fn({
        insert: () => ({
          values: mockTxInsertValues,
        }),
      }),
  },
}));

// Import AFTER mocking
import { PostingPeriodService } from './PostingPeriodService';
import { ConflictError, NotFoundError, ValidationError } from '../core/errors';

describe('PostingPeriodService', () => {
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
    mockTxInsertValues.mockReset();
    mockTxInsertReturning.mockReset();
    setupChain();
  });

  // ─── list ───────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated results with filters', async () => {
      const mockPeriods = [
        { id: 'p1', code: 'FY-2026', fiscalYear: 2026, tenantId: TEST_TENANT_A },
      ];

      // Count query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });
      // Data query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce(mockPeriods);

      const result = await PostingPeriodService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
        fiscalYear: 2026,
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

      const result = await PostingPeriodService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
        isActive: 'true',
      });

      expect(result.items).toEqual([]);
    });
  });

  // ─── getById ────────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns posting period when found', async () => {
      const mockPeriod = {
        id: 'p1',
        code: 'FY-2026',
        fiscalYear: 2026,
        tenantId: TEST_TENANT_A,
      };

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockPeriod]),
          }),
        }),
      });

      const result = await PostingPeriodService.getById(TEST_TENANT_A, 'p1');
      expect(result).toEqual(mockPeriod);
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
        PostingPeriodService.getById(TEST_TENANT_A, 'nonexistent'),
      ).rejects.toThrow('not found');
    });
  });

  // ─── getSubPeriods ──────────────────────────────────────────────────────────

  describe('getSubPeriods', () => {
    it('delegates to findMany with postingPeriodId filter', async () => {
      const mockSubPeriods = [
        { id: 'sp1', periodNumber: 1, name: 'January 2026' },
        { id: 'sp2', periodNumber: 2, name: 'February 2026' },
      ];

      // Count query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });
      // Data query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce(mockSubPeriods);

      const result = await PostingPeriodService.getSubPeriods(TEST_TENANT_A, 'p1', {
        page: 1,
        limit: 20,
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates fiscal year with 12 sub-periods in transaction', async () => {
      // exists check — no duplicate
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const createdPeriod = {
        id: 'p1',
        code: 'FY-2026',
        fiscalYear: 2026,
        tenantId: TEST_TENANT_A,
      };

      // 1st tx.insert().values() → header (uses default returning chain)
      // mockTxInsertReturning returns the period
      mockTxInsertReturning.mockResolvedValueOnce([createdPeriod]);
      // 2nd tx.insert().values() → sub-periods (no .returning() call in service)

      const result = await PostingPeriodService.create(TEST_TENANT_A, {
        fiscalYear: 2026,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });

      expect(result).toEqual(createdPeriod);
    });

    it('throws ConflictError on duplicate fiscal year', async () => {
      // exists check — duplicate found
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'existing' }]),
          }),
        }),
      });

      await expect(
        PostingPeriodService.create(TEST_TENANT_A, {
          fiscalYear: 2026,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('transaction inserts header + 12 sub-period rows', async () => {
      // exists check passes
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const createdPeriod = {
        id: 'p1',
        code: 'FY-2026',
        tenantId: TEST_TENANT_A,
      };

      // header insert uses default chain → mockTxInsertReturning
      mockTxInsertReturning.mockResolvedValueOnce([createdPeriod]);
      // sub-periods insert: no .returning() in service code

      await PostingPeriodService.create(TEST_TENANT_A, {
        fiscalYear: 2026,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });

      // txInsertValues called twice: once for header, once for sub-periods
      expect(mockTxInsertValues).toHaveBeenCalledTimes(2);

      // Second call should have 12 sub-period rows
      const subPeriodRows = mockTxInsertValues.mock.calls[1][0];
      expect(subPeriodRows).toHaveLength(12);
      expect(subPeriodRows[0].periodNumber).toBe(1);
      expect(subPeriodRows[11].periodNumber).toBe(12);
      expect(subPeriodRows[0].status).toBe('OPEN');
    });
  });

  // ─── updateSubPeriod ────────────────────────────────────────────────────────

  describe('updateSubPeriod', () => {
    it('updates status with version increment', async () => {
      const existing = {
        id: 'sp1',
        status: 'OPEN',
        version: 1,
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

      // this.db.update().set().where().returning()
      const updated = { ...existing, status: 'CLOSED', version: 2 };
      mockReturning.mockResolvedValueOnce([updated]);

      const result = await PostingPeriodService.updateSubPeriod(TEST_TENANT_A, 'sp1', {
        status: 'CLOSED',
        version: 1,
      });

      expect(result).toEqual(updated);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ version: 2, status: 'CLOSED' }),
      );
    });

    it('throws ValidationError when sub-period is LOCKED', async () => {
      const existing = {
        id: 'sp1',
        status: 'LOCKED',
        version: 3,
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
        PostingPeriodService.updateSubPeriod(TEST_TENANT_A, 'sp1', {
          status: 'OPEN',
          version: 3,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ConflictError on version mismatch', async () => {
      const existing = {
        id: 'sp1',
        status: 'OPEN',
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
        PostingPeriodService.updateSubPeriod(TEST_TENANT_A, 'sp1', {
          status: 'CLOSED',
          version: 2, // stale
        }),
      ).rejects.toThrow(ConflictError);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('updates isActive with version increment', async () => {
      const existing = {
        id: 'sp1',
        status: 'OPEN',
        version: 1,
        isActive: true,
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

      const updated = { ...existing, isActive: false, version: 2 };
      mockReturning.mockResolvedValueOnce([updated]);

      const result = await PostingPeriodService.updateSubPeriod(TEST_TENANT_A, 'sp1', {
        isActive: false,
        version: 1,
      });

      expect(result).toEqual(updated);
    });
  });

  // ─── seedForTenant ──────────────────────────────────────────────────────────

  describe('seedForTenant', () => {
    it('skips if fiscal year already exists', async () => {
      // exists check — found
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'existing' }]),
          }),
        }),
      });

      const result = await PostingPeriodService.seedForTenant(TEST_TENANT_A);
      expect(result).toEqual({ skipped: true });
    });

    it('creates fiscal year if not exists', async () => {
      // exists check for seedForTenant — not found
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // exists check inside create — not found
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const currentYear = new Date().getFullYear();
      const createdPeriod = {
        id: 'p1',
        code: `FY-${currentYear}`,
        tenantId: TEST_TENANT_A,
      };

      // header insert uses default chain → mockTxInsertReturning
      mockTxInsertReturning.mockResolvedValueOnce([createdPeriod]);

      const result = await PostingPeriodService.seedForTenant(TEST_TENANT_A);
      expect(result).toEqual({ skipped: false, year: currentYear, periodsCreated: 12 });
    });
  });

  // ─── tenant isolation ───────────────────────────────────────────────────────

  describe('multi-tenant isolation', () => {
    it('create injects tenantId into fiscal year', async () => {
      // exists check — no duplicate
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const createdPeriod = {
        id: 'p1',
        code: 'FY-2025',
        tenantId: TEST_TENANT_B,
      };

      mockTxInsertReturning.mockResolvedValueOnce([createdPeriod]);

      const result = await PostingPeriodService.create(TEST_TENANT_B, {
        fiscalYear: 2025,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });

      // First call is the header insert — values should include tenantId
      const headerValues = mockTxInsertValues.mock.calls[0][0];
      expect(headerValues.tenantId).toBe(TEST_TENANT_B);
    });
  });
});
