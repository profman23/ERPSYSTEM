/**
 * Centralized API Error Extraction Utility
 *
 * Extracts and humanizes API errors from Axios responses.
 * Used by ALL form pages for consistent error display.
 *
 * Error flow:
 *   Backend (ZodError / AppError) → errorHandler middleware → normalized JSON
 *   → Axios catches → extractApiError() → { message, fieldErrors, code, messageKey, params }
 *   → UI displays via inline banner + field errors
 *
 * Bilingual resolution priority:
 *   1. i18n.t(errors.api.${messageKey}, params) — specific localized + interpolated
 *   2. i18n.t(errors.api.${code}) — generic localized by category
 *   3. data.error — English fallback from backend
 *   4. errors.api.UNKNOWN — last resort
 */

import axios from 'axios';
import i18n from '@/i18n/config/i18n';

export interface ApiErrorResult {
  message: string;
  fieldErrors: Record<string, string>;
  code?: string;
  statusCode?: number;
  messageKey?: string;
  params?: Record<string, unknown>;
}

/**
 * Get bilingual fallback message from i18n for a given error code.
 * Used ONLY when no messageKey is available.
 */
function getFallbackMessage(code?: string): string {
  if (code) {
    const msg = i18n.t(`errors.api.${code}`, { defaultValue: '' });
    if (msg) return msg;
  }
  return i18n.t('errors.api.UNKNOWN', { defaultValue: 'An unexpected error occurred. Please try again.' });
}

/**
 * Resolve a localized message from messageKey + params, with graceful degradation.
 * Translates entity names in params (e.g., "Species" → "الأنواع" in Arabic).
 * Returns null if no translation found — caller falls back to data.error.
 */
function getLocalizedMessage(
  messageKey?: string,
  params?: Record<string, unknown>,
  code?: string,
): string | null {
  // Priority 1: specific messageKey (e.g., POSTING_PERIOD_CLOSED)
  if (messageKey) {
    const translatedParams = { ...params };
    // Translate entity names via entities.* i18n keys
    if (translatedParams?.entity) {
      translatedParams.entity = i18n.t(`entities.${translatedParams.entity}`, {
        defaultValue: translatedParams.entity as string,
      });
    }
    const msg = i18n.t(`errors.api.${messageKey}`, { ...translatedParams, defaultValue: '' });
    if (msg) return msg;
  }
  // Priority 2: generic code (e.g., CONFLICT)
  if (code) {
    const msg = i18n.t(`errors.api.${code}`, { defaultValue: '' });
    if (msg) return msg;
  }
  return null;
}

/**
 * Extract structured error information from any caught error.
 *
 * Handles:
 * - Axios errors with backend response (validation details, error codes, messageKey + params)
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
      const message = getLocalizedMessage(data.messageKey, data.params, code)
        || data.error
        || getFallbackMessage(code);
      return {
        message,
        fieldErrors,
        code,
        statusCode,
        messageKey: data.messageKey,
        params: data.params,
      };
    }

    // Backend error string (no field details)
    if (data?.error) {
      const code = data.code;
      // Try localized message first, fall back to English backend message
      const message = getLocalizedMessage(data.messageKey, data.params, code) || data.error;
      return {
        message,
        fieldErrors: {},
        code,
        statusCode,
        messageKey: data.messageKey,
        params: data.params,
      };
    }

    // Network error (no response at all)
    if (!error.response) {
      return {
        message: i18n.t('errors.api.NETWORK_ERROR', { defaultValue: 'Unable to connect to the server. Please check your internet connection.' }),
        fieldErrors: {},
        code: 'NETWORK_ERROR',
      };
    }
  }

  // Generic JS error
  return {
    message: (error as unknown as Error)?.message || getFallbackMessage(),
    fieldErrors: {},
  };
}

/**
 * Format field errors into "Label: message" strings for display in alert banners.
 */
export function formatFieldErrors(fieldErrors: Record<string, string>): string[] {
  return Object.values(fieldErrors);
}
