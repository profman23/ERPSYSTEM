/**
 * DocumentReversalBanner — Shared reversal link banners for all financial documents.
 *
 * Shows info/warning banners linking to the original or reversal document.
 * Used on Detail pages for all 7 document types.
 */

import { Link } from 'react-router-dom';
import { RotateCcw, AlertCircle, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DocumentReversalBannerProps {
  reversalOfId?: string;
  reversedById?: string;
  getDetailPath: (id: string) => string;
}

export function DocumentReversalBanner({
  reversalOfId,
  reversedById,
  getDetailPath,
}: DocumentReversalBannerProps) {
  const { isRTL } = useLanguage();

  return (
    <>
      {reversalOfId && (
        <div
          className="rounded-lg px-4 py-3 text-sm border flex items-center gap-2 max-w-4xl"
          style={{ backgroundColor: 'var(--badge-info-bg)', borderColor: 'var(--badge-info-border)', color: 'var(--badge-info-text)' }}
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          {isRTL ? 'هذا القيد عكس لـ: ' : 'Reversal of: '}
          <Link
            to={getDetailPath(reversalOfId)}
            className="font-mono underline flex items-center gap-1"
          >
            {isRTL ? 'عرض القيد الأصلي' : 'View original entry'}
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
      {reversedById && (
        <div
          className="rounded-lg px-4 py-3 text-sm border flex items-center gap-2 max-w-4xl"
          style={{ backgroundColor: 'var(--badge-warning-bg)', borderColor: 'var(--badge-warning-border)', color: 'var(--badge-warning-text)' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {isRTL ? 'تم عكس هذا القيد بواسطة: ' : 'Reversed by: '}
          <Link
            to={getDetailPath(reversedById)}
            className="font-mono underline flex items-center gap-1"
          >
            {isRTL ? 'عرض قيد العكس' : 'View reversal entry'}
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </>
  );
}
