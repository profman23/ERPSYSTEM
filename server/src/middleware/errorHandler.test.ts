import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { errorHandler } from './errorHandler';
import { ConflictError, NotFoundError, ValidationError } from '../core/errors/AppError';

// Mock logger to suppress output
vi.mock('../config/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

function createMockReqRes() {
  const req = { path: '/test', method: 'POST', ip: '127.0.0.1' } as Request;
  const jsonFn = vi.fn();
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  const res = { status: statusFn } as unknown as Response;
  const next = vi.fn();
  return { req, res, next, statusFn, jsonFn };
}

describe('errorHandler', () => {
  it('includes messageKey and params in response for AppError with bilingual data', () => {
    const { req, res, next, statusFn, jsonFn } = createMockReqRes();
    const err = new ValidationError(
      'Posting period "March 2026" is CLOSED',
      undefined,
      'POSTING_PERIOD_CLOSED',
      { name: 'March 2026', status: 'CLOSED' },
    );
    errorHandler(err, req, res, next);
    expect(statusFn).toHaveBeenCalledWith(400);
    const body = jsonFn.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error).toBe('Posting period "March 2026" is CLOSED');
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.messageKey).toBe('POSTING_PERIOD_CLOSED');
    expect(body.params).toEqual({ name: 'March 2026', status: 'CLOSED' });
  });

  it('excludes messageKey and params when not provided (legacy AppError)', () => {
    const { req, res, next, jsonFn } = createMockReqRes();
    const err = new ConflictError('Simple conflict');
    errorHandler(err, req, res, next);
    const body = jsonFn.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error).toBe('Simple conflict');
    expect(body.code).toBe('CONFLICT');
    expect(body.messageKey).toBeUndefined();
    expect(body.params).toBeUndefined();
  });

  it('passes NotFoundError with auto-populated messageKey and params', () => {
    const { req, res, next, statusFn, jsonFn } = createMockReqRes();
    const err = new NotFoundError('Species', 'abc-123');
    errorHandler(err, req, res, next);
    expect(statusFn).toHaveBeenCalledWith(404);
    const body = jsonFn.mock.calls[0][0];
    expect(body.messageKey).toBe('ENTITY_NOT_FOUND_BY_ID');
    expect(body.params).toEqual({ entity: 'Species', id: 'abc-123' });
  });

  it('handles unknown errors without messageKey or params', () => {
    const { req, res, next, statusFn, jsonFn } = createMockReqRes();
    const err = new Error('Something unexpected');
    errorHandler(err, req, res, next);
    expect(statusFn).toHaveBeenCalledWith(500);
    const body = jsonFn.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.messageKey).toBeUndefined();
    expect(body.params).toBeUndefined();
  });

  it('includes ConflictError messageKey for entity code exists', () => {
    const { req, res, next, jsonFn } = createMockReqRes();
    const err = new ConflictError(
      "Species with code 'DOG' already exists",
      'ENTITY_CODE_EXISTS',
      { entity: 'Species', code: 'DOG' },
    );
    errorHandler(err, req, res, next);
    const body = jsonFn.mock.calls[0][0];
    expect(body.messageKey).toBe('ENTITY_CODE_EXISTS');
    expect(body.params).toEqual({ entity: 'Species', code: 'DOG' });
  });
});
