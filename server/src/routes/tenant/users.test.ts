import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import usersRouter from './users';
import { TEST_TENANT_A } from '../../test/helpers';

// ─── Mock UserService ───────────────────────────────────────────────────────

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockUpdate = vi.fn();
const mockToggleStatus = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../services/UserService', () => ({
  UserService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    toggleStatus: (...args: unknown[]) => mockToggleStatus(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(usersRouter, { tenantId: TEST_TENANT_A, ...options });
}

function createTestUserRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'usr-1',
    tenantId: TEST_TENANT_A,
    email: 'doctor@example.com',
    firstName: 'Alice',
    lastName: 'Smith',
    name: 'Alice Smith',
    phone: null,
    role: 'veterinarian',
    accessScope: 'branch',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const sampleUser = createTestUserRecord();

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [sampleUser],
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
      .get('/?search=alice&page=2&limit=10')
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ search: 'alice', page: 2, limit: 10 }),
    );
  });
});

describe('GET /:id  (get by ID)', () => {
  it('returns 200 with user data', async () => {
    mockGetById.mockResolvedValue(sampleUser);

    const res = await request(app()).get('/usr-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('doctor@example.com');
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'usr-1');
  });

  it('returns 404 when user not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('User', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('PUT /:id  (update)', () => {
  it('returns 200 with updated user', async () => {
    const updated = createTestUserRecord({ id: 'usr-1', firstName: 'Alicia' });
    mockUpdate.mockResolvedValue(updated);

    const res = await request(app())
      .put('/usr-1')
      .send({ firstName: 'Alicia' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.firstName).toBe('Alicia');
    expect(mockUpdate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'usr-1',
      expect.objectContaining({ firstName: 'Alicia' }),
    );
  });

  it('returns 404 when updating non-existent user', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockUpdate.mockRejectedValue(new NotFoundError('User', 'bad-id'));

    const res = await request(app())
      .put('/bad-id')
      .send({ firstName: 'Nope' })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('returns 400 on invalid role value', async () => {
    const res = await request(app())
      .put('/usr-1')
      .send({ role: 'superking' }) // not in enum
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('PATCH /:id/status  (toggle status)', () => {
  it('returns 200 when toggling status', async () => {
    const deactivated = createTestUserRecord({ id: 'usr-1', isActive: false });
    mockToggleStatus.mockResolvedValue(deactivated);

    const res = await request(app())
      .patch('/usr-1/status')
      .send({ isActive: false })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isActive).toBe(false);
    expect(mockToggleStatus).toHaveBeenCalledWith(TEST_TENANT_A, 'usr-1', false);
  });

  it('returns 404 when toggling non-existent user', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockToggleStatus.mockRejectedValue(new NotFoundError('User', 'bad-id'));

    const res = await request(app())
      .patch('/bad-id/status')
      .send({ isActive: false })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /:id  (soft delete)', () => {
  it('returns 204 with no body', async () => {
    mockRemove.mockResolvedValue(undefined);

    const res = await request(app())
      .delete('/usr-1')
      .expect(204);

    expect(res.body).toEqual({});
    expect(mockRemove).toHaveBeenCalledWith(TEST_TENANT_A, 'usr-1');
  });

  it('returns 404 when deleting non-existent user', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockRemove.mockRejectedValue(new NotFoundError('User', 'bad-id'));

    const res = await request(app())
      .delete('/bad-id')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(usersRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
