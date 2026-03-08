import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import patientsRouter from './patients';
import { TEST_TENANT_A } from '../../test/helpers';

// ─── Mock PatientService ────────────────────────────────────────────────────

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../services/PatientService', () => ({
  PatientService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(patientsRouter, { tenantId: TEST_TENANT_A, ...options });
}

const CLIENT_ID = '00000000-0000-0000-0000-000000000050';
const SPECIES_ID = '00000000-0000-0000-0000-000000000099';

function createTestPatient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pat-1',
    tenantId: TEST_TENANT_A,
    code: 'PET-00001',
    clientId: CLIENT_ID,
    speciesId: SPECIES_ID,
    breedId: null,
    crossBreedId: null,
    name: 'Buddy',
    nameAr: null,
    gender: 'male',
    reproductiveStatus: 'intact',
    color: null,
    distinctiveMarks: null,
    dateOfBirth: '2022-01-15',
    ageYears: null,
    ageMonths: null,
    ageDays: null,
    internalNotes: null,
    passportSeries: null,
    insuranceNumber: null,
    microchipId: null,
    metadata: null,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const samplePatient = createTestPatient();

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [samplePatient],
      total: 1,
      page: 1,
      limit: 20,
    });

    const res = await request(app()).get('/').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('passes search and filter params', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 2, limit: 10 });

    await request(app())
      .get(`/?search=buddy&speciesId=${SPECIES_ID}&page=2&limit=10`)
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ search: 'buddy', speciesId: SPECIES_ID, page: 2, limit: 10 }),
    );
  });
});

describe('GET /:id  (get by ID)', () => {
  it('returns 200 with patient data', async () => {
    mockGetById.mockResolvedValue(samplePatient);

    const res = await request(app()).get('/pat-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Buddy');
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'pat-1');
  });

  it('returns 404 when patient not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('Patient', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('POST /  (create)', () => {
  it('returns 201 with created patient', async () => {
    const input = {
      clientId: CLIENT_ID,
      speciesId: SPECIES_ID,
      name: 'Max',
      dateOfBirth: '2023-06-01',
    };
    mockCreate.mockResolvedValue(createTestPatient({ ...input, id: 'pat-2' }));

    const res = await request(app())
      .post('/')
      .send(input)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Max');
    expect(mockCreate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ clientId: CLIENT_ID, speciesId: SPECIES_ID, name: 'Max' }),
    );
  });

  it('returns 400 on invalid body (missing name)', async () => {
    const res = await request(app())
      .post('/')
      .send({ clientId: CLIENT_ID, speciesId: SPECIES_ID, dateOfBirth: '2023-01-01' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when neither dateOfBirth nor age is provided', async () => {
    const res = await request(app())
      .post('/')
      .send({ clientId: CLIENT_ID, speciesId: SPECIES_ID, name: 'Max' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when patient conflicts', async () => {
    const { ConflictError } = await import('../../core/errors/AppError');
    mockCreate.mockRejectedValue(
      new ConflictError('Patient with this code already exists'),
    );

    const res = await request(app())
      .post('/')
      .send({ clientId: CLIENT_ID, speciesId: SPECIES_ID, name: 'Buddy', dateOfBirth: '2022-01-15' })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CONFLICT');
  });
});

describe('PUT /:id  (update)', () => {
  it('returns 200 with updated patient', async () => {
    const updated = createTestPatient({ id: 'pat-1', name: 'Buddy Jr' });
    mockUpdate.mockResolvedValue(updated);

    const res = await request(app())
      .put('/pat-1')
      .send({ name: 'Buddy Jr' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Buddy Jr');
    expect(mockUpdate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'pat-1',
      expect.objectContaining({ name: 'Buddy Jr' }),
    );
  });

  it('returns 404 when updating non-existent patient', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockUpdate.mockRejectedValue(new NotFoundError('Patient', 'bad-id'));

    const res = await request(app())
      .put('/bad-id')
      .send({ name: 'Nope' })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /:id  (soft delete)', () => {
  it('returns 204 with no body', async () => {
    mockRemove.mockResolvedValue(undefined);

    const res = await request(app())
      .delete('/pat-1')
      .expect(204);

    expect(res.body).toEqual({});
    expect(mockRemove).toHaveBeenCalledWith(TEST_TENANT_A, 'pat-1');
  });

  it('returns 404 when deleting non-existent patient', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockRemove.mockRejectedValue(new NotFoundError('Patient', 'bad-id'));

    const res = await request(app())
      .delete('/bad-id')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(patientsRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
