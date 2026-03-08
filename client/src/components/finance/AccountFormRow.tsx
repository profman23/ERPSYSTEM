/**
 * AccountFormRow + AccountDetailRow — Reusable row layouts for COA forms/views
 *
 * FormRow:   label (with optional icon) + field + error
 * DetailRow: icon + label + value (read-only)
 */

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StyledIcon } from '@/components/ui/StyledIcon';

// ═══════════════════════════════════════════════════════════════
// FORM ROW — Horizontal label + field layout (stacked on mobile)
// ═══════════════════════════════════════════════════════════════

export interface FormRowProps {
  label: string;
  required?: boolean;
  error?: string;
  alignTop?: boolean;
  icon?: LucideIcon;
  emoji?: string;
  compact?: boolean;
  children: React.ReactNode;
}

export function FormRow({ label, required, error, alignTop, icon: Icon, emoji, compact, children }: FormRowProps) {
  return (
    <div className="space-y-0.5">
      <div className={cn(
        'flex gap-3',
        compact ? 'flex-col' : (alignTop ? 'items-start' : 'items-center'),
      )}>
        <span
          className={cn(
            'text-sm font-medium shrink-0 flex items-center gap-1.5',
            compact ? 'w-full' : 'w-[130px] pt-[6px]',
          )}
          style={{ color: 'var(--color-text-muted)' }}
        >
          {Icon && <StyledIcon icon={Icon} emoji={emoji} className="w-3.5 h-3.5 shrink-0" />}
          {label}
          {required && <span className="text-red-500 ms-0.5">*</span>}
        </span>
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
      {error && (
        <p className={cn('text-xs', compact ? 'ps-0' : 'ps-[142px]')} style={{ color: 'var(--color-text-danger)' }}>{error}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DETAIL ROW — Read-only icon + label + value
// ═══════════════════════════════════════════════════════════════

export interface DetailRowProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}

export function DetailRow({ icon: Icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5" style={{ borderColor: 'var(--color-border)' }}>
      <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
      <span className="text-sm font-medium shrink-0 min-w-[80px]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <span className="text-sm flex-1" style={{ color: 'var(--color-text)' }}>
        {value}
      </span>
    </div>
  );
}
