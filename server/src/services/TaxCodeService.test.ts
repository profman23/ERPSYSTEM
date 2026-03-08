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
import { TaxCodeService } from './TaxCodeService';
import { ConflictError, ValidationError } from '../core/errors';

describe('TaxCodeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  describe('list', () => {
    it('returns paginated tax codes', async () => {
      const mockTaxCodes = [
        { id: '1', code: 'VAT5', name: 'VAT 5%', rate: '5', tenantId: TEST_TENANT_A },
      ];

      // Count query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });
      // Data query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce(mockTaxCodes);

      const result = await TaxCodeService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('filters by taxType', async () => {
      // Count query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });
      // Data query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce([
        { id: '1', code: 'VAT5', taxType: 'OUTPUT', tenantId: TEST_TENANT_A },
      ]);

      const result = await TaxCodeService.list(TEST_TENANT_A, {
        page: 1,
        limit: 20,
        taxType: 'OUTPUT',
      });

      expect(result.page).toBe(1);
    });
  });

  describe('create', () => {
    it('creates tax code with string rate conversion', async () => {
      const newTaxCode = { id: '3', code: 'VAT15', name: 'VAT 15%', rate: '15', tenantId: TEST_TENANT_A };

      // Code exists check — no duplicate
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Insert returns new record
      mockReturning.mockResolvedValueOnce([newTaxCode]);

      const result = await TaxCodeService.create(TEST_TENANT_A, {
        code: 'VAT15',
        name: 'VAT 15%',
        rate: 15,
        taxType: 'OUTPUT',
      });

      expect(result).toEqual(newTaxCode);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ rate: '15' })
      );
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
        TaxCodeService.create(TEST_TENANT_A, {
          code: 'VAT5',
          name: 'VAT 5%',
          rate: 5,
          taxType: 'OUTPUT',
        })
      ).rejects.toThrow(ConflictError);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('validates salesTaxAccountId exists, is active, and is postable', async () => {
      const newTaxCode = { id: '4', code: 'TAX1', name: 'Tax 1', rate: '10', tenantId: TEST_TENANT_A };

      // Code exists check — no duplicate
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // validateTaxAccount for salesTaxAccountId — account found, active, postable
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockWhere.mockReturnValueOnce({
        orderBy: mockOrderBy,
        limit: mockLimit,
        returning: mockReturning,
      });
      mockLimit.mockResolvedValueOnce([{ id: 'acct-sales', isActive: true, isPostable: true }]);

      // Insert returns new record
      mockReturning.mockResolvedValueOnce([newTaxCode]);

      const result = await TaxCodeService.create(TEST_TENANT_A, {
        code: 'TAX1',
        name: 'Tax 1',
        rate: 10,
        taxType: 'OUTPUT',
        salesTaxAccountId: 'acct-sales',
      });

      expect(result).toEqual(newTaxCode);
    });

    it('validates purchaseTaxAccountId exists', async () => {
      // Code exists check — no duplicate
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // validateTaxAccount for purchaseTaxAccountId — not found
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockWhere.mockReturnValueOnce({
        orderBy: mockOrderBy,
        limit: mockLimit,
        returning: mockReturning,
      });
      mockLimit.mockResolvedValueOnce([]);

      await expect(
        TaxCodeService.create(TEST_TENANT_A, {
          code: 'TAX2',
          name: 'Tax 2',
          rate: 5,
          taxType: 'INPUT',
          purchaseTaxAccountId: 'nonexistent-acct',
        })
      ).rejects.toThrow(ValidationError);

      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates when version matches', async () => {
      const existing = { id: '1', code: 'VAT5', version: 1, taxType: 'OUTPUT', tenantId: TEST_TENANT_A };
      const updated = { ...existing, name: 'Updated', version: 2 };

      // findById for version check
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existing]),
          }),
        }),
      });

      // updateById returns updated record
      mockReturning.mockResolvedValueOnce([updated]);

      const result = await TaxCodeService.update(TEST_TENANT_A, '1', {
        name: 'Updated',
        version: 1,
      });

      expect(result).toEqual(updated);
    });

    it('throws ConflictError on version mismatch', async () => {
      const existing = { id: '1', code: 'VAT5', version: 2, taxType: 'OUTPUT', tenantId: TEST_TENANT_A };

      // findById for version check — existing version is 2, input version is 1
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existing]),
          }),
        }),
      });

      await expect(
        TaxCodeService.update(TEST_TENANT_A, '1', {
          name: 'Updated',
          version: 1,
        })
      ).rejects.toThrow(ConflictError);
    });

    it('throws ValidationError when EXEMPT code rate changed from 0', async () => {
      const existing = { id: '1', code: 'EXM', version: 1, taxType: 'EXEMPT', rate: '0', tenantId: TEST_TENANT_A };

      // findById for version check
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existing]),
          }),
        }),
      });

      await expect(
        TaxCodeService.update(TEST_TENANT_A, '1', {
          rate: 5,
          version: 1,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('validates GL accounts on update', async () => {
      const existing = { id: '1', code: 'VAT5', version: 1, taxType: 'OUTPUT', tenantId: TEST_TENANT_A };

      // findById for version check
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existing]),
          }),
        }),
      });

      // validateTaxAccount for salesTaxAccountId — not found
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockWhere.mockReturnValueOnce({
        orderBy: mockOrderBy,
        limit: mockLimit,
        returning: mockReturning,
      });
      mockLimit.mockResolvedValueOnce([]);

      await expect(
        TaxCodeService.update(TEST_TENANT_A, '1', {
          salesTaxAccountId: 'bad-acct',
          version: 1,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('returns tax code when found', async () => {
      const mockTaxCode = { id: '1', code: 'VAT5', name: 'VAT 5%', tenantId: TEST_TENANT_A };

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTaxCode]),
          }),
        }),
      });

      const result = await TaxCodeService.getById(TEST_TENANT_A, '1');
      expect(result).toEqual(mockTaxCode);
    });
  });

  describe('remove', () => {
    it('soft deletes by setting isActive=false', async () => {
      mockReturning.mockResolvedValueOnce([{ id: '1' }]);

      await TaxCodeService.remove(TEST_TENANT_A, '1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });
  });
});
