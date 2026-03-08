import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import businessLinesRouter from './businessLines';
import { TEST_TENANT_A } from '../../test/helpers';

// ─── Mock BusinessLineService ───────────────────────────────────────────────

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../services/BusinessLineService', () => ({
  BusinessLineService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(businessLinesRouter, { tenantId: TEST_TENANT_A, ...options });
}

function createTestBusinessLine(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bl-1',
    tenantId: TEST_TENANT_A,
    code: 'VET_CLINIC',
    name: 'Veterinary Clinic',
    businessLineType: null,
    description: null,
    contactEmail: null,
    contactPhone: null,
    logoUrl: null,
    primaryColor: null,
    secondaryColor: null,
    accentColor: null,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const sampleBL = createTestBusinessLine();

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [sampleBL],
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
      .get('/?search=vet&page=2&limit=10')
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ search: 'vet', page: 2, limit: 10 }),
    );
  });
});

describe('GET /:id  (get by ID)', () => {
  it('returns 200 with business line data', async () => {
    mockGetById.mockResolvedValue(sampleBL);

    const res = await request(app()).get('/bl-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('VET_CLINIC');
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'bl-1');
  });

  it('returns 404 when business line not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('BusinessLine', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('POST /  (create)', () => {
  it('returns 201 with created business line', async () => {
    const input = { code: 'PET_SHOP', name: 'Pet Shop' };
    mockCreate.mockResolvedValue(createTestBusinessLine({ ...input, id: 'bl-2' }));

    const res = await request(app())
      .post('/')
      .send(input)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('PET_SHOP');
    expect(mockCreate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ code: 'PET_SHOP', name: 'Pet Shop' }),
    );
  });

  it('returns 400 on invalid body (missing name)', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: 'PET_SHOP' }) // missing required 'name' (min 2 chars)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid code format', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: 'a', name: 'Pet Shop' }) // code min 2 chars, must be uppercase
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when code already exists', async () => {
    const { ConflictError } = await import('../../core/errors/AppError');
    mockCreate.mockRejectedValue(
      new ConflictError("BusinessLine with code 'VET_CLINIC' already exists"),
    );

    const res = await request(app())
      .post('/')
      .send({ code: 'VET_CLINIC', name: 'Veterinary Clinic' })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CONFLICT');
  });
});

describe('PUT /:id  (update)', () => {
  it('returns 200 with updated business line', async () => {
    const updated = createTestBusinessLine({ id: 'bl-1', name: 'Updated Clinic' });
    mockUpdate.mockResolvedValue(updated);

    const res = await request(app())
      .put('/bl-1')
      .send({ name: 'Updated Clinic' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Clinic');
    expect(mockUpdate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'bl-1',
      expect.objectContaining({ name: 'Updated Clinic' }),
    );
  });

  it('returns 404 when updating non-existent business line', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockUpdate.mockRejectedValue(new NotFoundError('BusinessLine', 'bad-id'));

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
      .delete('/bl-1')
      .expect(204);

    expect(res.body).toEqual({});
    expect(mockRemove).toHaveBeenCalledWith(TEST_TENANT_A, 'bl-1');
  });

  it('returns 404 when deleting non-existent business line', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockRemove.mockRejectedValue(new NotFoundError('BusinessLine', 'bad-id'));

    const res = await request(app())
      .delete('/bad-id')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(businessLinesRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
