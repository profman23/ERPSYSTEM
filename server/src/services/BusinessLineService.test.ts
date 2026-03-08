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
import { BusinessLineService } from './BusinessLineService';
import { ConflictError } from '../core/errors';

describe('BusinessLineService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  describe('list', () => {
    it('returns paginated business lines for tenant', async () => {
      // Count query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });
      // Data query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce([
        { id: '1', code: 'VET', name: 'Veterinary', tenantId: TEST_TENANT_A },
        { id: '2', code: 'PET', name: 'Pet Shop', tenantId: TEST_TENANT_A },
      ]);

      const result = await BusinessLineService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('create', () => {
    it('creates business line and uppercases code', async () => {
      const newBL = { id: '3', code: 'LAB', name: 'Laboratory', tenantId: TEST_TENANT_A };

      // exists check — no duplicate
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockReturning.mockResolvedValueOnce([newBL]);

      const result = await BusinessLineService.create(TEST_TENANT_A, {
        code: 'lab', // lowercase input
        name: 'Laboratory',
      });

      expect(result).toEqual(newBL);
      // Verify the code was uppercased before insert
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'LAB' }),
      );
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
        BusinessLineService.create(TEST_TENANT_A, { code: 'VET', name: 'Veterinary' }),
      ).rejects.toThrow(ConflictError);

      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('returns business line when found', async () => {
      const mockBL = { id: '1', code: 'VET', name: 'Veterinary', tenantId: TEST_TENANT_A };

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBL]),
          }),
        }),
      });

      const result = await BusinessLineService.getById(TEST_TENANT_A, '1');
      expect(result).toEqual(mockBL);
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
        BusinessLineService.getById(TEST_TENANT_A, 'nonexistent'),
      ).rejects.toThrow("not found");
    });
  });

  describe('remove (soft delete)', () => {
    it('soft deletes by setting isActive=false', async () => {
      mockReturning.mockResolvedValueOnce([{ id: '1' }]);

      await BusinessLineService.remove(TEST_TENANT_A, '1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
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

      mockReturning.mockResolvedValueOnce([{ id: '5', code: 'NEW', name: 'New', tenantId: TEST_TENANT_A }]);

      await BusinessLineService.create(TEST_TENANT_A, { code: 'new', name: 'New' });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TEST_TENANT_A }),
      );
    });
  });
});
