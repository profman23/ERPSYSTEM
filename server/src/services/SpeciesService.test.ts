import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_TENANT_A, TEST_TENANT_B } from '../test/helpers';

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

// Build chainable mock
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
import { SpeciesService } from './SpeciesService';
import { ConflictError } from '../core/errors';

describe('SpeciesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  describe('list', () => {
    it('delegates to findMany and returns items with pagination info', async () => {
      const mockSpecies = [
        { id: '1', code: 'DOG', name: 'Dog', tenantId: TEST_TENANT_A },
        { id: '2', code: 'CAT', name: 'Cat', tenantId: TEST_TENANT_A },
      ];

      // Count query returns total
      mockWhere.mockReturnValueOnce({
        orderBy: mockOrderBy,
        limit: mockLimit,
        returning: mockReturning,
      });
      // First call to select().from().where() is the COUNT
      mockSelect.mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: 2 }]) }) });
      // Second call returns data
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce(mockSpecies);

      const result = await SpeciesService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('create', () => {
    it('creates species when code is unique', async () => {
      const newSpecies = { id: '3', code: 'BIRD', name: 'Bird', tenantId: TEST_TENANT_A };

      // exists check — returns empty (no duplicate)
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // insert returns the new record
      mockReturning.mockResolvedValueOnce([newSpecies]);

      const result = await SpeciesService.create(TEST_TENANT_A, {
        code: 'BIRD',
        name: 'Bird',
      });

      expect(result).toEqual(newSpecies);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('throws ConflictError on duplicate code', async () => {
      // exists check — returns a match (duplicate found)
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'existing' }]),
          }),
        }),
      });

      await expect(
        SpeciesService.create(TEST_TENANT_A, { code: 'DOG', name: 'Dog' })
      ).rejects.toThrow(ConflictError);

      // Insert should NOT have been called
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('returns species when found', async () => {
      const mockSpecies = { id: '1', code: 'DOG', name: 'Dog', tenantId: TEST_TENANT_A };

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSpecies]),
          }),
        }),
      });

      const result = await SpeciesService.getById(TEST_TENANT_A, '1');
      expect(result).toEqual(mockSpecies);
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
        SpeciesService.getById(TEST_TENANT_A, 'nonexistent')
      ).rejects.toThrow("Species with ID 'nonexistent' not found");
    });
  });

  describe('remove (soft delete)', () => {
    it('soft deletes by setting isActive=false', async () => {
      // update().set().where().returning() returns the updated record
      mockReturning.mockResolvedValueOnce([{ id: '1' }]);

      await SpeciesService.remove(TEST_TENANT_A, '1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });

    it('throws NotFoundError when record does not exist', async () => {
      mockReturning.mockResolvedValueOnce([]);

      await expect(
        SpeciesService.remove(TEST_TENANT_A, 'nonexistent')
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

      const newRecord = { id: '5', code: 'FISH', name: 'Fish', tenantId: TEST_TENANT_A };
      mockReturning.mockResolvedValueOnce([newRecord]);

      await SpeciesService.create(TEST_TENANT_A, { code: 'FISH', name: 'Fish' });

      // Verify insert was called with tenantId
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TEST_TENANT_A })
      );
    });
  });
});
