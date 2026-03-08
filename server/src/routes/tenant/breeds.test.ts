import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import breedsRouter from './breeds';
import { TEST_TENANT_A } from '../../test/helpers';

// ─── Mock BreedService ──────────────────────────────────────────────────────

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../services/BreedService', () => ({
  BreedService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(breedsRouter, { tenantId: TEST_TENANT_A, ...options });
}

const SPECIES_ID = '00000000-0000-0000-0000-000000000099';

function createTestBreed(overrides: Record<string, unknown> = {}) {
  return {
    id: 'breed-1',
    tenantId: TEST_TENANT_A,
    speciesId: SPECIES_ID,
    code: 'LAB',
    name: 'Labrador',
    nameAr: null,
    description: null,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const sampleBreed = createTestBreed();

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [sampleBreed],
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

  it('passes search, speciesId and pagination params', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 2, limit: 10 });

    await request(app())
      .get(`/?search=lab&speciesId=${SPECIES_ID}&page=2&limit=10`)
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ search: 'lab', speciesId: SPECIES_ID, page: 2, limit: 10 }),
    );
  });
});

describe('GET /:id  (get by ID)', () => {
  it('returns 200 with breed data', async () => {
    mockGetById.mockResolvedValue(sampleBreed);

    const res = await request(app()).get('/breed-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('LAB');
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'breed-1');
  });

  it('returns 404 when breed not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('Breed', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('POST /  (create)', () => {
  it('returns 201 with created breed', async () => {
    const input = { speciesId: SPECIES_ID, code: 'PER', name: 'Persian' };
    mockCreate.mockResolvedValue(createTestBreed({ ...input, id: 'breed-2' }));

    const res = await request(app())
      .post('/')
      .send(input)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('PER');
    expect(mockCreate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ code: 'PER', name: 'Persian', speciesId: SPECIES_ID }),
    );
  });

  it('returns 400 on invalid body (missing name)', async () => {
    const res = await request(app())
      .post('/')
      .send({ speciesId: SPECIES_ID, code: 'LAB' }) // missing required 'name'
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 on missing speciesId', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: 'LAB', name: 'Labrador' }) // missing required 'speciesId'
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when code already exists', async () => {
    const { ConflictError } = await import('../../core/errors/AppError');
    mockCreate.mockRejectedValue(
      new ConflictError("Breed with code 'LAB' already exists"),
    );

    const res = await request(app())
      .post('/')
      .send({ speciesId: SPECIES_ID, code: 'LAB', name: 'Labrador' })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CONFLICT');
  });
});

describe('PUT /:id  (update)', () => {
  it('returns 200 with updated breed', async () => {
    const updated = createTestBreed({ id: 'breed-1', name: 'Labrador Retriever' });
    mockUpdate.mockResolvedValue(updated);

    const res = await request(app())
      .put('/breed-1')
      .send({ name: 'Labrador Retriever' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Labrador Retriever');
    expect(mockUpdate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'breed-1',
      expect.objectContaining({ name: 'Labrador Retriever' }),
    );
  });

  it('returns 404 when updating non-existent breed', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockUpdate.mockRejectedValue(new NotFoundError('Breed', 'bad-id'));

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
      .delete('/breed-1')
      .expect(204);

    expect(res.body).toEqual({});
    expect(mockRemove).toHaveBeenCalledWith(TEST_TENANT_A, 'breed-1');
  });

  it('returns 404 when deleting non-existent breed', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockRemove.mockRejectedValue(new NotFoundError('Breed', 'bad-id'));

    const res = await request(app())
      .delete('/bad-id')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(breedsRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
