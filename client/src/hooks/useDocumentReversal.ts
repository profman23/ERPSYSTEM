/**
 * useDocumentReversal — Shared hook for document reversal state management.
 *
 * Encapsulates the reversal dialog visibility and canReverse computation.
 * Used on Detail pages for all 7 financial document types.
 */

import { useState } from 'react';

interface UseDocumentReversalOptions {
  status?: 'POSTED' | 'REVERSED';
  reversedById?: string;
  canModify: boolean;
}

export function useDocumentReversal({ status, reversedById, canModify }: UseDocumentReversalOptions) {
  const [showDialog, setShowDialog] = useState(false);

  const canReverse = status === 'POSTED' && !reversedById && canModify;

  return {
    showDialog,
    setShowDialog,
    canReverse,
  };
}
