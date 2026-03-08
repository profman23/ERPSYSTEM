import { describe, it, expect, vi } from 'vitest';
import { ApiResponse } from './ApiResponse';

function createMockRes() {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res as any;
}

describe('ApiResponse.success', () => {
  it('returns 200 with { success: true, data }', () => {
    const res = createMockRes();
    ApiResponse.success(res, { id: '1', name: 'Dog' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: '1', name: 'Dog' },
    });
  });

  it('includes message when provided', () => {
    const res = createMockRes();
    ApiResponse.success(res, { id: '1' }, 'Created successfully');

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: '1' },
      message: 'Created successfully',
    });
  });
});

describe('ApiResponse.created', () => {
  it('returns 201', () => {
    const res = createMockRes();
    ApiResponse.created(res, { id: '1' });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: '1' },
    });
  });
});

describe('ApiResponse.paginated', () => {
  it('returns correct pagination metadata', () => {
    const res = createMockRes();
    const items = [{ id: '1' }, { id: '2' }];
    ApiResponse.paginated(res, items, 50, 1, 20);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        data: items,
        pagination: {
          page: 1,
          limit: 20,
          total: 50,
          totalPages: 3,
          hasNext: true,
          hasPrev: false,
        },
      },
    });
  });

  it('calculates hasNext=false on last page', () => {
    const res = createMockRes();
    ApiResponse.paginated(res, [{ id: '1' }], 3, 2, 2);

    const body = (res.json as any).mock.calls[0][0];
    expect(body.data.pagination.hasNext).toBe(false);
    expect(body.data.pagination.hasPrev).toBe(true);
    expect(body.data.pagination.totalPages).toBe(2);
  });

  it('handles empty results', () => {
    const res = createMockRes();
    ApiResponse.paginated(res, [], 0, 1, 20);

    const body = (res.json as any).mock.calls[0][0];
    expect(body.data.data).toEqual([]);
    expect(body.data.pagination.total).toBe(0);
    expect(body.data.pagination.totalPages).toBe(0);
    expect(body.data.pagination.hasNext).toBe(false);
    expect(body.data.pagination.hasPrev).toBe(false);
  });
});

describe('ApiResponse.noContent', () => {
  it('returns 204 with no body', () => {
    const res = createMockRes();
    ApiResponse.noContent(res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('ApiResponse.error', () => {
  it('returns error response with code and details', () => {
    const res = createMockRes();
    const details = [{ field: 'name', message: 'required' }];
    ApiResponse.error(res, 400, 'Validation failed', 'VALIDATION_ERROR', details);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details,
    });
  });

  it('omits code and details when not provided', () => {
    const res = createMockRes();
    ApiResponse.error(res, 500, 'Internal error');

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal error',
    });
  });
});
