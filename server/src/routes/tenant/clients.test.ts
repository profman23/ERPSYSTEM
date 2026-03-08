import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import clientsRouter from './clients';
import { TEST_TENANT_A } from '../../test/helpers';

// ─── Mock ClientService ─────────────────────────────────────────────────────

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../services/ClientService', () => ({
  ClientService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

// Mock PatientService (used by /:id/patients route)
vi.mock('../../services/PatientService', () => ({
  PatientService: {
    list: vi.fn(),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(clientsRouter, { tenantId: TEST_TENANT_A, ...options });
}

function createTestClient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cl-1',
    tenantId: TEST_TENANT_A,
    code: 'CLT-00001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: null,
    dateOfBirth: null,
    address: null,
    notes: null,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const sampleClient = createTestClient();

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [sampleClient],
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
      .get('/?search=john&page=2&limit=10')
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ search: 'john', page: 2, limit: 10 }),
    );
  });
});

describe('GET /:id  (get by ID)', () => {
  it('returns 200 with client data', async () => {
    mockGetById.mockResolvedValue(sampleClient);

    const res = await request(app()).get('/cl-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.firstName).toBe('John');
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'cl-1');
  });

  it('returns 404 when client not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('Client', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('POST /  (create)', () => {
  it('returns 201 with created client', async () => {
    const input = { firstName: 'Jane', lastName: 'Smith' };
    mockCreate.mockResolvedValue(createTestClient({ ...input, id: 'cl-2' }));

    const res = await request(app())
      .post('/')
      .send(input)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.firstName).toBe('Jane');
    expect(mockCreate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ firstName: 'Jane', lastName: 'Smith' }),
    );
  });

  it('returns 400 on invalid body (missing lastName)', async () => {
    const res = await request(app())
      .post('/')
      .send({ firstName: 'Jane' }) // missing required 'lastName'
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 on empty firstName', async () => {
    const res = await request(app())
      .post('/')
      .send({ firstName: '', lastName: 'Smith' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when client conflicts', async () => {
    const { ConflictError } = await import('../../core/errors/AppError');
    mockCreate.mockRejectedValue(
      new ConflictError('Client with this email already exists'),
    );

    const res = await request(app())
      .post('/')
      .send({ firstName: 'John', lastName: 'Doe', email: 'john@example.com' })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CONFLICT');
  });
});

describe('PUT /:id  (update)', () => {
  it('returns 200 with updated client', async () => {
    const updated = createTestClient({ id: 'cl-1', firstName: 'Johnny' });
    mockUpdate.mockResolvedValue(updated);

    const res = await request(app())
      .put('/cl-1')
      .send({ firstName: 'Johnny' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.firstName).toBe('Johnny');
    expect(mockUpdate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'cl-1',
      expect.objectContaining({ firstName: 'Johnny' }),
    );
  });

  it('returns 404 when updating non-existent client', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockUpdate.mockRejectedValue(new NotFoundError('Client', 'bad-id'));

    const res = await request(app())
      .put('/bad-id')
      .send({ firstName: 'Nope' })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /:id  (soft delete)', () => {
  it('returns 204 with no body', async () => {
    mockRemove.mockResolvedValue(undefined);

    const res = await request(app())
      .delete('/cl-1')
      .expect(204);

    expect(res.body).toEqual({});
    expect(mockRemove).toHaveBeenCalledWith(TEST_TENANT_A, 'cl-1');
  });

  it('returns 404 when deleting non-existent client', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockRemove.mockRejectedValue(new NotFoundError('Client', 'bad-id'));

    const res = await request(app())
      .delete('/bad-id')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(clientsRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
