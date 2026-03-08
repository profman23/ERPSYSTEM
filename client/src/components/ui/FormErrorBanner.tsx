/**
 * FormErrorBanner — Reusable error banner for create/edit forms
 *
 * Displays a styled error message at the top of a form card.
 * Replaces the duplicated error banner markup across 20+ pages.
 *
 * Usage:
 *   <FormErrorBanner message={submitError} />
 */

import { AlertCircle } from 'lucide-react';

interface FormErrorBannerProps {
  message: string | null;
}

export function FormErrorBanner({ message }: FormErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      className="px-5 py-3 text-sm border-b flex items-center gap-2"
      style={{
        backgroundColor: 'var(--color-danger-bg)',
        color: 'var(--color-text-danger)',
        borderColor: 'var(--color-danger-border)',
      }}
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {message}
    </div>
  );
}
