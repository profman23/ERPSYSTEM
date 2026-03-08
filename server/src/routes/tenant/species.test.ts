import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import speciesRouter from './species';
import { TEST_TENANT_A, createTestSpecies } from '../../test/helpers';

// ─── Mock SpeciesService ─────────────────────────────────────────────────────
// All service methods are mocked — we are testing the route/controller layer,
// not business logic (that's covered in SpeciesService.test.ts).

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../services/SpeciesService', () => ({
  SpeciesService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(speciesRouter, { tenantId: TEST_TENANT_A, ...options });
}

const sampleSpecies = createTestSpecies({ id: 'sp-1', code: 'DOG', name: 'Dog' });

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [sampleSpecies],
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

    // Verify service was called with correct tenantId
    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('passes search and pagination params', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 2, limit: 10 });

    await request(app())
      .get('/?search=cat&page=2&limit=10')
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ search: 'cat', page: 2, limit: 10 }),
    );
  });
});

describe('GET /:id  (get by ID)', () => {
  it('returns 200 with species data', async () => {
    mockGetById.mockResolvedValue(sampleSpecies);

    const res = await request(app()).get('/sp-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('DOG');
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'sp-1');
  });

  it('returns 404 when species not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('Species', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('POST /  (create)', () => {
  it('returns 201 with created species', async () => {
    const input = { code: 'CAT', name: 'Cat' };
    mockCreate.mockResolvedValue(createTestSpecies({ ...input, id: 'sp-2' }));

    const res = await request(app())
      .post('/')
      .send(input)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('CAT');
    expect(mockCreate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ code: 'CAT', name: 'Cat' }),
    );
  });

  it('returns 400 on invalid body (missing name)', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: 'CAT' }) // missing required 'name'
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 on empty code', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: '', name: 'Cat' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when code already exists', async () => {
    const { ConflictError } = await import('../../core/errors/AppError');
    mockCreate.mockRejectedValue(
      new ConflictError("Species with code 'DOG' already exists"),
    );

    const res = await request(app())
      .post('/')
      .send({ code: 'DOG', name: 'Dog' })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CONFLICT');
  });
});

describe('PUT /:id  (update)', () => {
  it('returns 200 with updated species', async () => {
    const updated = createTestSpecies({ id: 'sp-1', name: 'Doggo' });
    mockUpdate.mockResolvedValue(updated);

    const res = await request(app())
      .put('/sp-1')
      .send({ name: 'Doggo' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Doggo');
    expect(mockUpdate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'sp-1',
      expect.objectContaining({ name: 'Doggo' }),
    );
  });

  it('returns 404 when updating non-existent species', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockUpdate.mockRejectedValue(new NotFoundError('Species', 'bad-id'));

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
      .delete('/sp-1')
      .expect(204);

    expect(res.body).toEqual({}); // 204 = no content
    expect(mockRemove).toHaveBeenCalledWith(TEST_TENANT_A, 'sp-1');
  });

  it('returns 404 when deleting non-existent species', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockRemove.mockRejectedValue(new NotFoundError('Species', 'bad-id'));

    const res = await request(app())
      .delete('/bad-id')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(speciesRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
