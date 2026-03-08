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
import { BreedService } from './BreedService';
import { ConflictError, NotFoundError } from '../core/errors';

describe('BreedService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  describe('list', () => {
    it('returns paginated breeds for tenant', async () => {
      const mockBreeds = [
        { id: '1', code: 'LAB', name: 'Labrador', tenantId: TEST_TENANT_A },
        { id: '2', code: 'GSD', name: 'German Shepherd', tenantId: TEST_TENANT_A },
      ];

      // Count query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });
      // Data query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce(mockBreeds);

      const result = await BreedService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('filters by speciesId when provided', async () => {
      // Count query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });
      // Data query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce([
        { id: '1', code: 'LAB', name: 'Labrador', speciesId: 'species-1' },
      ]);

      const result = await BreedService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
        speciesId: 'species-1',
      });

      expect(result.page).toBe(1);
    });
  });

  describe('create', () => {
    it('creates breed when species exists and code is unique', async () => {
      const newBreed = { id: '3', code: 'PER', name: 'Persian', tenantId: TEST_TENANT_A, speciesId: 'species-1' };

      // Exists check #1: species exists — returns match
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'species-1' }]),
          }),
        }),
      });

      // Exists check #2: code uniqueness — no duplicate
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Insert returns new record
      mockReturning.mockResolvedValueOnce([newBreed]);

      const result = await BreedService.create(TEST_TENANT_A, {
        code: 'PER',
        name: 'Persian',
        speciesId: 'species-1',
      });

      expect(result).toEqual(newBreed);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('throws NotFoundError when speciesId does not exist', async () => {
      // Exists check: species — not found
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        BreedService.create(TEST_TENANT_A, {
          code: 'LAB',
          name: 'Labrador',
          speciesId: 'nonexistent-species',
        })
      ).rejects.toThrow(NotFoundError);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('throws ConflictError on duplicate code', async () => {
      // Exists check #1: species exists
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'species-1' }]),
          }),
        }),
      });

      // Exists check #2: code — duplicate found
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'existing' }]),
          }),
        }),
      });

      await expect(
        BreedService.create(TEST_TENANT_A, {
          code: 'LAB',
          name: 'Labrador',
          speciesId: 'species-1',
        })
      ).rejects.toThrow(ConflictError);

      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('validates speciesId exists when changing species', async () => {
      // Exists check: species — not found
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        BreedService.update(TEST_TENANT_A, '1', {
          speciesId: 'nonexistent-species',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError when updating to existing code', async () => {
      // findByIdOrNull — returns existing breed with different code
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: '1', code: 'OLD_CODE', tenantId: TEST_TENANT_A }]),
          }),
        }),
      });

      // Exists check: new code — duplicate found
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'other-breed' }]),
          }),
        }),
      });

      await expect(
        BreedService.update(TEST_TENANT_A, '1', { code: 'TAKEN_CODE' })
      ).rejects.toThrow(ConflictError);
    });

    it('allows update when code unchanged', async () => {
      // findByIdOrNull — returns existing breed with same code
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: '1', code: 'SAME', tenantId: TEST_TENANT_A }]),
          }),
        }),
      });

      // updateById returning updated record
      mockReturning.mockResolvedValueOnce([{ id: '1', code: 'SAME', name: 'Updated Name' }]);

      const result = await BreedService.update(TEST_TENANT_A, '1', { code: 'SAME', name: 'Updated Name' });

      expect(result).toEqual({ id: '1', code: 'SAME', name: 'Updated Name' });
    });
  });

  describe('getById', () => {
    it('returns breed when found', async () => {
      const mockBreed = { id: '1', code: 'LAB', name: 'Labrador', tenantId: TEST_TENANT_A };

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBreed]),
          }),
        }),
      });

      const result = await BreedService.getById(TEST_TENANT_A, '1');
      expect(result).toEqual(mockBreed);
    });
  });

  describe('remove', () => {
    it('soft deletes by setting isActive=false', async () => {
      mockReturning.mockResolvedValueOnce([{ id: '1' }]);

      await BreedService.remove(TEST_TENANT_A, '1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });
  });
});
