import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import branchRouter from './branches';
import { TEST_TENANT_A } from '../../test/helpers';

// ─── Mock BranchService ─────────────────────────────────────────────────────

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../services/BranchService', () => ({
  BranchService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(branchRouter, { tenantId: TEST_TENANT_A, ...options });
}

function createTestBranch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'br-1',
    tenantId: TEST_TENANT_A,
    businessLineId: '00000000-0000-0000-0000-000000000050',
    code: 'BR-001',
    name: 'Main Branch',
    country: 'SA',
    city: 'Riyadh',
    address: '123 Main St',
    buildingNumber: '10',
    vatRegistrationNumber: 'VAT123456',
    commercialRegistrationNumber: 'CR123456',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const sampleBranch = createTestBranch();

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [sampleBranch],
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
      .get('/?search=main&page=2&limit=10')
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ search: 'main', page: 2, limit: 10 }),
    );
  });
});

describe('GET /:id  (get by ID)', () => {
  it('returns 200 with branch data', async () => {
    mockGetById.mockResolvedValue(sampleBranch);

    const res = await request(app()).get('/br-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Main Branch');
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'br-1');
  });

  it('returns 404 when branch not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('Branch', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('POST /  (create)', () => {
  it('returns 201 with created branch', async () => {
    const input = {
      businessLineId: '00000000-0000-0000-0000-000000000050',
      name: 'New Branch',
      country: 'SA',
      city: 'Jeddah',
      address: '456 Side St',
      buildingNumber: '20',
      vatRegistrationNumber: 'VAT789012',
      commercialRegistrationNumber: 'CR789012',
    };
    mockCreate.mockResolvedValue(createTestBranch({ ...input, id: 'br-2' }));

    const res = await request(app())
      .post('/')
      .send(input)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('New Branch');
    expect(mockCreate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ name: 'New Branch', city: 'Jeddah' }),
    );
  });

  it('returns 400 on invalid body (missing required fields)', async () => {
    const res = await request(app())
      .post('/')
      .send({ name: 'Incomplete Branch' }) // missing businessLineId, country, city, address, etc.
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 on short name', async () => {
    const res = await request(app())
      .post('/')
      .send({
        businessLineId: '00000000-0000-0000-0000-000000000050',
        name: 'X', // min 2 chars
        country: 'SA',
        city: 'Riyadh',
        address: '123 St',
        buildingNumber: '10',
        vatRegistrationNumber: 'VAT123',
        commercialRegistrationNumber: 'CR123',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when branch already exists', async () => {
    const { ConflictError } = await import('../../core/errors/AppError');
    mockCreate.mockRejectedValue(
      new ConflictError("Branch 'Main Branch' already exists"),
    );

    const res = await request(app())
      .post('/')
      .send({
        businessLineId: '00000000-0000-0000-0000-000000000050',
        name: 'Main Branch',
        country: 'SA',
        city: 'Riyadh',
        address: '123 Main St',
        buildingNumber: '10',
        vatRegistrationNumber: 'VAT123456',
        commercialRegistrationNumber: 'CR123456',
      })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CONFLICT');
  });
});

describe('PUT /:id  (update)', () => {
  it('returns 200 with updated branch', async () => {
    const updated = createTestBranch({ id: 'br-1', name: 'Updated Branch' });
    mockUpdate.mockResolvedValue(updated);

    const res = await request(app())
      .put('/br-1')
      .send({ name: 'Updated Branch' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Branch');
    expect(mockUpdate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'br-1',
      expect.objectContaining({ name: 'Updated Branch' }),
    );
  });

  it('returns 404 when updating non-existent branch', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockUpdate.mockRejectedValue(new NotFoundError('Branch', 'bad-id'));

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
      .delete('/br-1')
      .expect(204);

    expect(res.body).toEqual({});
    expect(mockRemove).toHaveBeenCalledWith(TEST_TENANT_A, 'br-1');
  });

  it('returns 404 when deleting non-existent branch', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockRemove.mockRejectedValue(new NotFoundError('Branch', 'bad-id'));

    const res = await request(app())
      .delete('/bad-id')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(branchRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
