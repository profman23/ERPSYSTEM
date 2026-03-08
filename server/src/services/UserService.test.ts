import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_TENANT_A } from '../test/helpers';

// Mock chain functions
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
const mockLeftJoin = vi.fn();

function setupChain() {
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere, leftJoin: mockLeftJoin });
  mockLeftJoin.mockReturnValue({ leftJoin: mockLeftJoin, where: mockWhere, orderBy: mockOrderBy });
  mockWhere.mockReturnValue({
    orderBy: mockOrderBy,
    limit: mockLimit,
    returning: mockReturning,
    leftJoin: mockLeftJoin,
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

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('$2a$12$hashedpassword') },
}));

// Import AFTER mocking
import { UserService } from './UserService';
import { ConflictError, NotFoundError } from '../core/errors';
import bcrypt from 'bcryptjs';

const validCreateInput = {
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  password: 'Test@123',
  role: 'staff' as const,
  accessScope: 'branch' as const,
  isActive: true,
};

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  describe('list', () => {
    it('returns paginated results with JOIN data', async () => {
      const mockUsers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', tenantId: TEST_TENANT_A },
        { id: '2', name: 'Jane Doe', email: 'jane@example.com', tenantId: TEST_TENANT_A },
      ];

      // First select call: COUNT query → select().from().where() resolves to [{count:2}]
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });

      // Second select call: data query with LEFT JOINs
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce(mockUsers);

      const result = await UserService.list(TEST_TENANT_A, { page: 1, limit: 20, sortOrder: 'desc' });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(2);
      expect(result.items).toEqual(mockUsers);
    });
  });

  describe('create', () => {
    it('creates user when email is unique', async () => {
      const newUser = { id: '3', email: 'john@example.com', name: 'John Doe', tenantId: TEST_TENANT_A };

      // exists check — returns empty (no duplicate)
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // insert returns the new record
      mockReturning.mockResolvedValueOnce([newUser]);

      const result = await UserService.create(TEST_TENANT_A, validCreateInput);

      expect(result).toEqual(newUser);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('throws ConflictError on duplicate email', async () => {
      // exists check — returns a match
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'existing' }]),
          }),
        }),
      });

      await expect(
        UserService.create(TEST_TENANT_A, validCreateInput),
      ).rejects.toThrow(ConflictError);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('hashes password with bcrypt 12 rounds', async () => {
      // exists check passes
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockReturning.mockResolvedValueOnce([{ id: '3' }]);

      await UserService.create(TEST_TENANT_A, validCreateInput);

      expect(bcrypt.hash).toHaveBeenCalledWith('Test@123', 12);
    });

    it('builds name as firstName + lastName', async () => {
      // exists check passes
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockReturning.mockResolvedValueOnce([{ id: '3' }]);

      await UserService.create(TEST_TENANT_A, validCreateInput);

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'John Doe' }),
      );
    });
  });

  describe('getById', () => {
    it('returns user when found via JOIN query', async () => {
      const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com', tenantId: TEST_TENANT_A };

      // select().from().leftJoin()...where().limit() resolves to [mockUser]
      mockLimit.mockResolvedValueOnce([mockUser]);

      const result = await UserService.getById(TEST_TENANT_A, '1');
      expect(result).toEqual(mockUser);
    });

    it('throws NotFoundError when not found', async () => {
      // The chain resolves to empty array
      mockLimit.mockResolvedValueOnce([]);

      await expect(
        UserService.getById(TEST_TENANT_A, 'nonexistent'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('delegates to updateById', async () => {
      const updated = { id: '1', name: 'Updated', tenantId: TEST_TENANT_A };
      mockReturning.mockResolvedValueOnce([updated]);

      const result = await UserService.update(TEST_TENANT_A, '1', { firstName: 'Updated' });

      expect(result).toEqual(updated);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('toggleStatus', () => {
    it('updates isActive field', async () => {
      const toggled = { id: '1', isActive: false, tenantId: TEST_TENANT_A };
      mockReturning.mockResolvedValueOnce([toggled]);

      const result = await UserService.toggleStatus(TEST_TENANT_A, '1', false);

      expect(result).toEqual(toggled);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  describe('remove (soft delete)', () => {
    it('soft deletes by setting isActive=false', async () => {
      mockReturning.mockResolvedValueOnce([{ id: '1' }]);

      await UserService.remove(TEST_TENANT_A, '1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('throws NotFoundError for nonexistent user', async () => {
      mockReturning.mockResolvedValueOnce([]);

      await expect(
        UserService.remove(TEST_TENANT_A, 'nonexistent'),
      ).rejects.toThrow('not found');
    });
  });

  describe('multi-tenant isolation', () => {
    it('create injects tenantId automatically', async () => {
      // exists check passes
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockReturning.mockResolvedValueOnce([{ id: '5', tenantId: TEST_TENANT_A }]);

      await UserService.create(TEST_TENANT_A, validCreateInput);

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TEST_TENANT_A }),
      );
    });
  });
});
