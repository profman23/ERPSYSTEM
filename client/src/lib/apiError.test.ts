import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { extractApiError, formatFieldErrors } from './apiError';

// Mock i18n — must be before module import
vi.mock('@/i18n/config/i18n', () => {
  const translations: Record<string, string> = {
    // Generic category codes
    'errors.api.VALIDATION_ERROR': 'Please check the form and fix the highlighted errors',
    'errors.api.NOT_FOUND': 'The requested resource was not found',
    'errors.api.CONFLICT': 'A record with this information already exists',
    'errors.api.QUOTA_EXCEEDED': 'You have reached your subscription plan limit',
    'errors.api.RATE_LIMITED': 'Too many requests. Please wait a moment and try again.',
    'errors.api.FORBIDDEN': 'You do not have permission for this action',
    'errors.api.UNAUTHORIZED': 'Your session has expired. Please log in again.',
    'errors.api.TENANT_SUSPENDED': 'Your account has been suspended. Please contact support.',
    'errors.api.SERVICE_UNAVAILABLE': 'Service is temporarily unavailable. Please try again later.',
    'errors.api.NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection.',
    'errors.api.UNKNOWN': 'An unexpected error occurred. Please try again.',
    // Specific messageKey codes (with interpolation)
    'errors.api.ENTITY_CODE_EXISTS': '{{entity}} with code \'{{code}}\' already exists',
    'errors.api.ENTITY_NOT_FOUND': '{{entity}} not found',
    'errors.api.ENTITY_NOT_FOUND_BY_ID': '{{entity}} with ID \'{{id}}\' not found',
    'errors.api.POSTING_PERIOD_CLOSED': 'Posting period "{{name}}" is {{status}}. Cannot post to a {{status}} period.',
    'errors.api.OPTIMISTIC_LOCK_CONFLICT': 'Record was modified by another user. Please refresh and try again.',
    'errors.api.JE_DEBIT_CREDIT_MISMATCH': 'Total debit must equal total credit',
    // Entity translations
    'entities.Species': 'Species',
  };
  return {
    default: {
      t: (key: string, opts?: Record<string, unknown>) => {
        let template = translations[key];
        if (!template) return opts?.defaultValue || '';
        // Simple interpolation for {{param}}
        if (opts) {
          for (const [k, v] of Object.entries(opts)) {
            if (k === 'defaultValue') continue;
            template = template.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
          }
        }
        return template;
      },
    },
  };
});

/**
 * Helper to create a mock AxiosError with typed response data.
 */
function makeAxiosError(
  status: number,
  data: Record<string, unknown>,
): AxiosError {
  const headers = new AxiosHeaders();
  const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: 'Error',
    data,
    headers,
    config: { headers },
  });
  return error;
}

function makeNetworkError(): AxiosError {
  const error = new AxiosError('Network Error', 'ERR_NETWORK');
  error.response = undefined;
  return error;
}

describe('extractApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── messageKey + params (new bilingual system) ──────────────────────────

  it('returns localized message when messageKey + params are present', () => {
    const err = makeAxiosError(400, {
      success: false,
      error: 'Posting period "March 2026" is CLOSED. Cannot post to a CLOSED period.',
      code: 'VALIDATION_ERROR',
      messageKey: 'POSTING_PERIOD_CLOSED',
      params: { name: 'March 2026', status: 'CLOSED' },
    });
    const result = extractApiError(err);
    expect(result.message).toBe('Posting period "March 2026" is CLOSED. Cannot post to a CLOSED period.');
    expect(result.messageKey).toBe('POSTING_PERIOD_CLOSED');
    expect(result.params).toEqual({ name: 'March 2026', status: 'CLOSED' });
    expect(result.code).toBe('VALIDATION_ERROR');
  });

  it('returns localized message with entity name translation', () => {
    const err = makeAxiosError(409, {
      success: false,
      error: "Species with code 'DOG' already exists",
      code: 'CONFLICT',
      messageKey: 'ENTITY_CODE_EXISTS',
      params: { entity: 'Species', code: 'DOG' },
    });
    const result = extractApiError(err);
    expect(result.message).toBe("Species with code 'DOG' already exists");
    expect(result.messageKey).toBe('ENTITY_CODE_EXISTS');
  });

  it('falls back to data.error when messageKey has no i18n translation', () => {
    const err = makeAxiosError(400, {
      success: false,
      error: 'Some custom backend error',
      code: 'VALIDATION_ERROR',
      messageKey: 'SOME_UNKNOWN_KEY',
      params: {},
    });
    const result = extractApiError(err);
    // SOME_UNKNOWN_KEY not in translations → falls to code VALIDATION_ERROR i18n
    expect(result.message).toBe('Please check the form and fix the highlighted errors');
  });

  it('returns messageKey and params in result for downstream use', () => {
    const err = makeAxiosError(409, {
      success: false,
      error: 'Duplicate',
      code: 'CONFLICT',
      messageKey: 'ENTITY_CODE_EXISTS',
      params: { entity: 'Breed', code: 'LAB' },
    });
    const result = extractApiError(err);
    expect(result.messageKey).toBe('ENTITY_CODE_EXISTS');
    expect(result.params).toEqual({ entity: 'Breed', code: 'LAB' });
  });

  it('uses messageKey for validation errors with details', () => {
    const err = makeAxiosError(400, {
      success: false,
      error: 'Total debit must equal total credit',
      code: 'VALIDATION_ERROR',
      messageKey: 'JE_DEBIT_CREDIT_MISMATCH',
      details: [
        { field: 'lines', message: 'Debit/credit mismatch' },
      ],
    });
    const result = extractApiError(err);
    expect(result.message).toBe('Total debit must equal total credit');
    expect(result.fieldErrors).toEqual({ lines: 'Debit/credit mismatch' });
  });

  // ─── Legacy behavior (no messageKey) ─────────────────────────────────────

  it('uses i18n code translation when no messageKey (legacy with known code)', () => {
    const err = makeAxiosError(409, {
      success: false,
      error: 'Species with code "DOG" already exists for this tenant',
      code: 'CONFLICT',
    });
    const result = extractApiError(err);
    // No messageKey → getLocalizedMessage tries code 'CONFLICT' → finds i18n
    expect(result.message).toBe('A record with this information already exists');
  });

  it('returns i18n fallback when validation has details but no data.error', () => {
    const err = makeAxiosError(400, {
      success: false,
      details: [
        { field: 'email', message: 'Invalid email format' },
      ],
    });
    const result = extractApiError(err);
    expect(result.message).toBe('Please check the form and fix the highlighted errors');
    expect(result.fieldErrors).toEqual({ email: 'Invalid email format' });
    expect(result.code).toBe('VALIDATION_ERROR');
  });

  // ─── Network + generic errors ────────────────────────────────────────────

  it('returns NETWORK_ERROR for network errors with no response', () => {
    const err = makeNetworkError();
    const result = extractApiError(err);
    expect(result.message).toBe('Unable to connect to the server. Please check your internet connection.');
    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.fieldErrors).toEqual({});
    expect(result.statusCode).toBeUndefined();
  });

  it('returns error.message for generic JS errors', () => {
    const err = new Error('Something went wrong in the app');
    const result = extractApiError(err);
    expect(result.message).toBe('Something went wrong in the app');
    expect(result.fieldErrors).toEqual({});
    expect(result.code).toBeUndefined();
  });

  it('returns UNKNOWN fallback for non-Error thrown values', () => {
    const result = extractApiError('some string error');
    expect(result.message).toBe('An unexpected error occurred. Please try again.');
    expect(result.fieldErrors).toEqual({});
  });

  it('handles null error gracefully', () => {
    const result = extractApiError(null);
    expect(result.message).toBe('An unexpected error occurred. Please try again.');
    expect(result.fieldErrors).toEqual({});
  });

  // ─── Field error extraction ──────────────────────────────────────────────

  it('extracts field errors from detail.path when field is not present', () => {
    const err = makeAxiosError(400, {
      success: false,
      error: 'Validation failed',
      details: [
        { path: ['address', 'city'], message: 'City is required' },
        { field: 'name', message: 'Name too short' },
        { message: 'Unknown field error' },
      ],
    });
    const result = extractApiError(err);
    expect(result.fieldErrors).toEqual({
      'address.city': 'City is required',
      name: 'Name too short',
      unknown: 'Unknown field error',
    });
  });

  it('passes through HTTP status code', () => {
    const err = makeAxiosError(409, {
      success: false,
      error: 'Tenant code already exists',
      code: 'CONFLICT',
    });
    const result = extractApiError(err);
    expect(result.statusCode).toBe(409);
    expect(result.code).toBe('CONFLICT');
  });

  it('returns UNKNOWN fallback when backend sends empty error response', () => {
    const err = makeAxiosError(500, {
      success: false,
    });
    const result = extractApiError(err);
    expect(result.message).toBe('Request failed');
    expect(result.fieldErrors).toEqual({});
  });
});

describe('formatFieldErrors', () => {
  it('returns array of error message values', () => {
    const errors = {
      name: 'Name is required',
      email: 'Invalid email',
      code: 'Code must be unique',
    };
    const result = formatFieldErrors(errors);
    expect(result).toEqual(['Name is required', 'Invalid email', 'Code must be unique']);
  });

  it('returns empty array for empty object', () => {
    expect(formatFieldErrors({})).toEqual([]);
  });
});
