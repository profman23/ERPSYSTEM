/**
 * useFormSubmit — Reusable form submission hook
 *
 * Handles: loading state, API error extraction, field error mapping, toast.
 * Replaces the duplicated handleSubmit/setIsSubmitting/extractApiError pattern
 * found across 20+ create/edit pages.
 *
 * Usage:
 *   const { isSubmitting, submitError, handleSubmit } = useFormSubmit({
 *     onSubmit: async () => { await apiClient.post(...) },
 *     onSuccess: () => { navigate('/list'); showToast('success', 'Created'); },
 *     setErrors: (fieldErrors) => setErrors(fieldErrors),
 *   });
 */

import { useState, useCallback } from 'react';
import { extractApiError } from '@/lib/apiError';

interface UseFormSubmitOptions<T extends Record<string, string>> {
  onSubmit: () => Promise<void>;
  onSuccess?: () => void;
  setErrors?: (fieldErrors: Partial<T>) => void;
}

export function useFormSubmit<T extends Record<string, string>>(
  options: UseFormSubmitOptions<T>,
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await options.onSubmit();
      options.onSuccess?.();
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      if (options.setErrors && Object.keys(apiError.fieldErrors).length > 0) {
        options.setErrors(apiError.fieldErrors as Partial<T>);
      }
      setSubmitError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [options]);

  return { isSubmitting, submitError, setSubmitError, handleSubmit };
}
