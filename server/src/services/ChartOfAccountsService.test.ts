import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_TENANT_A } from '../test/helpers';

// ─── Mock fns ────────────────────────────────────────────────────────────────

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
const mockTxUpdate = vi.fn();
const mockTxSet = vi.fn();
const mockTxWhere = vi.fn();
const mockTxReturning = vi.fn();
const mockTxSelect = vi.fn();
const mockTxFrom = vi.fn();
const mockTxFromWhere = vi.fn();

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
  mockTxWhere.mockResolvedValue(undefined);
  mockTxReturning.mockResolvedValue([]);

  mockTxSelect.mockReturnValue({ from: mockTxFrom });
  mockTxFrom.mockReturnValue({ where: mockTxFromWhere });
  mockTxFromWhere.mockResolvedValue([]);
}

vi.mock('../db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    transaction: async (fn: Function) =>
      fn({
        update: (...args: unknown[]) => mockTxUpdate(...args),
        select: (...args: unknown[]) => mockTxSelect(...args),
      }),
  },
}));

// Import AFTER mocking
import { ChartOfAccountsService } from './ChartOfAccountsService';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../core/errors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockExistsCall(found: boolean) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(found ? [{ id: 'existing' }] : []),
      }),
    }),
  });
}

function mockFindByIdCall(record: Record<string, unknown> | null) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(record ? [record] : []),
      }),
    }),
  });
}

function mockHasActiveChildrenCall(hasChildren: boolean) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(hasChildren ? [{ id: 'child-1' }] : []),
      }),
    }),
  });
}

function makeAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'acc-1',
    tenantId: TEST_TENANT_A,
    code: '1000',
    name: 'Cash',
    nameAr: null,
    accountType: 'ASSET',
    normalBalance: 'DEBIT',
    isPostable: false,
    isSystemAccount: false,
    parentId: null,
    level: 0,
    path: '1000',
    version: 1,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ChartOfAccountsService', () => {
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
    mockTxUpdate.mockReset();
    mockTxSet.mockReset();
    mockTxWhere.mockReset();
    mockTxReturning.mockReset();
    mockTxSelect.mockReset();
    mockTxFrom.mockReset();
    mockTxFromWhere.mockReset();
    setupChain();
  });

  // ─── LIST ────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated results with filters', async () => {
      const accounts = [makeAccount(), makeAccount({ id: 'acc-2', code: '2000' })];

      // COUNT query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });
      // DATA query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce(accounts);

      const result = await ChartOfAccountsService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // ─── GET TREE ────────────────────────────────────────────────────────────

  describe('getTree', () => {
    it('returns tree structure from flat accounts', async () => {
      const root = makeAccount({ id: 'r1', code: '1000', path: '1000', level: 0, parentId: null });
      const child = makeAccount({ id: 'c1', code: '1100', path: '1000.1100', level: 1, parentId: 'r1' });

      // getTree uses this.db.select().from().where().orderBy()
      mockOrderBy.mockResolvedValueOnce([root, child]);

      const result = await ChartOfAccountsService.getTree(TEST_TENANT_A);

      expect(result.flatCount).toBe(2);
      expect(result.tree).toHaveLength(1);
      expect(result.tree[0].account.id).toBe('r1');
      expect(result.tree[0].children).toHaveLength(1);
      expect(result.tree[0].children[0].account.id).toBe('c1');
    });

    it('builds tree with parent-child links for multiple roots', async () => {
      const root1 = makeAccount({ id: 'r1', code: '1000', path: '1000', level: 0, parentId: null });
      const root2 = makeAccount({ id: 'r2', code: '2000', path: '2000', level: 0, parentId: null, accountType: 'LIABILITY' });
      const child1 = makeAccount({ id: 'c1', code: '1100', path: '1000.1100', level: 1, parentId: 'r1' });

      mockOrderBy.mockResolvedValueOnce([root1, root2, child1]);

      const result = await ChartOfAccountsService.getTree(TEST_TENANT_A);

      expect(result.tree).toHaveLength(2);
      expect(result.tree[0].children).toHaveLength(1);
      expect(result.tree[1].children).toHaveLength(0);
    });
  });

  // ─── GET BY ID ───────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns account when found', async () => {
      const account = makeAccount();
      mockFindByIdCall(account);

      const result = await ChartOfAccountsService.getById(TEST_TENANT_A, 'acc-1');
      expect(result).toEqual(account);
    });

    it('throws NotFoundError when not found', async () => {
      mockFindByIdCall(null);

      await expect(
        ChartOfAccountsService.getById(TEST_TENANT_A, 'nonexistent'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── CREATE ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates account with code uniqueness check', async () => {
      const newAccount = makeAccount({ id: 'new-1', code: '3000' });

      // exists check - no duplicate
      mockExistsCall(false);
      // insertOne returns the new record
      mockReturning.mockResolvedValueOnce([newAccount]);

      const result = await ChartOfAccountsService.create(TEST_TENANT_A, {
        code: '3000',
        name: 'Revenue',
        accountType: 'REVENUE' as const,
        isPostable: false,
      });

      expect(result).toEqual(newAccount);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('throws ConflictError on duplicate code', async () => {
      // exists check - duplicate found
      mockExistsCall(true);

      await expect(
        ChartOfAccountsService.create(TEST_TENANT_A, {
          code: '1000',
          name: 'Cash',
          accountType: 'ASSET' as const,
          isPostable: false,
        }),
      ).rejects.toThrow(ConflictError);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('resolves parent and computes level/path when parentId provided', async () => {
      const parent = makeAccount({
        id: 'parent-1',
        code: '1000',
        path: '1000',
        level: 0,
        isPostable: false,
        accountType: 'ASSET',
      });
      const child = makeAccount({
        id: 'child-1',
        code: '1100',
        path: '1000.1100',
        level: 1,
        parentId: 'parent-1',
      });

      // exists check - no duplicate
      mockExistsCall(false);
      // findById for parent
      mockFindByIdCall(parent);
      // insertOne returns the child
      mockReturning.mockResolvedValueOnce([child]);

      const result = await ChartOfAccountsService.create(TEST_TENANT_A, {
        code: '1100',
        name: 'Petty Cash',
        accountType: 'ASSET' as const,
        isPostable: true,
        parentId: 'parent-1',
      });

      expect(result).toEqual(child);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 'parent-1',
          level: 1,
          path: '1000.1100',
        }),
      );
    });

    it('throws ValidationError when parent is postable', async () => {
      const parent = makeAccount({
        id: 'parent-1',
        isPostable: true,
        accountType: 'ASSET',
      });

      // exists check - no duplicate
      mockExistsCall(false);
      // findById for parent
      mockFindByIdCall(parent);

      await expect(
        ChartOfAccountsService.create(TEST_TENANT_A, {
          code: '1100',
          name: 'Petty Cash',
          accountType: 'ASSET' as const,
          isPostable: true,
          parentId: 'parent-1',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when child type differs from parent', async () => {
      const parent = makeAccount({
        id: 'parent-1',
        isPostable: false,
        accountType: 'ASSET',
      });

      // exists check - no duplicate
      mockExistsCall(false);
      // findById for parent
      mockFindByIdCall(parent);

      await expect(
        ChartOfAccountsService.create(TEST_TENANT_A, {
          code: '1100',
          name: 'Revenue Child',
          accountType: 'REVENUE' as const,
          isPostable: true,
          parentId: 'parent-1',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('auto-derives normalBalance based on accountType', async () => {
      // ASSET/EXPENSE → DEBIT, LIABILITY/EQUITY/REVENUE → CREDIT
      const newAccount = makeAccount({ code: '4000', normalBalance: 'CREDIT' });

      // exists check
      mockExistsCall(false);
      // insertOne
      mockReturning.mockResolvedValueOnce([newAccount]);

      await ChartOfAccountsService.create(TEST_TENANT_A, {
        code: '4000',
        name: 'Sales Revenue',
        accountType: 'REVENUE' as const,
        isPostable: true,
      });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          normalBalance: 'CREDIT',
        }),
      );
    });
  });

  // ─── UPDATE ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates account and checks code uniqueness on change', async () => {
      const existing = makeAccount({ id: 'acc-1', code: '1000' });
      const updated = { ...existing, code: '1001', name: 'Updated Cash' };

      // findById for existing
      mockFindByIdCall(existing);
      // exists check for new code
      mockExistsCall(false);

      // cascadePathUpdate uses transaction with tx.update and tx.select
      // tx.update for own path
      mockTxSet.mockReturnValueOnce({ where: vi.fn().mockResolvedValue(undefined) });
      // tx.select for descendants
      mockTxFrom.mockReturnValueOnce({ where: vi.fn().mockResolvedValue([]) });

      // updateById returns updated record
      mockReturning.mockResolvedValueOnce([updated]);

      const result = await ChartOfAccountsService.update(TEST_TENANT_A, 'acc-1', {
        code: '1001',
        name: 'Updated Cash',
      });

      expect(result).toEqual(updated);
    });

    it('throws ConflictError on duplicate code', async () => {
      const existing = makeAccount({ id: 'acc-1', code: '1000' });

      // findById for existing
      mockFindByIdCall(existing);
      // exists check - duplicate found
      mockExistsCall(true);

      await expect(
        ChartOfAccountsService.update(TEST_TENANT_A, 'acc-1', { code: '2000' }),
      ).rejects.toThrow(ConflictError);
    });

    it('throws ValidationError when making postable while has children', async () => {
      const existing = makeAccount({ id: 'acc-1', isPostable: false });

      // findById for existing
      mockFindByIdCall(existing);
      // hasActiveChildren - has children
      mockHasActiveChildrenCall(true);

      await expect(
        ChartOfAccountsService.update(TEST_TENANT_A, 'acc-1', { isPostable: true }),
      ).rejects.toThrow(ValidationError);
    });

    it('optimistic locking rejects stale version', async () => {
      const existing = makeAccount({ id: 'acc-1', version: 2 });

      // findById for existing
      mockFindByIdCall(existing);

      // db.update().set().where().returning() returns empty (version mismatch)
      mockReturning.mockResolvedValueOnce([]);

      await expect(
        ChartOfAccountsService.update(TEST_TENANT_A, 'acc-1', {
          name: 'Stale Update',
          version: 1,
        } as any),
      ).rejects.toThrow(ConflictError);
    });
  });

  // ─── MOVE ────────────────────────────────────────────────────────────────

  describe('move', () => {
    it('moves account to new parent, updates path/level', async () => {
      const account = makeAccount({
        id: 'acc-1',
        code: '1100',
        path: '1100',
        level: 0,
        accountType: 'ASSET',
      });
      const newParent = makeAccount({
        id: 'parent-1',
        code: '1000',
        path: '1000',
        level: 0,
        isPostable: false,
        accountType: 'ASSET',
      });
      const moved = makeAccount({
        id: 'acc-1',
        code: '1100',
        path: '1000.1100',
        level: 1,
        parentId: 'parent-1',
      });

      // findById for account
      mockFindByIdCall(account);
      // findById for new parent
      mockFindByIdCall(newParent);

      // transaction: tx.update for moved account
      mockTxSet.mockReturnValueOnce({ where: vi.fn().mockResolvedValue(undefined) });
      // transaction: tx.select for descendants
      mockTxFrom.mockReturnValueOnce({ where: vi.fn().mockResolvedValue([]) });

      // final findById after move
      mockFindByIdCall(moved);

      const result = await ChartOfAccountsService.move(TEST_TENANT_A, 'acc-1', 'parent-1');
      expect(result).toEqual(moved);
    });

    it('throws ValidationError on self-move', async () => {
      const account = makeAccount({ id: 'acc-1' });

      // findById for account
      mockFindByIdCall(account);

      await expect(
        ChartOfAccountsService.move(TEST_TENANT_A, 'acc-1', 'acc-1'),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError on cycle detection (moving to own descendant)', async () => {
      const account = makeAccount({
        id: 'acc-1',
        code: '1000',
        path: '1000',
        level: 0,
      });
      const descendant = makeAccount({
        id: 'desc-1',
        code: '1100',
        path: '1000.1100',
        level: 1,
        parentId: 'acc-1',
        accountType: 'ASSET',
      });

      // findById for account
      mockFindByIdCall(account);
      // findById for newParent (which is a descendant)
      mockFindByIdCall(descendant);

      await expect(
        ChartOfAccountsService.move(TEST_TENANT_A, 'acc-1', 'desc-1'),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError on type mismatch', async () => {
      const account = makeAccount({
        id: 'acc-1',
        accountType: 'ASSET',
        path: '1000',
      });
      const newParent = makeAccount({
        id: 'parent-1',
        accountType: 'LIABILITY',
        isPostable: false,
        path: '2000',
      });

      // findById for account
      mockFindByIdCall(account);
      // findById for new parent
      mockFindByIdCall(newParent);

      await expect(
        ChartOfAccountsService.move(TEST_TENANT_A, 'acc-1', 'parent-1'),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ─── REMOVE ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('soft deletes account', async () => {
      const account = makeAccount({ id: 'acc-1', isSystemAccount: false });

      // findById for account
      mockFindByIdCall(account);
      // hasActiveChildren - no children
      mockHasActiveChildrenCall(false);
      // softDelete returns result
      mockReturning.mockResolvedValueOnce([{ id: 'acc-1' }]);

      await ChartOfAccountsService.remove(TEST_TENANT_A, 'acc-1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('throws ValidationError when has active children', async () => {
      const account = makeAccount({ id: 'acc-1' });

      // findById for account
      mockFindByIdCall(account);
      // hasActiveChildren - has children
      mockHasActiveChildrenCall(true);

      await expect(
        ChartOfAccountsService.remove(TEST_TENANT_A, 'acc-1'),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ForbiddenError when account is system account', async () => {
      const account = makeAccount({ id: 'acc-1', isSystemAccount: true });

      // findById for account
      mockFindByIdCall(account);
      // hasActiveChildren - no children
      mockHasActiveChildrenCall(false);

      await expect(
        ChartOfAccountsService.remove(TEST_TENANT_A, 'acc-1'),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
