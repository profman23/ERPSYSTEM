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
import { UnitOfMeasureService } from './UnitOfMeasureService';
import { ConflictError } from '../core/errors';

describe('UnitOfMeasureService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  describe('list', () => {
    it('returns paginated UoMs for tenant', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      });
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce([
        { id: '1', code: 'KG', name: 'Kilogram', tenantId: TEST_TENANT_A },
        { id: '2', code: 'L', name: 'Liter', tenantId: TEST_TENANT_A },
        { id: '3', code: 'PC', name: 'Piece', tenantId: TEST_TENANT_A },
      ]);

      const result = await UnitOfMeasureService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('create', () => {
    it('creates UoM when code is unique', async () => {
      const newUoM = { id: '4', code: 'ML', name: 'Milliliter', tenantId: TEST_TENANT_A };

      // exists check — no duplicate
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockReturning.mockResolvedValueOnce([newUoM]);

      const result = await UnitOfMeasureService.create(TEST_TENANT_A, {
        code: 'ML',
        name: 'Milliliter',
      });

      expect(result).toEqual(newUoM);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('throws ConflictError on duplicate code', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'existing' }]),
          }),
        }),
      });

      await expect(
        UnitOfMeasureService.create(TEST_TENANT_A, { code: 'KG', name: 'Kilogram' }),
      ).rejects.toThrow(ConflictError);

      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const existingUoM = {
      id: '1',
      code: 'KG',
      name: 'Kilogram',
      tenantId: TEST_TENANT_A,
      version: 1,
      isActive: true,
    };

    it('updates UoM when version matches', async () => {
      // findById returns existing
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingUoM]),
          }),
        }),
      });

      const updated = { ...existingUoM, name: 'Kilogramme', version: 2 };
      mockReturning.mockResolvedValueOnce([updated]);

      const result = await UnitOfMeasureService.update(TEST_TENANT_A, '1', {
        name: 'Kilogramme',
        version: 1,
      });

      expect(result).toEqual(updated);
      // Verify version was incremented
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ version: 2 }),
      );
    });

    it('throws ConflictError when version does not match (optimistic lock)', async () => {
      // findById returns existing with version 2
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ ...existingUoM, version: 2 }]),
          }),
        }),
      });

      await expect(
        UnitOfMeasureService.update(TEST_TENANT_A, '1', {
          name: 'Updated',
          version: 1, // stale version
        }),
      ).rejects.toThrow(ConflictError);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('throws ConflictError when updating to existing code', async () => {
      // findById returns existing
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingUoM]),
          }),
        }),
      });

      // exists check — duplicate found
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'other' }]),
          }),
        }),
      });

      await expect(
        UnitOfMeasureService.update(TEST_TENANT_A, '1', {
          code: 'L', // already exists
          version: 1,
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getById', () => {
    it('returns UoM when found', async () => {
      const mockUoM = { id: '1', code: 'KG', name: 'Kilogram', tenantId: TEST_TENANT_A };

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUoM]),
          }),
        }),
      });

      const result = await UnitOfMeasureService.getById(TEST_TENANT_A, '1');
      expect(result).toEqual(mockUoM);
    });
  });

  describe('remove (soft delete)', () => {
    it('soft deletes by setting isActive=false', async () => {
      mockReturning.mockResolvedValueOnce([{ id: '1' }]);

      await UnitOfMeasureService.remove(TEST_TENANT_A, '1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  describe('multi-tenant isolation', () => {
    it('create injects tenantId automatically', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockReturning.mockResolvedValueOnce([{ id: '5', code: 'BOX', name: 'Box', tenantId: TEST_TENANT_A }]);

      await UnitOfMeasureService.create(TEST_TENANT_A, { code: 'BOX', name: 'Box' });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TEST_TENANT_A }),
      );
    });
  });
});
