import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import itemGroupRouter from './itemGroups';
import { TEST_TENANT_A } from '../../test/helpers';

// ─── Mock ItemGroupService ──────────────────────────────────────────────────

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../services/ItemGroupService', () => ({
  ItemGroupService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(itemGroupRouter, { tenantId: TEST_TENANT_A, ...options });
}

function createTestItemGroup(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ig-1',
    tenantId: TEST_TENANT_A,
    code: 'MED',
    name: 'Medicine',
    itemGroupType: 'MEDICINE',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const sampleItemGroup = createTestItemGroup();

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [sampleItemGroup],
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
      .get('/?search=med&page=2&limit=10')
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ search: 'med', page: 2, limit: 10 }),
    );
  });
});

describe('GET /:id  (get by ID)', () => {
  it('returns 200 with item group data', async () => {
    mockGetById.mockResolvedValue(sampleItemGroup);

    const res = await request(app()).get('/ig-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('MED');
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'ig-1');
  });

  it('returns 404 when item group not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('ItemGroup', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('POST /  (create)', () => {
  it('returns 201 with created item group', async () => {
    const input = {
      code: 'SURG',
      name: 'Surgical Supply',
      itemGroupType: 'SURGICAL_SUPPLY',
    };
    mockCreate.mockResolvedValue(createTestItemGroup({ ...input, id: 'ig-2' }));

    const res = await request(app())
      .post('/')
      .send(input)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('SURG');
    expect(mockCreate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ code: 'SURG', name: 'Surgical Supply' }),
    );
  });

  it('returns 400 on invalid body (missing itemGroupType)', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: 'IG1', name: 'Test' }) // missing required itemGroupType
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 on empty code', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: '', name: 'Test', itemGroupType: 'MEDICINE' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when code already exists', async () => {
    const { ConflictError } = await import('../../core/errors/AppError');
    mockCreate.mockRejectedValue(
      new ConflictError("Item group with code 'MED' already exists"),
    );

    const res = await request(app())
      .post('/')
      .send({ code: 'MED', name: 'Medicine', itemGroupType: 'MEDICINE' })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CONFLICT');
  });
});

describe('PUT /:id  (update)', () => {
  it('returns 200 with updated item group', async () => {
    const updated = createTestItemGroup({ id: 'ig-1', name: 'Updated Medicine' });
    mockUpdate.mockResolvedValue(updated);

    const res = await request(app())
      .put('/ig-1')
      .send({ name: 'Updated Medicine' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Medicine');
    expect(mockUpdate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'ig-1',
      expect.objectContaining({ name: 'Updated Medicine' }),
    );
  });

  it('returns 404 when updating non-existent item group', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockUpdate.mockRejectedValue(new NotFoundError('ItemGroup', 'bad-id'));

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
      .delete('/ig-1')
      .expect(204);

    expect(res.body).toEqual({});
    expect(mockRemove).toHaveBeenCalledWith(TEST_TENANT_A, 'ig-1');
  });

  it('returns 404 when deleting non-existent item group', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockRemove.mockRejectedValue(new NotFoundError('ItemGroup', 'bad-id'));

    const res = await request(app())
      .delete('/bad-id')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(itemGroupRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
