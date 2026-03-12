import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  ConflictError,
  ValidationError,
  TenantSuspendedError,
  QuotaExceededError,
  RateLimitedError,
  ServiceUnavailableError,
} from './AppError';

describe('AppError', () => {
  it('sets statusCode, code, message, and isOperational', () => {
    const err = new AppError('test', 500, 'INTERNAL_ERROR');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.message).toBe('test');
    expect(err.isOperational).toBe(true);
  });

  it('accepts optional details', () => {
    const details = [{ field: 'email', message: 'required' }];
    const err = new AppError('test', 400, 'VALIDATION_ERROR', details);
    expect(err.details).toEqual(details);
  });

  it('accepts messageKey and params for bilingual support', () => {
    const err = new AppError('test', 400, 'VALIDATION_ERROR', undefined, 'POSTING_PERIOD_CLOSED', { name: 'March' });
    expect(err.messageKey).toBe('POSTING_PERIOD_CLOSED');
    expect(err.params).toEqual({ name: 'March' });
  });

  it('messageKey and params are undefined when not provided', () => {
    const err = new AppError('test', 500, 'INTERNAL_ERROR');
    expect(err.messageKey).toBeUndefined();
    expect(err.params).toBeUndefined();
  });

  it('is an instance of Error', () => {
    const err = new AppError('test', 500, 'INTERNAL_ERROR');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('NotFoundError', () => {
  it('returns 404 with entity name', () => {
    const err = new NotFoundError('Species');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Species not found');
  });

  it('includes ID when provided', () => {
    const err = new NotFoundError('Species', 'abc-123');
    expect(err.message).toBe("Species with ID 'abc-123' not found");
  });

  it('is instanceof AppError', () => {
    expect(new NotFoundError('X')).toBeInstanceOf(AppError);
  });

  it('auto-populates ENTITY_NOT_FOUND messageKey without ID', () => {
    const err = new NotFoundError('Species');
    expect(err.messageKey).toBe('ENTITY_NOT_FOUND');
    expect(err.params).toEqual({ entity: 'Species' });
  });

  it('auto-populates ENTITY_NOT_FOUND_BY_ID messageKey with ID', () => {
    const err = new NotFoundError('Species', 'abc-123');
    expect(err.messageKey).toBe('ENTITY_NOT_FOUND_BY_ID');
    expect(err.params).toEqual({ entity: 'Species', id: 'abc-123' });
  });
});

describe('ForbiddenError', () => {
  it('returns 403 with default message', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toBe('You do not have permission to perform this action');
  });

  it('accepts custom message', () => {
    const err = new ForbiddenError('Custom forbidden');
    expect(err.message).toBe('Custom forbidden');
  });
});

describe('UnauthorizedError', () => {
  it('returns 401 with default message', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Authentication required');
  });
});

describe('ConflictError', () => {
  it('returns 409', () => {
    const err = new ConflictError('Email already exists');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toBe('Email already exists');
  });

  it('accepts messageKey and params for bilingual support', () => {
    const err = new ConflictError(
      "Species with code 'DOG' already exists",
      'ENTITY_CODE_EXISTS',
      { entity: 'Species', code: 'DOG' },
    );
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.messageKey).toBe('ENTITY_CODE_EXISTS');
    expect(err.params).toEqual({ entity: 'Species', code: 'DOG' });
  });

  it('messageKey is undefined when not provided (backward compat)', () => {
    const err = new ConflictError('simple conflict');
    expect(err.messageKey).toBeUndefined();
    expect(err.params).toBeUndefined();
  });
});

describe('ValidationError', () => {
  it('returns 400 with details', () => {
    const details = [{ field: 'name', message: 'Name is required' }];
    const err = new ValidationError('Invalid input', details);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual(details);
  });

  it('works without details', () => {
    const err = new ValidationError('Bad request');
    expect(err.details).toBeUndefined();
  });

  it('accepts messageKey and params for bilingual support', () => {
    const err = new ValidationError(
      'Posting period "March 2026" is CLOSED',
      undefined,
      'POSTING_PERIOD_CLOSED',
      { name: 'March 2026', status: 'CLOSED' },
    );
    expect(err.statusCode).toBe(400);
    expect(err.messageKey).toBe('POSTING_PERIOD_CLOSED');
    expect(err.params).toEqual({ name: 'March 2026', status: 'CLOSED' });
    expect(err.details).toBeUndefined();
  });

  it('supports both details and messageKey together', () => {
    const details = [{ field: 'lines', message: 'Mismatch' }];
    const err = new ValidationError('Debit/credit mismatch', details, 'JE_DEBIT_CREDIT_MISMATCH');
    expect(err.details).toEqual(details);
    expect(err.messageKey).toBe('JE_DEBIT_CREDIT_MISMATCH');
    expect(err.params).toBeUndefined();
  });
});

describe('TenantSuspendedError', () => {
  it('returns 403 with tenant ID in details', () => {
    const err = new TenantSuspendedError('tenant-123');
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('TENANT_SUSPENDED');
    expect(err.details).toEqual([{ tenantId: 'tenant-123' }]);
  });
});

describe('QuotaExceededError', () => {
  it('returns 429 with resource and limit', () => {
    const err = new QuotaExceededError('users', 100);
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('QUOTA_EXCEEDED');
    expect(err.message).toBe('Quota exceeded for users. Limit: 100');
    expect(err.details).toEqual([{ resource: 'users', limit: 100 }]);
  });
});

describe('RateLimitedError', () => {
  it('returns 429 with retry-after', () => {
    const err = new RateLimitedError(60);
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.details).toEqual([{ retryAfter: 60 }]);
  });

  it('works without retry-after', () => {
    const err = new RateLimitedError();
    expect(err.details).toBeUndefined();
  });
});

describe('ServiceUnavailableError', () => {
  it('returns 503 with service name', () => {
    const err = new ServiceUnavailableError('Redis');
    expect(err.statusCode).toBe(503);
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
    expect(err.message).toBe('Service temporarily unavailable: Redis');
  });
});
