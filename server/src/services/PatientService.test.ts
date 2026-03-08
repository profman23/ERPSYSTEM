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

// Import AFTER mocking
import { PatientService } from './PatientService';
import { NotFoundError } from '../core/errors';

const TEST_CLIENT_ID = '00000000-0000-0000-0000-000000000301';
const TEST_SPECIES_ID = '00000000-0000-0000-0000-000000000302';
const TEST_BREED_ID = '00000000-0000-0000-0000-000000000303';
const TEST_CROSS_BREED_ID = '00000000-0000-0000-0000-000000000304';

const validInput = {
  name: 'Buddy',
  clientId: TEST_CLIENT_ID,
  speciesId: TEST_SPECIES_ID,
  gender: 'male' as const,
};

/** Helper: mock an exists() check that finds a record */
function mockExistsFound() {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ id: 'x' }]),
      }),
    }),
  });
}

/** Helper: mock an exists() check that finds nothing */
function mockExistsNotFound() {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  });
}

/** Helper: mock count() returning a number */
function mockCount(count: number) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count }]),
    }),
  });
}

describe('PatientService', () => {
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
    mockLeftJoin.mockReset();
    setupChain();
  });

  describe('list', () => {
    it('returns paginated results with JOINs', async () => {
      const mockPatients = [
        { id: '1', code: 'PAT-000001', name: 'Buddy', tenantId: TEST_TENANT_A },
        { id: '2', code: 'PAT-000002', name: 'Max', tenantId: TEST_TENANT_A },
      ];

      // Count query: select().from().where() resolves to [{ count: 2 }]
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });

      // Data query: select().from().leftJoin().leftJoin().leftJoin().where().orderBy().limit().offset()
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce(mockPatients);

      const result = await PatientService.list(TEST_TENANT_A, { page: 1, limit: 20 });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(2);
      expect(result.items).toEqual(mockPatients);
    });
  });

  describe('create', () => {
    it('validates clientId, speciesId, generates code, and inserts', async () => {
      const newPatient = { id: '3', code: 'PAT-000001', name: 'Buddy', tenantId: TEST_TENANT_A };

      // exists(clientId) → found
      mockExistsFound();
      // exists(speciesId) → found
      mockExistsFound();
      // count() → 0
      mockCount(0);
      // insert returns new record
      mockReturning.mockResolvedValueOnce([newPatient]);

      const result = await PatientService.create(TEST_TENANT_A, validInput);

      expect(result).toEqual(newPatient);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('throws NotFoundError when clientId does not exist', async () => {
      // exists(clientId) → NOT found
      mockExistsNotFound();

      await expect(
        PatientService.create(TEST_TENANT_A, validInput)
      ).rejects.toThrow(NotFoundError);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when speciesId does not exist', async () => {
      // exists(clientId) → found
      mockExistsFound();
      // exists(speciesId) → NOT found
      mockExistsNotFound();

      await expect(
        PatientService.create(TEST_TENANT_A, validInput)
      ).rejects.toThrow(NotFoundError);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when breedId does not exist', async () => {
      // exists(clientId) → found
      mockExistsFound();
      // exists(speciesId) → found
      mockExistsFound();
      // exists(breedId) → NOT found
      mockExistsNotFound();

      await expect(
        PatientService.create(TEST_TENANT_A, {
          ...validInput,
          breedId: TEST_BREED_ID,
        })
      ).rejects.toThrow(NotFoundError);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('succeeds without breedId and crossBreedId (optional FKs)', async () => {
      const newPatient = { id: '4', code: 'PAT-000001', name: 'Buddy', tenantId: TEST_TENANT_A };

      // exists(clientId) → found
      mockExistsFound();
      // exists(speciesId) → found
      mockExistsFound();
      // No breedId/crossBreedId checks
      // count() → 0
      mockCount(0);
      // insert returns
      mockReturning.mockResolvedValueOnce([newPatient]);

      const result = await PatientService.create(TEST_TENANT_A, {
        name: 'Buddy',
        clientId: TEST_CLIENT_ID,
        speciesId: TEST_SPECIES_ID,
        gender: 'male' as const,
      });

      expect(result).toEqual(newPatient);
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('returns patient with JOINs when found', async () => {
      const mockPatient = {
        id: '1',
        code: 'PAT-000001',
        name: 'Buddy',
        tenantId: TEST_TENANT_A,
        ownerFirstName: 'John',
        speciesName: 'Dog',
      };

      // getById uses: select().from().leftJoin().leftJoin().leftJoin().where().limit()
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockLimit.mockResolvedValueOnce([mockPatient]);

      const result = await PatientService.getById(TEST_TENANT_A, '1');
      expect(result).toEqual(mockPatient);
    });

    it('throws NotFoundError when patient not found', async () => {
      // select().from().leftJoin chain → where().limit() → []
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockLimit.mockResolvedValueOnce([]);

      await expect(
        PatientService.getById(TEST_TENANT_A, 'nonexistent')
      ).rejects.toThrow("Patient with ID 'nonexistent' not found");
    });
  });

  describe('update', () => {
    it('validates FKs if provided and updates', async () => {
      const updated = { id: '1', code: 'PAT-000001', name: 'Buddy Jr', tenantId: TEST_TENANT_A };

      // exists(clientId) → found
      mockExistsFound();
      // exists(speciesId) → found
      mockExistsFound();

      // updateById: select().from().where().limit() for find check
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: '1' }]),
          }),
        }),
      });

      // update().set().where().returning()
      mockReturning.mockResolvedValueOnce([updated]);

      const result = await PatientService.update(TEST_TENANT_A, '1', {
        name: 'Buddy Jr',
        clientId: TEST_CLIENT_ID,
        speciesId: TEST_SPECIES_ID,
      });

      expect(result).toEqual(updated);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('throws NotFoundError for invalid clientId on update', async () => {
      // exists(clientId) → NOT found
      mockExistsNotFound();

      await expect(
        PatientService.update(TEST_TENANT_A, '1', {
          clientId: 'bad-client-id',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('remove (soft delete)', () => {
    it('soft deletes by setting isActive=false', async () => {
      // softDelete: update().set().where().returning() returns record
      mockReturning.mockResolvedValueOnce([{ id: '1' }]);

      await PatientService.remove(TEST_TENANT_A, '1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });

    it('throws NotFoundError when record does not exist', async () => {
      mockReturning.mockResolvedValueOnce([]);

      await expect(
        PatientService.remove(TEST_TENANT_A, 'nonexistent')
      ).rejects.toThrow('not found');
    });
  });

  describe('multi-tenant isolation', () => {
    it('create injects tenantId automatically', async () => {
      // exists(clientId) → found
      mockExistsFound();
      // exists(speciesId) → found
      mockExistsFound();
      // count() → 0
      mockCount(0);

      const newRecord = { id: '5', code: 'PAT-000001', name: 'Buddy', tenantId: TEST_TENANT_B };
      mockReturning.mockResolvedValueOnce([newRecord]);

      const result = await PatientService.create(TEST_TENANT_B, validInput);

      expect(result.tenantId).toBe(TEST_TENANT_B);
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('auto-code generation', () => {
    it('generates PAT-000006 when count returns 5', async () => {
      // exists(clientId) → found
      mockExistsFound();
      // exists(speciesId) → found
      mockExistsFound();
      // count() → 5
      mockCount(5);

      const newRecord = { id: '6', code: 'PAT-000006', name: 'Rex', tenantId: TEST_TENANT_A };
      mockReturning.mockResolvedValueOnce([newRecord]);

      const result = await PatientService.create(TEST_TENANT_A, {
        ...validInput,
        name: 'Rex',
      });

      // Verify the returned result has the expected code
      expect(result.code).toBe('PAT-000006');
      expect(mockInsert).toHaveBeenCalled();
    });
  });
});
