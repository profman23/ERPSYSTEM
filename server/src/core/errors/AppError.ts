/**
 * Enterprise Error Hierarchy
 *
 * All application errors extend AppError.
 * The global errorHandler middleware maps these to HTTP responses automatically.
 *
 * Usage:
 *   throw new NotFoundError('Role', roleId);
 *   throw new ForbiddenError('You cannot access this tenant');
 *   throw new ConflictError('Email already registered');
 *   throw new ValidationError('Invalid date range', [{ field: 'endDate', message: 'Must be after startDate' }]);
 */

export type ErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'TENANT_SUSPENDED'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>[];

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    details?: Record<string, unknown>[],
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── 404 ────────────────────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    const msg = id ? `${entity} with ID '${id}' not found` : `${entity} not found`;
    super(msg, 404, 'NOT_FOUND');
  }
}

// ─── 403 ────────────────────────────────────────────────────────────────────

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

// ─── 401 ────────────────────────────────────────────────────────────────────

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// ─── 409 ────────────────────────────────────────────────────────────────────

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

// ─── 400 ────────────────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(message: string, details?: { field: string; message: string }[]) {
    super(message, 400, 'VALIDATION_ERROR', details as Record<string, unknown>[]);
  }
}

// ─── 403 (Tenant-Specific) ──────────────────────────────────────────────────

export class TenantSuspendedError extends AppError {
  constructor(tenantId: string) {
    super('Tenant account is suspended. Contact support.', 403, 'TENANT_SUSPENDED', [
      { tenantId },
    ]);
  }
}

// ─── 429 ────────────────────────────────────────────────────────────────────

export class QuotaExceededError extends AppError {
  constructor(resource: string, limit: number) {
    super(`Quota exceeded for ${resource}. Limit: ${limit}`, 429, 'QUOTA_EXCEEDED', [
      { resource, limit },
    ]);
  }
}

// ─── 429 ────────────────────────────────────────────────────────────────────

export class RateLimitedError extends AppError {
  constructor(retryAfterSeconds?: number) {
    super('Too many requests. Please try again later.', 429, 'RATE_LIMITED',
      retryAfterSeconds ? [{ retryAfter: retryAfterSeconds }] : undefined
    );
  }
}

// ─── 503 ────────────────────────────────────────────────────────────────────

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(`Service temporarily unavailable: ${service}`, 503, 'SERVICE_UNAVAILABLE');
  }
}
