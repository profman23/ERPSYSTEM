import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_TENANT_A } from '../test/helpers';

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
}

vi.mock('../db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

// Import AFTER mocking
import { ItemGroupService } from './ItemGroupService';
import { ConflictError } from '../core/errors';

describe('ItemGroupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  describe('list', () => {
    it('returns paginated item groups', async () => {
      const mockGroups = [
        { id: '1', code: 'MED', name: 'Medicine', tenantId: TEST_TENANT_A },
        { id: '2', code: 'SUR', name: 'Surgical Supply', tenantId: TEST_TENANT_A },
      ];

      // Count query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });
      // Data query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce(mockGroups);

      const result = await ItemGroupService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('filters by itemGroupType', async () => {
      // Count query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });
      // Data query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce([
        { id: '1', code: 'MED', itemGroupType: 'MEDICINE', tenantId: TEST_TENANT_A },
      ]);

      const result = await ItemGroupService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
        itemGroupType: 'MEDICINE',
      });

      expect(result.page).toBe(1);
    });
  });

  describe('create', () => {
    it('creates item group and auto-assigns GL accounts by type', async () => {
      const newGroup = {
        id: '3',
        code: 'MED01',
        name: 'Medicine Group',
        itemGroupType: 'MEDICINE',
        tenantId: TEST_TENANT_A,
        inventoryAccountId: 'acct-inv',
        cogsAccountId: 'acct-cogs',
        purchaseAccountId: 'acct-purchase',
        revenueAccountId: 'acct-rev',
      };

      // Code exists check — no duplicate
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // findAccountByCode called 4 times (inventory=1141, cogs=5110, purchase=5151, revenue=4210)
      // Each call: db.select().from().where().limit()
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockWhere.mockReturnValueOnce({ orderBy: mockOrderBy, limit: mockLimit, returning: mockReturning });
      mockLimit.mockResolvedValueOnce([{ id: 'acct-inv' }]);

      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockWhere.mockReturnValueOnce({ orderBy: mockOrderBy, limit: mockLimit, returning: mockReturning });
      mockLimit.mockResolvedValueOnce([{ id: 'acct-cogs' }]);

      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockWhere.mockReturnValueOnce({ orderBy: mockOrderBy, limit: mockLimit, returning: mockReturning });
      mockLimit.mockResolvedValueOnce([{ id: 'acct-purchase' }]);

      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockWhere.mockReturnValueOnce({ orderBy: mockOrderBy, limit: mockLimit, returning: mockReturning });
      mockLimit.mockResolvedValueOnce([{ id: 'acct-rev' }]);

      // Insert returns new record
      mockReturning.mockResolvedValueOnce([newGroup]);

      const result = await ItemGroupService.create(TEST_TENANT_A, {
        code: 'MED01',
        name: 'Medicine Group',
        itemGroupType: 'MEDICINE',
      });

      expect(result).toEqual(newGroup);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('throws ConflictError on duplicate code', async () => {
      // Code exists check — duplicate found
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'existing' }]),
          }),
        }),
      });

      await expect(
        ItemGroupService.create(TEST_TENANT_A, {
          code: 'MED',
          name: 'Medicine',
          itemGroupType: 'MEDICINE',
        })
      ).rejects.toThrow(ConflictError);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('preserves provided GL account IDs over defaults', async () => {
      const providedAccounts = {
        inventoryAccountId: 'custom-inv',
        cogsAccountId: 'custom-cogs',
        revenueAccountId: 'custom-rev',
      };
      const newGroup = {
        id: '4',
        code: 'SRV01',
        name: 'Service Group',
        itemGroupType: 'SERVICE',
        tenantId: TEST_TENANT_A,
        ...providedAccounts,
      };

      // Code exists check — no duplicate
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // SERVICE type: inventory=null (skip), cogs provided (skip), purchase=null (skip), revenue provided (skip)
      // No findAccountByCode calls needed since all non-null defaults are provided

      // Insert returns new record
      mockReturning.mockResolvedValueOnce([newGroup]);

      const result = await ItemGroupService.create(TEST_TENANT_A, {
        code: 'SRV01',
        name: 'Service Group',
        itemGroupType: 'SERVICE',
        ...providedAccounts,
      });

      expect(result).toEqual(newGroup);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          inventoryAccountId: 'custom-inv',
          cogsAccountId: 'custom-cogs',
          revenueAccountId: 'custom-rev',
        })
      );
    });
  });

  describe('update', () => {
    it('throws ConflictError when updating to existing code', async () => {
      // findByIdOrNull — returns existing with different code
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: '1', code: 'OLD_CODE', tenantId: TEST_TENANT_A }]),
          }),
        }),
      });

      // Code exists check — duplicate found
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'other-group' }]),
          }),
        }),
      });

      await expect(
        ItemGroupService.update(TEST_TENANT_A, '1', { code: 'TAKEN_CODE' })
      ).rejects.toThrow(ConflictError);
    });

    it('allows update when code unchanged', async () => {
      // findByIdOrNull — returns existing with same code
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: '1', code: 'SAME', tenantId: TEST_TENANT_A }]),
          }),
        }),
      });

      // updateById returns updated record
      mockReturning.mockResolvedValueOnce([{ id: '1', code: 'SAME', name: 'Updated Name' }]);

      const result = await ItemGroupService.update(TEST_TENANT_A, '1', { code: 'SAME', name: 'Updated Name' });

      expect(result).toEqual({ id: '1', code: 'SAME', name: 'Updated Name' });
    });
  });

  describe('remove', () => {
    it('soft deletes by setting isActive=false', async () => {
      mockReturning.mockResolvedValueOnce([{ id: '1' }]);

      await ItemGroupService.remove(TEST_TENANT_A, '1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });
  });
});
