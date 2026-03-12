/**
 * Enterprise Error Hierarchy
 *
 * All application errors extend AppError.
 * The global errorHandler middleware maps these to HTTP responses automatically.
 *
 * Bilingual support:
 *   - `message` = English fallback (always present)
 *   - `messageKey` = i18n lookup key for frontend translation (optional)
 *   - `params` = interpolation values for the translated template (optional)
 *
 * Usage:
 *   throw new NotFoundError('Role', roleId);
 *   throw new ConflictError('Species with code ... already exists', 'ENTITY_CODE_EXISTS', { entity: 'Species', code });
 *   throw new ValidationError('Posting period is CLOSED', undefined, 'POSTING_PERIOD_CLOSED', { name, status });
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

/**
 * Specific i18n error codes for frontend translation.
 * Frontend maps these to `errors.api.${messageKey}` in translation files.
 * Adding a new language = adding translation file only (zero backend changes).
 */
export type MessageErrorCode =
  // Entity CRUD (reusable across ALL entities)
  | 'ENTITY_CODE_EXISTS'                 // params: { entity, code }
  | 'ENTITY_EMAIL_EXISTS'               // params: { entity, email }
  | 'ENTITY_BARCODE_EXISTS'             // params: { barcode }
  | 'ENTITY_NOT_FOUND'                  // params: { entity }
  | 'ENTITY_NOT_FOUND_BY_ID'            // params: { entity, id }
  | 'ENTITY_YEAR_EXISTS'                // params: { year }
  | 'OPTIMISTIC_LOCK_CONFLICT'          // no params
  // Chart of Accounts
  | 'ACCOUNT_POSTABLE_HAS_CHILDREN'
  | 'ACCOUNT_TYPE_MISMATCH'             // params: { childType, parentType }
  | 'ACCOUNT_MAKE_POSTABLE_HAS_CHILDREN'
  | 'ACCOUNT_MOVE_SELF'
  | 'ACCOUNT_MOVE_DESCENDANT'
  | 'ACCOUNT_MOVE_POSTABLE_PARENT'
  | 'ACCOUNT_DELETE_HAS_CHILDREN'
  | 'ACCOUNT_DELETE_SYSTEM_TEMPLATE'
  | 'ACCOUNT_INACTIVE'                  // params: { code }
  | 'ACCOUNT_NOT_POSTABLE'              // params: { code }
  | 'ACCOUNT_NOT_FOUND'                 // params: { id }
  // Journal Entries
  | 'JE_DEBIT_CREDIT_MISMATCH'
  | 'JE_ONLY_POSTED_REVERSIBLE'
  | 'JE_ALREADY_REVERSED'
  | 'JE_NO_LINES'
  // Posting Periods
  | 'POSTING_PERIOD_NOT_FOUND'
  | 'POSTING_PERIOD_CLOSED'             // params: { name, status }
  | 'POSTING_PERIOD_DISABLED'           // params: { name }
  | 'POSTING_PERIOD_LOCKED'
  // Warehouse
  | 'WAREHOUSE_LAST_IN_BRANCH'
  | 'WAREHOUSE_DELETE_DEFAULT'
  | 'WAREHOUSE_DEACTIVATE_DEFAULT'
  // Tax
  | 'TAX_EXEMPT_RATE_NONZERO'
  | 'TAX_ACCOUNT_NOT_FOUND'             // params: { label }
  | 'TAX_ACCOUNT_INACTIVE'              // params: { label }
  | 'TAX_ACCOUNT_NOT_POSTABLE'          // params: { label }
  // Roles
  | 'ROLE_PROTECTED'
  | 'ROLE_SYSTEM_DELETE'
  | 'ROLE_HAS_USERS';                   // params: { count }

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>[];
  public readonly messageKey?: MessageErrorCode;
  public readonly params?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    details?: Record<string, unknown>[],
    messageKey?: MessageErrorCode,
    params?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    this.messageKey = messageKey;
    this.params = params;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── 404 ────────────────────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    const msg = id ? `${entity} with ID '${id}' not found` : `${entity} not found`;
    const key: MessageErrorCode = id ? 'ENTITY_NOT_FOUND_BY_ID' : 'ENTITY_NOT_FOUND';
    super(msg, 404, 'NOT_FOUND', undefined, key, { entity, ...(id && { id }) });
  }
}

// ─── 403 ────────────────────────────────────────────────────────────────────

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action', messageKey?: MessageErrorCode, params?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', undefined, messageKey, params);
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
  constructor(message: string, messageKey?: MessageErrorCode, params?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', undefined, messageKey, params);
  }
}

// ─── 400 ────────────────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(
    message: string,
    details?: { field: string; message: string }[],
    messageKey?: MessageErrorCode,
    params?: Record<string, unknown>,
  ) {
    super(message, 400, 'VALIDATION_ERROR', details as Record<string, unknown>[], messageKey, params);
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
