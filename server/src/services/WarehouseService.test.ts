import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_TENANT_A, TEST_BRANCH_ID } from '../test/helpers';

// ─── Mock chain (module-level db used by BaseService + findAccountByCode) ────
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

// Transaction-internal chain
const mockTxReturning = vi.fn();
const mockTxWhere = vi.fn();
const mockTxSet = vi.fn();
const mockTxValues = vi.fn();
const mockTxInsert = vi.fn();
const mockTxUpdate = vi.fn();

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

  // Transaction chain
  mockTxUpdate.mockReturnValue({ set: mockTxSet });
  mockTxSet.mockReturnValue({ where: mockTxWhere });
  mockTxWhere.mockReturnValue({ returning: mockTxReturning });
  mockTxReturning.mockResolvedValue([]);

  mockTxInsert.mockReturnValue({ values: mockTxValues });
  mockTxValues.mockReturnValue({ returning: mockTxReturning });
}

vi.mock('../db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    transaction: async (fn: Function) =>
      fn({
        update: (...args: unknown[]) => mockTxUpdate(...args),
        insert: (...args: unknown[]) => mockTxInsert(...args),
        select: (...args: unknown[]) => mockSelect(...args),
      }),
  },
}));

// Import AFTER mocking
import { WarehouseService } from './WarehouseService';
import { ConflictError, NotFoundError } from '../core/errors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BRANCH_ID = TEST_BRANCH_ID;
const ACCOUNT_ID = '00000000-0000-0000-0000-000000000999';

function mockWarehouse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wh-1',
    tenantId: TEST_TENANT_A,
    branchId: BRANCH_ID,
    code: 'WH-MAIN',
    name: 'Main Warehouse',
    warehouseType: 'STANDARD',
    isDefault: false,
    isActive: true,
    ...overrides,
  };
}

/** Mock the `exists` check (select().from().where().limit()) to return found or empty */
function mockExistsCall(found: boolean) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(found ? [{ id: 'existing' }] : []),
      }),
    }),
  });
}

/** Mock findById / findByIdOrNull (select().from().where().limit()) */
function mockFindByIdCall(record: Record<string, unknown> | null) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(record ? [record] : []),
      }),
    }),
  });
}

/** Mock count query (select({count}).from().where()) → [{ count: n }] */
function mockCountCall(n: number) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: n }]),
    }),
  });
}

/** Mock findAccountByCode — db.select().from().where().limit() returning account or empty */
function mockFindAccountByCode(accountId: string | null) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(accountId ? [{ id: accountId }] : []),
      }),
    }),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('WarehouseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  // ── list ─────────────────────────────────────────────────────────────────
  describe('list', () => {
    it('returns paginated results with filters', async () => {
      const items = [mockWarehouse(), mockWarehouse({ id: 'wh-2', code: 'WH-SEC' })];

      // count query
      mockCountCall(2);
      // data query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce(items);

      const result = await WarehouseService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
        isActive: 'true',
        branchId: BRANCH_ID,
        warehouseType: 'STANDARD',
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(2);
      expect(result.items).toEqual(items);
    });
  });

  // ── listByBranch ─────────────────────────────────────────────────────────
  describe('listByBranch', () => {
    it('filters by branchId', async () => {
      const items = [mockWarehouse()];

      mockCountCall(1);
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce(items);

      const result = await WarehouseService.listByBranch(TEST_TENANT_A, BRANCH_ID);

      expect(result.items).toEqual(items);
      expect(result.total).toBe(1);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────
  describe('create', () => {
    it('creates warehouse when code is unique', async () => {
      const newWh = mockWarehouse({ id: 'wh-new' });

      // exists check — no duplicate
      mockExistsCall(false);
      // 5 findAccountByCode calls (auto-assign GL accounts)
      for (let i = 0; i < 5; i++) mockFindAccountByCode(ACCOUNT_ID);
      // insertOne returns new record
      mockReturning.mockResolvedValueOnce([newWh]);

      const result = await WarehouseService.create(TEST_TENANT_A, {
        code: 'WH-MAIN',
        name: 'Main Warehouse',
        branchId: BRANCH_ID,
        warehouseType: 'STANDARD',
        isDefault: false,
      });

      expect(result).toEqual(newWh);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('throws ConflictError on duplicate code', async () => {
      mockExistsCall(true);

      await expect(
        WarehouseService.create(TEST_TENANT_A, {
          code: 'WH-MAIN',
          name: 'Main Warehouse',
          branchId: BRANCH_ID,
          warehouseType: 'STANDARD',
          isDefault: false,
        }),
      ).rejects.toThrow(ConflictError);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('auto-assigns GL accounts via findAccountByCode when not provided', async () => {
      const newWh = mockWarehouse({ id: 'wh-gl' });

      mockExistsCall(false);
      // 5 findAccountByCode calls
      for (let i = 0; i < 5; i++) mockFindAccountByCode(ACCOUNT_ID);
      mockReturning.mockResolvedValueOnce([newWh]);

      await WarehouseService.create(TEST_TENANT_A, {
        code: 'WH-GL',
        name: 'GL Warehouse',
        branchId: BRANCH_ID,
        warehouseType: 'STANDARD',
        isDefault: false,
      });

      // 1 exists + 5 findAccountByCode = 6 select calls
      expect(mockSelect).toHaveBeenCalledTimes(6);
    });

    it('uses transaction to toggle off other defaults when isDefault=true', async () => {
      const newWh = mockWarehouse({ id: 'wh-def', isDefault: true });

      mockExistsCall(false);
      for (let i = 0; i < 5; i++) mockFindAccountByCode(ACCOUNT_ID);
      // transaction: tx.update (toggle, no .returning()) + tx.insert (create, uses .returning())
      mockTxReturning.mockResolvedValueOnce([newWh]); // insert returning

      const result = await WarehouseService.create(TEST_TENANT_A, {
        code: 'WH-DEF',
        name: 'Default Warehouse',
        branchId: BRANCH_ID,
        warehouseType: 'STANDARD',
        isDefault: true,
      });

      expect(result).toEqual(newWh);
      expect(mockTxUpdate).toHaveBeenCalled();
      expect(mockTxInsert).toHaveBeenCalled();
      // Should NOT use non-tx insert
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('uses simple insertOne when isDefault=false', async () => {
      const newWh = mockWarehouse({ id: 'wh-nodef' });

      mockExistsCall(false);
      for (let i = 0; i < 5; i++) mockFindAccountByCode(ACCOUNT_ID);
      mockReturning.mockResolvedValueOnce([newWh]);

      await WarehouseService.create(TEST_TENANT_A, {
        code: 'WH-NODEF',
        name: 'Non-Default Warehouse',
        branchId: BRANCH_ID,
        warehouseType: 'STANDARD',
        isDefault: false,
      });

      // Uses non-tx insert
      expect(mockInsert).toHaveBeenCalled();
      expect(mockTxInsert).not.toHaveBeenCalled();
    });
  });

  // ── getById ──────────────────────────────────────────────────────────────
  describe('getById', () => {
    it('returns warehouse when found', async () => {
      const wh = mockWarehouse();
      mockFindByIdCall(wh);

      const result = await WarehouseService.getById(TEST_TENANT_A, 'wh-1');
      expect(result).toEqual(wh);
    });

    it('throws NotFoundError when not found', async () => {
      mockFindByIdCall(null);

      await expect(
        WarehouseService.getById(TEST_TENANT_A, 'nonexistent'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────
  describe('update', () => {
    it('checks code uniqueness when code changes', async () => {
      const existing = mockWarehouse({ code: 'WH-OLD' });
      const updated = mockWarehouse({ code: 'WH-NEW' });

      // findByIdOrNull for code check
      mockFindByIdCall(existing);
      // exists check — no duplicate
      mockExistsCall(false);
      // updateById returns updated record
      mockReturning.mockResolvedValueOnce([updated]);

      const result = await WarehouseService.update(TEST_TENANT_A, 'wh-1', {
        code: 'WH-NEW',
      });

      expect(result).toEqual(updated);
    });

    it('throws ConflictError on duplicate code', async () => {
      const existing = mockWarehouse({ code: 'WH-OLD' });

      // findByIdOrNull
      mockFindByIdCall(existing);
      // exists check — duplicate found
      mockExistsCall(true);

      await expect(
        WarehouseService.update(TEST_TENANT_A, 'wh-1', { code: 'WH-DUPE' }),
      ).rejects.toThrow(ConflictError);
    });

    it('uses transaction to toggle off other defaults when isDefault=true', async () => {
      const existing = mockWarehouse({ isDefault: false });
      const updated = mockWarehouse({ isDefault: true });

      // findById for isDefault branch
      mockFindByIdCall(existing);
      // tx.update (toggle, no .returning()) + tx.update (actual, uses .returning())
      mockTxReturning.mockResolvedValueOnce([updated]); // actual update returning

      const result = await WarehouseService.update(TEST_TENANT_A, 'wh-1', {
        isDefault: true,
      });

      expect(result).toEqual(updated);
      expect(mockTxUpdate).toHaveBeenCalled();
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('soft deletes non-default warehouse', async () => {
      const wh = mockWarehouse({ isDefault: false });

      // findById
      mockFindByIdCall(wh);
      // softDelete: update().set().where().returning()
      mockReturning.mockResolvedValueOnce([{ id: 'wh-1' }]);

      await WarehouseService.remove(TEST_TENANT_A, 'wh-1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('throws ConflictError when deleting default warehouse with others', async () => {
      const wh = mockWarehouse({ isDefault: true });

      // findById
      mockFindByIdCall(wh);
      // count returns > 1 (other warehouses exist)
      mockCountCall(3);

      await expect(
        WarehouseService.remove(TEST_TENANT_A, 'wh-1'),
      ).rejects.toThrow('Cannot delete the default warehouse');
    });

    it('throws ConflictError when deleting the only warehouse', async () => {
      const wh = mockWarehouse({ isDefault: true });

      // findById
      mockFindByIdCall(wh);
      // count returns 1 (only warehouse)
      mockCountCall(1);

      await expect(
        WarehouseService.remove(TEST_TENANT_A, 'wh-1'),
      ).rejects.toThrow('Cannot delete the only warehouse');
    });
  });

  // ── toggleStatus ─────────────────────────────────────────────────────────
  describe('toggleStatus', () => {
    it('flips isActive status', async () => {
      const wh = mockWarehouse({ isActive: true, isDefault: false });

      // findById
      mockFindByIdCall(wh);
      // updateById returns updated record
      mockReturning.mockResolvedValueOnce([{ ...wh, isActive: false }]);

      const result = await WarehouseService.toggleStatus(TEST_TENANT_A, 'wh-1');

      expect(result).toEqual({ id: 'wh-1', isActive: false });
    });

    it('throws ConflictError when deactivating default warehouse', async () => {
      const wh = mockWarehouse({ isDefault: true, isActive: true });

      // findById
      mockFindByIdCall(wh);

      await expect(
        WarehouseService.toggleStatus(TEST_TENANT_A, 'wh-1'),
      ).rejects.toThrow('Cannot deactivate the default warehouse');
    });
  });
});
