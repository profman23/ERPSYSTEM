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
import { ClientService } from './ClientService';
import { ConflictError } from '../core/errors';

describe('ClientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  describe('list', () => {
    it('returns paginated clients', async () => {
      const mockClients = [
        { id: '1', code: 'CLT-000001', firstName: 'John', lastName: 'Doe', tenantId: TEST_TENANT_A },
        { id: '2', code: 'CLT-000002', firstName: 'Jane', lastName: 'Smith', tenantId: TEST_TENANT_A },
      ];

      // Count query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });
      // Data query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce(mockClients);

      const result = await ClientService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('create', () => {
    it('creates client with auto-generated code', async () => {
      const newClient = { id: '6', code: 'CLT-000006', firstName: 'Alice', tenantId: TEST_TENANT_A };

      // Email exists check — no duplicate (email provided)
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Count query for code generation — returns 5 existing
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

      // Insert returns new record
      mockReturning.mockResolvedValueOnce([newClient]);

      const result = await ClientService.create(TEST_TENANT_A, {
        firstName: 'Alice',
        lastName: 'Wonder',
        email: 'alice@example.com',
      });

      expect(result).toEqual(newClient);
      expect(mockInsert).toHaveBeenCalled();
      // Verify code was generated as CLT-000006
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CLT-000006' })
      );
    });

    it('throws ConflictError on duplicate email', async () => {
      // Email exists check — duplicate found
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'existing' }]),
          }),
        }),
      });

      await expect(
        ClientService.create(TEST_TENANT_A, {
          firstName: 'Bob',
          lastName: 'Jones',
          email: 'taken@example.com',
        })
      ).rejects.toThrow(ConflictError);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('allows creation without email — skips email uniqueness check', async () => {
      const newClient = { id: '7', code: 'CLT-000001', firstName: 'NoEmail', tenantId: TEST_TENANT_A };

      // No email exists check — goes directly to count for code generation
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      // Insert returns new record
      mockReturning.mockResolvedValueOnce([newClient]);

      const result = await ClientService.create(TEST_TENANT_A, {
        firstName: 'NoEmail',
        lastName: 'User',
      });

      expect(result).toEqual(newClient);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CLT-000001' })
      );
    });
  });

  describe('update', () => {
    it('updates client successfully', async () => {
      const updatedClient = { id: '1', firstName: 'Updated', tenantId: TEST_TENANT_A };

      // updateById returning updated record
      mockReturning.mockResolvedValueOnce([updatedClient]);

      const result = await ClientService.update(TEST_TENANT_A, '1', {
        firstName: 'Updated',
      });

      expect(result).toEqual(updatedClient);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('throws ConflictError when updating to existing email', async () => {
      // findByIdOrNull — returns existing client with different email
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: '1', email: 'old@example.com', tenantId: TEST_TENANT_A }]),
          }),
        }),
      });

      // Email exists check — duplicate found
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'other-client' }]),
          }),
        }),
      });

      await expect(
        ClientService.update(TEST_TENANT_A, '1', { email: 'taken@example.com' })
      ).rejects.toThrow(ConflictError);
    });

    it('allows update when email unchanged', async () => {
      // findByIdOrNull — returns existing client with same email
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: '1', email: 'same@example.com', tenantId: TEST_TENANT_A }]),
          }),
        }),
      });

      // updateById returning updated record
      mockReturning.mockResolvedValueOnce([{ id: '1', email: 'same@example.com', firstName: 'Updated' }]);

      const result = await ClientService.update(TEST_TENANT_A, '1', {
        email: 'same@example.com',
        firstName: 'Updated',
      });

      expect(result).toEqual({ id: '1', email: 'same@example.com', firstName: 'Updated' });
    });
  });

  describe('getById', () => {
    it('returns client when found', async () => {
      const mockClient = { id: '1', code: 'CLT-000001', firstName: 'John', tenantId: TEST_TENANT_A };

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockClient]),
          }),
        }),
      });

      const result = await ClientService.getById(TEST_TENANT_A, '1');
      expect(result).toEqual(mockClient);
    });
  });

  describe('remove', () => {
    it('soft deletes by setting isActive=false', async () => {
      mockReturning.mockResolvedValueOnce([{ id: '1' }]);

      await ClientService.remove(TEST_TENANT_A, '1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });
  });

  describe('multi-tenant isolation', () => {
    it('create injects tenantId automatically', async () => {
      // No email — skip email check, go to count
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const newRecord = { id: '10', code: 'CLT-000001', firstName: 'Test', tenantId: TEST_TENANT_A };
      mockReturning.mockResolvedValueOnce([newRecord]);

      await ClientService.create(TEST_TENANT_A, { firstName: 'Test', lastName: 'User' });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TEST_TENANT_A })
      );
    });
  });
});
