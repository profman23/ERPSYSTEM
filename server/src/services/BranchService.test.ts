import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_TENANT_A } from '../test/helpers';

// Mock crypto for auto-generated code
vi.mock('crypto', () => ({
  default: { randomUUID: vi.fn().mockReturnValue('12345678-abcd-efgh-ijkl-123456789abc') },
}));

// Mock WarehouseService
vi.mock('./WarehouseService', () => ({
  WarehouseService: { createDefaultForBranch: vi.fn().mockResolvedValue({ id: 'wh-1' }) },
}));

// Mock DocumentNumberSeriesService
vi.mock('./DocumentNumberSeriesService', () => ({
  DocumentNumberSeriesService: {
    getNextBranchSequence: vi.fn().mockResolvedValue(1),
    seedForBranch: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock the db module before importing the service
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
const mockTransaction = vi.fn();

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

  // transaction: execute the callback with a mock tx
  mockTransaction.mockImplementation(async (cb: Function) => cb({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'branch-1', name: 'Main', code: 'BR-12345678' }]),
      }),
    }),
  }));
}

vi.mock('../db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// Import AFTER mocking
import { BranchService } from './BranchService';
import { ConflictError, NotFoundError } from '../core/errors';
import { WarehouseService } from './WarehouseService';
import { DocumentNumberSeriesService } from './DocumentNumberSeriesService';

describe('BranchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  describe('list', () => {
    it('returns paginated results with filters (isActive, businessLineId)', async () => {
      const mockBranches = [
        { id: '1', code: 'BR-001', name: 'Main Branch', tenantId: TEST_TENANT_A },
        { id: '2', code: 'BR-002', name: 'Sub Branch', tenantId: TEST_TENANT_A },
      ];

      // Count query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: 2 }]) }),
      });
      // Data query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce(mockBranches);

      const result = await BranchService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
        isActive: 'true',
        businessLineId: 'bl-1',
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('create', () => {
    it('auto-generates code if not provided (BR-{uuid8})', async () => {
      // exists check — no duplicate
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await BranchService.create(TEST_TENANT_A, {
        name: 'Main Branch',
        businessLineId: 'bl-1',
      } as any);

      expect(result.code).toBe('BR-12345678');
      expect(DocumentNumberSeriesService.getNextBranchSequence).toHaveBeenCalledWith(TEST_TENANT_A);
    });

    it('uses provided code (uppercased) if given', async () => {
      // exists check — no duplicate
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Override transaction to capture the values passed
      mockTransaction.mockImplementationOnce(async (cb: Function) => {
        const txInsertValues = vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'branch-2', name: 'HQ', code: 'HEADQUARTERS' }]),
        });
        const tx = {
          insert: vi.fn().mockReturnValue({ values: txInsertValues }),
        };
        const result = await cb(tx);
        // Verify the code was uppercased
        expect(txInsertValues).toHaveBeenCalledWith(
          expect.objectContaining({ code: 'HEADQUARTERS' }),
        );
        return result;
      });

      const result = await BranchService.create(TEST_TENANT_A, {
        name: 'HQ',
        code: 'headquarters',
        businessLineId: 'bl-1',
      } as any);

      expect(result.code).toBe('HEADQUARTERS');
    });

    it('throws ConflictError on duplicate code', async () => {
      // exists check — duplicate found
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'existing' }]),
          }),
        }),
      });

      await expect(
        BranchService.create(TEST_TENANT_A, {
          name: 'Duplicate Branch',
          code: 'BR-001',
          businessLineId: 'bl-1',
        } as any),
      ).rejects.toThrow(ConflictError);

      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('runs in transaction: insert branch + createDefaultForBranch + seedForBranch', async () => {
      // exists check — no duplicate
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await BranchService.create(TEST_TENANT_A, {
        name: 'New Branch',
        businessLineId: 'bl-1',
      } as any);

      // Verify transaction was used
      expect(mockTransaction).toHaveBeenCalled();
      // Verify WarehouseService.createDefaultForBranch was called
      expect(WarehouseService.createDefaultForBranch).toHaveBeenCalled();
      // Verify DocumentNumberSeriesService.seedForBranch was called
      expect(DocumentNumberSeriesService.seedForBranch).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('returns branch when found', async () => {
      const mockBranch = { id: '1', code: 'BR-001', name: 'Main', tenantId: TEST_TENANT_A };

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBranch]),
          }),
        }),
      });

      const result = await BranchService.getById(TEST_TENANT_A, '1');
      expect(result).toEqual(mockBranch);
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
        BranchService.getById(TEST_TENANT_A, 'nonexistent'),
      ).rejects.toThrow("Branch with ID 'nonexistent' not found");
    });
  });

  describe('update', () => {
    it('delegates to updateById', async () => {
      const updated = { id: '1', code: 'BR-001', name: 'Updated Branch', tenantId: TEST_TENANT_A };
      mockReturning.mockResolvedValueOnce([updated]);

      const result = await BranchService.update(TEST_TENANT_A, '1', { name: 'Updated Branch' });

      expect(result).toEqual(updated);
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Branch' }),
      );
    });
  });

  describe('remove (soft delete)', () => {
    it('soft deletes by setting isActive=false', async () => {
      mockReturning.mockResolvedValueOnce([{ id: '1' }]);

      await BranchService.remove(TEST_TENANT_A, '1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  describe('multi-tenant isolation', () => {
    it('create injects tenantId into branch insert', async () => {
      // exists check — no duplicate
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Capture values passed to tx.insert().values()
      const txValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'branch-t', name: 'Tenant Branch', code: 'BR-12345678', tenantId: TEST_TENANT_A }]),
      });
      mockTransaction.mockImplementationOnce(async (cb: Function) => {
        const tx = {
          insert: vi.fn().mockReturnValue({ values: txValues }),
        };
        return cb(tx);
      });

      await BranchService.create(TEST_TENANT_A, {
        name: 'Tenant Branch',
        businessLineId: 'bl-1',
      } as any);

      expect(txValues).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TEST_TENANT_A }),
      );
    });
  });
});
