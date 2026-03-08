/**
 * Centralized API Error Extraction Utility
 *
 * Extracts and humanizes API errors from Axios responses.
 * Used by ALL form pages for consistent error display.
 *
 * Error flow:
 *   Backend (ZodError / AppError) → errorHandler middleware → normalized JSON
 *   → Axios catches → extractApiError() → { message, fieldErrors, code }
 *   → UI displays via toast + inline field errors
 */

import axios from 'axios';

export interface ApiErrorResult {
  message: string;
  fieldErrors: Record<string, string>;
  code?: string;
  statusCode?: number;
}

// Error code → user-friendly message
const ERROR_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The requested resource was not found',
  CONFLICT: 'A record with this information already exists',
  QUOTA_EXCEEDED: 'You have reached your subscription plan limit',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  FORBIDDEN: 'You do not have permission for this action',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  TENANT_SUSPENDED: 'Your account has been suspended. Please contact support.',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later.',
  VALIDATION_ERROR: 'Please check the form and fix the highlighted errors',
};

/**
 * Extract structured error information from any caught error.
 *
 * Handles:
 * - Axios errors with backend response (validation details, error codes)
 * - Network errors (no response)
 * - Generic JS errors
 */
export function extractApiError(error: unknown): ApiErrorResult {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const statusCode = error.response?.status;

    // Validation error with field-level details
    if (data?.details?.length) {
      const fieldErrors: Record<string, string> = {};
      for (const detail of data.details) {
        const field = detail.field || detail.path?.join?.('.') || 'unknown';
        fieldErrors[field] = detail.message;
      }
      const code = data.code || (statusCode === 400 ? 'VALIDATION_ERROR' : undefined);
      return {
        message: ERROR_CODE_MESSAGES[code] || data.error || 'Validation error',
        fieldErrors,
        code,
        statusCode,
      };
    }

    // Backend error string (no field details)
    if (data?.error) {
      const code = data.code;
      return {
        message: ERROR_CODE_MESSAGES[code] || data.error,
        fieldErrors: {},
        code,
        statusCode,
      };
    }

    // Network error (no response at all)
    if (!error.response) {
      return {
        message: 'Unable to connect to the server. Please check your internet connection.',
        fieldErrors: {},
        code: 'NETWORK_ERROR',
      };
    }
  }

  // Generic JS error
  return {
    message: (error as any)?.message || 'An unexpected error occurred. Please try again.',
    fieldErrors: {},
  };
}

/**
 * Format field errors into "Label: message" strings for display in alert banners.
 */
export function formatFieldErrors(fieldErrors: Record<string, string>): string[] {
  return Object.values(fieldErrors);
}
