/**
 * DocumentStatusBadge — Shared status badge for all financial documents.
 *
 * Renders POSTED (green) or REVERSED (default) badge with bilingual labels.
 * Used across all 7 document types (Journal Entry, Sales Invoice, PO, etc.)
 * in both List pages and Detail pages.
 */

import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

interface DocumentStatusBadgeProps {
  status: 'POSTED' | 'REVERSED';
}

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const { isRTL } = useLanguage();

  const isPosted = status === 'POSTED';

  return (
    <Badge
      className="border"
      style={isPosted
        ? { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' }
        : { backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' }
      }
    >
      {isPosted
        ? (isRTL ? 'مرحّل' : 'Posted')
        : (isRTL ? 'معكوس' : 'Reversed')
      }
    </Badge>
  );
}
