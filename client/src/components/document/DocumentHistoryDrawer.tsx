/**
 * DocumentHistoryDrawer — Reusable Document Lifecycle Timeline
 *
 * Displays a vertical timeline of document history events (Created, Reversed, etc.)
 * inside a side Drawer. Used on all financial document detail pages.
 *
 * Pattern: Same folder as DocumentStatusBadge, DocumentReversalBanner, ReverseDocumentDialog.
 * Reusable across all 7 document types — no domain-specific logic inside.
 */

import { useMemo } from 'react';
import { User, RotateCcw, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { useLanguage } from '@/contexts/LanguageContext';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type HistoryAction = 'CREATED' | 'REVERSED' | 'UPDATED' | 'DELETED';

export interface HistoryEntry {
  action: HistoryAction;
  userName: string;
  userEmail: string;
  timestamp: string;
  details?: string;
}

export interface DocumentHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documentCode: string;
  entries: HistoryEntry[];
}

// ═══════════════════════════════════════════════════════════════
// ACTION CONFIG — colors + icons + labels per action type
// ═══════════════════════════════════════════════════════════════

interface ActionConfig {
  icon: LucideIcon;
  dotColor: string;
  lineColor: string;
  labelEn: string;
  labelAr: string;
}

const ACTION_CONFIG: Record<HistoryAction, ActionConfig> = {
  CREATED: {
    icon: User,
    dotColor: 'var(--color-success, #22c55e)',
    lineColor: 'var(--color-success, #22c55e)',
    labelEn: 'Created',
    labelAr: 'تم الإنشاء',
  },
  REVERSED: {
    icon: RotateCcw,
    dotColor: 'var(--color-danger, #ef4444)',
    lineColor: 'var(--color-danger, #ef4444)',
    labelEn: 'Reversed',
    labelAr: 'تم العكس',
  },
  UPDATED: {
    icon: Pencil,
    dotColor: 'var(--color-info, #3b82f6)',
    lineColor: 'var(--color-info, #3b82f6)',
    labelEn: 'Updated',
    labelAr: 'تم التعديل',
  },
  DELETED: {
    icon: Trash2,
    dotColor: 'var(--color-warning, #f59e0b)',
    lineColor: 'var(--color-warning, #f59e0b)',
    labelEn: 'Deleted',
    labelAr: 'تم الحذف',
  },
};

// ═══════════════════════════════════════════════════════════════
// FORMAT TIMESTAMP
// ═══════════════════════════════════════════════════════════════

function formatTimestamp(timestamp: string, locale: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return timestamp;
  }
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function DocumentHistoryDrawer({
  isOpen,
  onClose,
  documentCode,
  entries,
}: DocumentHistoryDrawerProps) {
  const { isRTL, language } = useLanguage();

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
    [entries],
  );

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      title={isRTL ? 'سجل المستند' : 'Document History'}
      description={documentCode}
      size="sm"
    >
      {sortedEntries.length === 0 ? (
        <p
          className="text-sm text-center py-8"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {isRTL ? 'لا يوجد سجل' : 'No history available'}
        </p>
      ) : (
        <div className="relative">
          {sortedEntries.map((entry, index) => {
            const config = ACTION_CONFIG[entry.action];
            const Icon = config.icon;
            const isLast = index === sortedEntries.length - 1;
            const label = isRTL ? config.labelAr : config.labelEn;

            return (
              <div key={`${entry.action}-${index}`} className="relative flex gap-4 pb-6">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  {/* Dot */}
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: config.dotColor + '1a' }}
                    data-testid={`history-dot-${entry.action.toLowerCase()}`}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: config.dotColor }}
                    />
                  </div>
                  {/* Vertical line */}
                  {!isLast && (
                    <div
                      className="w-0.5 flex-1 mt-1"
                      style={{ backgroundColor: 'var(--color-border)' }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  {/* Action label */}
                  <p
                    className="text-sm font-medium"
                    style={{ color: config.dotColor }}
                  >
                    {label}
                  </p>

                  {/* User name */}
                  <p
                    className="text-sm mt-1"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {entry.userName}
                  </p>

                  {/* User email */}
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {entry.userEmail}
                  </p>

                  {/* Timestamp */}
                  <p
                    className="text-xs mt-1 font-mono"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {formatTimestamp(entry.timestamp, language)}
                  </p>

                  {/* Details (optional) */}
                  {entry.details && (
                    <p
                      className="text-xs mt-1.5 px-2 py-1 rounded"
                      style={{
                        color: 'var(--color-text-secondary)',
                        backgroundColor: 'var(--color-surface-hover)',
                      }}
                    >
                      {entry.details}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}
