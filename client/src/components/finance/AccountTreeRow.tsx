/**
 * AccountTreeRow — Single row in the COA tree
 *
 * Renders: indent → chevron → icon → code → name → type badge
 * Used by AccountTreePanel via flattenTree() rows.
 */

import { ChevronDown, ChevronRight, Folder, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Badge } from '@/components/ui/badge';
import { ACCOUNT_TYPE_BADGE } from './coaConstants';
import type { ChartOfAccount } from '@/hooks/useChartOfAccounts';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface FlatRow {
  account: ChartOfAccount;
  depth: number;
  hasChildren: boolean;
}

export interface AccountTreeRowProps {
  row: FlatRow;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  isRTL: boolean;
  compact?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// BADGE COLOR MAP (for compact dot indicator)
// ═══════════════════════════════════════════════════════════════

const BADGE_DOT_COLORS: Record<string, string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  success: '#10b981',
  error: '#ef4444',
  default: '#6b7280',
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function AccountTreeRow({ row, isExpanded, isSelected, onToggle, onSelect, isRTL, compact }: AccountTreeRowProps) {
  const { account, depth, hasChildren } = row;
  const badge = ACCOUNT_TYPE_BADGE[account.accountType];
  const indentWidth = compact ? depth * 10 : depth * 16;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 transition-colors cursor-pointer',
        'border-b last:border-b-0',
        compact ? 'py-2.5 min-h-[48px]' : 'py-2',
        isSelected
          ? 'bg-[var(--color-accent-light)]'
          : 'hover:bg-[var(--color-surface-hover)]',
      )}
      style={{ borderColor: 'var(--color-border)' }}
      onClick={onSelect}
    >
      {/* Indent spacer */}
      <div style={{ width: indentWidth, flexShrink: 0 }} />

      {/* Expand/collapse chevron */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={cn(
          'rounded transition-colors shrink-0',
          compact ? 'p-1.5' : 'p-0.5',
          hasChildren
            ? 'hover:bg-[var(--color-surface-active)] text-[var(--color-text-muted)]'
            : 'invisible',
        )}
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        {isExpanded
          ? <ChevronDown className={cn(compact ? 'h-5 w-5' : 'h-4 w-4')} />
          : <ChevronRight className={cn(compact ? 'h-5 w-5' : 'h-4 w-4')} />
        }
      </button>

      {/* Folder/file icon */}
      {hasChildren ? (
        <StyledIcon icon={Folder} emoji="📁" className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
      ) : (
        <StyledIcon icon={FileText} emoji="📄" className="h-4 w-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
      )}

      {/* Code */}
      <span className="font-mono text-xs font-medium shrink-0" style={{ color: 'var(--color-text-muted)' }}>
        {account.code}
      </span>

      {/* Name */}
      <span className="text-sm flex-1 truncate" style={{ color: 'var(--color-text)' }}>
        {isRTL && account.nameAr ? account.nameAr : account.name}
      </span>

      {/* Type badge — full on desktop, colored dot on mobile */}
      {badge && !compact && (
        <Badge variant={badge.variant} size="sm" className="shrink-0">
          {isRTL ? badge.labelAr : badge.label}
        </Badge>
      )}
      {badge && compact && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: BADGE_DOT_COLORS[badge.variant] || BADGE_DOT_COLORS.default }}
          title={isRTL ? badge.labelAr : badge.label}
        />
      )}
    </div>
  );
}
