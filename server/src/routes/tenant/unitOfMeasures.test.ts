import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import unitOfMeasureRouter from './unitOfMeasures';
import { TEST_TENANT_A } from '../../test/helpers';

// ─── Mock UnitOfMeasureService ──────────────────────────────────────────────

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../services/UnitOfMeasureService', () => ({
  UnitOfMeasureService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(unitOfMeasureRouter, { tenantId: TEST_TENANT_A, ...options });
}

function createTestUoM(overrides: Record<string, unknown> = {}) {
  return {
    id: 'uom-1',
    tenantId: TEST_TENANT_A,
    code: 'KG',
    name: 'Kilogram',
    symbol: 'kg',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const sampleUoM = createTestUoM();

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [sampleUoM],
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

  it('passes search and pagination params', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 2, limit: 10 });

    await request(app())
      .get('/?search=kilo&page=2&limit=10')
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ search: 'kilo', page: 2, limit: 10 }),
    );
  });
});

describe('GET /:id  (get by ID)', () => {
  it('returns 200 with unit of measure data', async () => {
    mockGetById.mockResolvedValue(sampleUoM);

    const res = await request(app()).get('/uom-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('KG');
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'uom-1');
  });

  it('returns 404 when unit of measure not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('UnitOfMeasure', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('POST /  (create)', () => {
  it('returns 201 with created unit of measure', async () => {
    const input = { code: 'LTR', name: 'Liter' };
    mockCreate.mockResolvedValue(createTestUoM({ ...input, id: 'uom-2' }));

    const res = await request(app())
      .post('/')
      .send(input)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('LTR');
    expect(mockCreate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ code: 'LTR', name: 'Liter' }),
    );
  });

  it('returns 400 on invalid body (missing name)', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: 'LTR' }) // missing required 'name'
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 on empty code', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: '', name: 'Liter' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when code already exists', async () => {
    const { ConflictError } = await import('../../core/errors/AppError');
    mockCreate.mockRejectedValue(
      new ConflictError("Unit of measure with code 'KG' already exists"),
    );

    const res = await request(app())
      .post('/')
      .send({ code: 'KG', name: 'Kilogram' })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CONFLICT');
  });
});

describe('PUT /:id  (update)', () => {
  it('returns 200 with updated unit of measure', async () => {
    const updated = createTestUoM({ id: 'uom-1', name: 'Kilogramme' });
    mockUpdate.mockResolvedValue(updated);

    const res = await request(app())
      .put('/uom-1')
      .send({ name: 'Kilogramme', version: 1 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Kilogramme');
    expect(mockUpdate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'uom-1',
      expect.objectContaining({ name: 'Kilogramme' }),
    );
  });

  it('returns 404 when updating non-existent unit of measure', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockUpdate.mockRejectedValue(new NotFoundError('UnitOfMeasure', 'bad-id'));

    const res = await request(app())
      .put('/bad-id')
      .send({ name: 'Nope', version: 1 })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /:id  (soft delete)', () => {
  it('returns 204 with no body', async () => {
    mockRemove.mockResolvedValue(undefined);

    const res = await request(app())
      .delete('/uom-1')
      .expect(204);

    expect(res.body).toEqual({});
    expect(mockRemove).toHaveBeenCalledWith(TEST_TENANT_A, 'uom-1');
  });

  it('returns 404 when deleting non-existent unit of measure', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockRemove.mockRejectedValue(new NotFoundError('UnitOfMeasure', 'bad-id'));

    const res = await request(app())
      .delete('/bad-id')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(unitOfMeasureRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
