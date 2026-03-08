import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_TENANT_A } from '../test/helpers';

// ─── Mock chain fns ────────────────────────────────────────────────────────
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

// Transaction mocks
const mockTxSelect = vi.fn();
const mockTxInsert = vi.fn();
const mockTxValues = vi.fn();
const mockTxReturning = vi.fn();

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

  // Transaction chains
  mockTxInsert.mockReturnValue({ values: mockTxValues });
  mockTxValues.mockReturnValue({ returning: mockTxReturning });
  mockTxReturning.mockResolvedValue([]);

  mockTxSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  });
}

vi.mock('../db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    transaction: async (fn: Function) =>
      fn({
        select: (...args: unknown[]) => mockTxSelect(...args),
        insert: (...args: unknown[]) => mockTxInsert(...args),
      }),
  },
}));

vi.mock('../core/retry', () => ({
  withRetry: async (fn: Function) => fn(),
}));

// Import AFTER mocking
import { ItemService } from './ItemService';
import { ConflictError, NotFoundError } from '../core/errors';

// ─── Helpers ────────────────────────────────────────────────────────────────

const sampleItem = {
  id: 'item-1',
  tenantId: TEST_TENANT_A,
  code: 'ITM-00001',
  name: 'Test Item',
  barcode: '1234567890',
  itemType: 'INVENTORY',
  isActive: true,
  version: 1,
  imageUrl: '/uploads/items/test.jpg',
};

function mockFindByIdResult(record: Record<string, unknown> | null) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(record ? [record] : []),
      }),
    }),
  });
}

function mockExistsResult(exists: boolean) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(exists ? [{ id: 'existing' }] : []),
      }),
    }),
  });
}

function setupTxCodeGeneration(lastCode: string | null) {
  mockTxSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue(
              lastCode ? [{ code: lastCode }] : [],
            ),
          }),
        }),
      }),
    }),
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ItemService', () => {
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
    mockTxSelect.mockReset();
    mockTxInsert.mockReset();
    mockTxValues.mockReset();
    mockTxReturning.mockReset();
    setupChain();
  });

  // ─── list ─────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated results filterable by itemType, itemGroupId, isActive', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce([sampleItem]);

      const result = await ItemService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
        itemType: 'INVENTORY',
        isActive: 'true',
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // ─── getById ──────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns item when found', async () => {
      mockFindByIdResult(sampleItem);

      const result = await ItemService.getById(TEST_TENANT_A, 'item-1');
      expect(result).toEqual(sampleItem);
    });

    it('throws NotFoundError when not found', async () => {
      mockFindByIdResult(null);

      await expect(
        ItemService.getById(TEST_TENANT_A, 'nonexistent'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const createInput = {
      name: 'New Item',
      itemType: 'INVENTORY' as const,
    };

    it('checks barcode uniqueness when barcode provided', async () => {
      // exists check for barcode — not found
      mockExistsResult(false);
      // tx code gen
      setupTxCodeGeneration(null);
      mockTxReturning.mockResolvedValueOnce([{ ...sampleItem, code: 'ITM-00001' }]);

      const result = await ItemService.create(TEST_TENANT_A, {
        ...createInput,
        barcode: '9999999999',
      });

      expect(result.code).toBe('ITM-00001');
    });

    it('throws ConflictError on duplicate barcode', async () => {
      mockExistsResult(true);

      await expect(
        ItemService.create(TEST_TENANT_A, { ...createInput, barcode: '1234567890' }),
      ).rejects.toThrow(ConflictError);

      expect(mockTxInsert).not.toHaveBeenCalled();
    });

    it('converts numeric fields to strings', async () => {
      setupTxCodeGeneration(null);
      mockTxReturning.mockResolvedValueOnce([sampleItem]);

      await ItemService.create(TEST_TENANT_A, {
        ...createInput,
        purchaseUomFactor: 2,
        standardCost: 10.5,
      });

      expect(mockTxValues).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaseUomFactor: '2',
          standardCost: '10.5',
        }),
      );
    });

    it('auto-generates code ITM-00001 when no items exist', async () => {
      setupTxCodeGeneration(null);
      mockTxReturning.mockResolvedValueOnce([{ ...sampleItem, code: 'ITM-00001' }]);

      const result = await ItemService.create(TEST_TENANT_A, createInput);
      expect(result.code).toBe('ITM-00001');
    });

    it('auto-generates next code ITM-00006 from ITM-00005', async () => {
      setupTxCodeGeneration('ITM-00005');
      mockTxReturning.mockResolvedValueOnce([{ ...sampleItem, code: 'ITM-00006' }]);

      const result = await ItemService.create(TEST_TENANT_A, createInput);

      expect(mockTxValues).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'ITM-00006' }),
      );
    });

    it('uses withRetry for deadlock resilience', async () => {
      // withRetry is mocked to just call the fn, so this test confirms
      // the service doesn't break with withRetry in the chain
      setupTxCodeGeneration(null);
      mockTxReturning.mockResolvedValueOnce([sampleItem]);

      const result = await ItemService.create(TEST_TENANT_A, createInput);
      expect(result).toBeDefined();
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('checks optimistic locking (version match)', async () => {
      mockFindByIdResult(sampleItem);
      // No barcode change, skip barcode check
      // updateById
      mockReturning.mockResolvedValueOnce([{ ...sampleItem, version: 2, name: 'Updated' }]);

      const result = await ItemService.update(TEST_TENANT_A, 'item-1', {
        name: 'Updated',
        version: 1,
      });

      expect(result.version).toBe(2);
    });

    it('throws ConflictError on version mismatch', async () => {
      mockFindByIdResult({ ...sampleItem, version: 3 });

      await expect(
        ItemService.update(TEST_TENANT_A, 'item-1', { name: 'Updated', version: 1 }),
      ).rejects.toThrow(ConflictError);
    });

    it('checks barcode uniqueness on barcode change', async () => {
      mockFindByIdResult({ ...sampleItem, barcode: 'OLD-BARCODE' });
      // barcode exists check — found duplicate
      mockExistsResult(true);

      await expect(
        ItemService.update(TEST_TENANT_A, 'item-1', {
          barcode: 'DUPLICATE-BARCODE',
          version: 1,
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  // ─── remove (soft delete) ─────────────────────────────────────────────────

  describe('remove', () => {
    it('soft deletes by setting isActive=false', async () => {
      mockReturning.mockResolvedValueOnce([{ id: 'item-1' }]);

      await ItemService.remove(TEST_TENANT_A, 'item-1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  // ─── uploadImage ──────────────────────────────────────────────────────────

  describe('uploadImage', () => {
    it('verifies item exists then updates imageUrl', async () => {
      // findById
      mockFindByIdResult(sampleItem);
      // updateById
      mockReturning.mockResolvedValueOnce([{ ...sampleItem, imageUrl: '/uploads/items/new.jpg' }]);

      const result = await ItemService.uploadImage(TEST_TENANT_A, 'item-1', '/uploads/items/new.jpg');

      expect(result.imageUrl).toBe('/uploads/items/new.jpg');
    });
  });

  // ─── removeImage ──────────────────────────────────────────────────────────

  describe('removeImage', () => {
    it('returns old URL and sets imageUrl to null', async () => {
      mockFindByIdResult(sampleItem);
      // updateById
      mockReturning.mockResolvedValueOnce([{ ...sampleItem, imageUrl: null }]);

      const oldUrl = await ItemService.removeImage(TEST_TENANT_A, 'item-1');

      expect(oldUrl).toBe('/uploads/items/test.jpg');
    });
  });
});
