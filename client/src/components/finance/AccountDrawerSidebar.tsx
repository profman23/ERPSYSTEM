/**
 * AccountDrawerSidebar — Account type filter buttons (left sidebar)
 *
 * Shows: All + 5 account type buttons (Asset, Liability, Equity, Revenue, Expense)
 * Clicking a button filters the tree to that account type.
 */

import { ListTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DRAWER_ITEMS } from './coaConstants';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AccountDrawerSidebarProps {
  activeDrawer: string;
  onDrawerChange: (type: string) => void;
  isRTL: boolean;
  layout?: 'vertical' | 'horizontal';
}

// ═══════════════════════════════════════════════════════════════
// DRAWER BUTTON
// ═══════════════════════════════════════════════════════════════

interface DrawerButtonProps {
  item: typeof DRAWER_ITEMS[number];
  isActive: boolean;
  onClick: () => void;
  isRTL: boolean;
  isHorizontal?: boolean;
}

function DrawerButton({ item, isActive, onClick, isRTL, isHorizontal }: DrawerButtonProps) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-lg transition-all text-center',
        isHorizontal
          ? 'flex-row shrink-0 px-3 py-2 min-h-[44px]'
          : 'flex-col w-full flex-1',
        isActive ? 'shadow-sm border-2' : 'border hover:bg-[var(--color-surface-hover)]',
      )}
      style={{
        backgroundColor: isActive ? `${item.color}12` : 'var(--color-surface)',
        borderColor: isActive ? item.color : 'var(--color-border)',
      }}
      title={isRTL ? item.labelAr : item.label}
    >
      <Icon
        className="w-5 h-5"
        style={{ color: isActive ? item.color : 'var(--color-text-muted)' }}
      />
      <span
        className="text-xs font-semibold leading-tight"
        style={{ color: isActive ? item.color : 'var(--color-text-muted)' }}
      >
        {isRTL ? item.labelAr : item.label}
      </span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR COMPONENT
// ═══════════════════════════════════════════════════════════════

export function AccountDrawerSidebar({ activeDrawer, onDrawerChange, isRTL, layout = 'vertical' }: AccountDrawerSidebarProps) {
  const isHorizontal = layout === 'horizontal';

  return (
    <div
      className={cn(
        'shrink-0 overflow-auto',
        isHorizontal
          ? 'flex flex-row gap-1.5 py-1.5 px-2 border-b overflow-x-auto'
          : 'flex flex-col gap-1.5 py-1.5 px-1.5 border-e overflow-y-auto',
      )}
      style={{
        ...(isHorizontal ? {} : { width: '80px' }),
        borderColor: 'var(--color-border)',
      }}
    >
      {/* "All" button */}
      <button
        type="button"
        onClick={() => onDrawerChange('')}
        className={cn(
          'flex items-center justify-center gap-1.5 rounded-lg transition-all text-center',
          isHorizontal
            ? 'flex-row shrink-0 px-3 py-2 min-h-[44px]'
            : 'flex-col w-full flex-1',
          !activeDrawer ? 'shadow-sm border-2' : 'border hover:bg-[var(--color-surface-hover)]',
        )}
        style={{
          backgroundColor: !activeDrawer ? 'var(--color-accent-light)' : 'var(--color-surface)',
          borderColor: !activeDrawer ? 'var(--color-accent)' : 'var(--color-border)',
        }}
        title={isRTL ? 'الكل' : 'All'}
      >
        <ListTree
          className="w-5 h-5"
          style={{ color: !activeDrawer ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
        />
        <span
          className="text-xs font-semibold"
          style={{ color: !activeDrawer ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
        >
          {isRTL ? 'الكل' : 'All'}
        </span>
      </button>

      {DRAWER_ITEMS.map((item) => (
        <DrawerButton
          key={item.type}
          item={item}
          isActive={activeDrawer === item.type}
          onClick={() => onDrawerChange(activeDrawer === item.type ? '' : item.type)}
          isRTL={isRTL}
          isHorizontal={isHorizontal}
        />
      ))}
    </div>
  );
}
