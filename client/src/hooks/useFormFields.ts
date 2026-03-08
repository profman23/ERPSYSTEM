/**
 * useFormFields — Reusable form state management hook
 *
 * Manages form data + field errors with auto-clear-on-change.
 * Replaces the duplicated updateField/setFormData/setErrors pattern
 * found across 20+ create/edit pages.
 *
 * Usage:
 *   const { formData, errors, updateField, setFormData, setErrors, resetForm } = useFormFields(initialData);
 */

import { useState, useCallback } from 'react';

export function useFormFields<T extends Record<string, unknown>>(initialData: T) {
  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setErrors({});
  }, [initialData]);

  return { formData, errors, updateField, setFormData, setErrors, resetForm };
}
