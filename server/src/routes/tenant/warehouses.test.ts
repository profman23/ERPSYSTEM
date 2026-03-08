import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import warehouseRouter from './warehouses';
import { TEST_TENANT_A } from '../../test/helpers';

// ─── Mock WarehouseService ──────────────────────────────────────────────────

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../services/WarehouseService', () => ({
  WarehouseService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(warehouseRouter, { tenantId: TEST_TENANT_A, ...options });
}

function createTestWarehouse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wh-1',
    tenantId: TEST_TENANT_A,
    branchId: '00000000-0000-0000-0000-000000000100',
    code: 'WH-MAIN',
    name: 'Main Warehouse',
    warehouseType: 'STANDARD',
    isDefault: false,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const sampleWarehouse = createTestWarehouse();

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [sampleWarehouse],
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
      .get('/?search=cold&page=2&limit=10')
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ search: 'cold', page: 2, limit: 10 }),
    );
  });
});

describe('GET /:id  (get by ID)', () => {
  it('returns 200 with warehouse data', async () => {
    mockGetById.mockResolvedValue(sampleWarehouse);

    const res = await request(app()).get('/wh-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('WH-MAIN');
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'wh-1');
  });

  it('returns 404 when warehouse not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('Warehouse', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('POST /  (create)', () => {
  it('returns 201 with created warehouse', async () => {
    const input = {
      branchId: '00000000-0000-0000-0000-000000000100',
      code: 'WH-NEW',
      name: 'New Warehouse',
    };
    mockCreate.mockResolvedValue(createTestWarehouse({ ...input, id: 'wh-2' }));

    const res = await request(app())
      .post('/')
      .send(input)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('WH-NEW');
    expect(mockCreate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ code: 'WH-NEW', name: 'New Warehouse' }),
    );
  });

  it('returns 400 on invalid body (missing name)', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: 'WH-X', branchId: '00000000-0000-0000-0000-000000000100' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 on missing branchId', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: 'WH-X', name: 'Test' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when code already exists', async () => {
    const { ConflictError } = await import('../../core/errors/AppError');
    mockCreate.mockRejectedValue(
      new ConflictError("Warehouse with code 'WH-MAIN' already exists"),
    );

    const res = await request(app())
      .post('/')
      .send({
        branchId: '00000000-0000-0000-0000-000000000100',
        code: 'WH-MAIN',
        name: 'Main Warehouse',
      })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CONFLICT');
  });
});

describe('PUT /:id  (update)', () => {
  it('returns 200 with updated warehouse', async () => {
    const updated = createTestWarehouse({ id: 'wh-1', name: 'Updated Warehouse' });
    mockUpdate.mockResolvedValue(updated);

    const res = await request(app())
      .put('/wh-1')
      .send({ name: 'Updated Warehouse' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Warehouse');
    expect(mockUpdate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'wh-1',
      expect.objectContaining({ name: 'Updated Warehouse' }),
    );
  });

  it('returns 404 when updating non-existent warehouse', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockUpdate.mockRejectedValue(new NotFoundError('Warehouse', 'bad-id'));

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
      .delete('/wh-1')
      .expect(204);

    expect(res.body).toEqual({});
    expect(mockRemove).toHaveBeenCalledWith(TEST_TENANT_A, 'wh-1');
  });

  it('returns 404 when deleting non-existent warehouse', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockRemove.mockRejectedValue(new NotFoundError('Warehouse', 'bad-id'));

    const res = await request(app())
      .delete('/bad-id')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(warehouseRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
