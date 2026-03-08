/**
 * Account Selector Component
 *
 * Reusable dropdown for selecting accounts from the Chart of Accounts.
 * Used in: COA form (parent selector), Journal Entries, Invoices, Payments.
 *
 * Features:
 * - Search/filter within dropdown
 * - Tree-indented display (code - name)
 * - Filter by account type
 * - Filter postable-only accounts
 * - Exclude specific account (prevent self-selection)
 * - RTL support
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useChartOfAccountsTree,
  type AccountTreeNode,
} from '@/hooks/useChartOfAccounts';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AccountSelectorProps {
  value: string | null;
  onChange: (accountId: string | null) => void;
  accountType?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  onlyPostable?: boolean;
  excludeId?: string;
  label?: string;
  labelAr?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  placeholderAr?: string;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

interface FlatOption {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  depth: number;
  isPostable: boolean;
  accountType: string;
}

function flattenTreeNodes(
  nodes: AccountTreeNode[],
  depth = 0,
): FlatOption[] {
  const result: FlatOption[] = [];
  for (const node of nodes) {
    result.push({
      id: node.account.id,
      code: node.account.code,
      name: node.account.name,
      nameAr: node.account.nameAr ?? undefined,
      depth,
      isPostable: node.account.isPostable,
      accountType: node.account.accountType,
    });
    result.push(...flattenTreeNodes(node.children, depth + 1));
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function AccountSelector({
  value,
  onChange,
  accountType,
  onlyPostable = false,
  excludeId,
  label,
  labelAr,
  error,
  required,
  disabled,
  placeholder = 'Select account...',
  placeholderAr = 'اختر حساب...',
  className,
}: AccountSelectorProps) {
  const { isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayLabel = isRTL && labelAr ? labelAr : label;
  const displayPlaceholder = isRTL && placeholderAr ? placeholderAr : placeholder;

  // Fetch full COA tree once (shared across all AccountSelector instances)
  const { data: treeData, isLoading } = useChartOfAccountsTree();

  // Flatten + filter options
  const options = useMemo(() => {
    if (!treeData?.tree) return [];
    const flat = flattenTreeNodes(treeData.tree);
    return flat.filter((opt) => {
      if (accountType && opt.accountType !== accountType) return false;
      if (excludeId && opt.id === excludeId) return false;
      if (onlyPostable && !opt.isPostable) return false;
      return true;
    });
  }, [treeData, accountType, excludeId, onlyPostable]);

  // Search filter
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.code.toLowerCase().includes(q) ||
        opt.name.toLowerCase().includes(q) ||
        (opt.nameAr && opt.nameAr.includes(q)),
    );
  }, [options, search]);

  // Find selected account label
  const selectedOption = useMemo(
    () => options.find((opt) => opt.id === value),
    [options, value],
  );

  const displayValue = selectedOption
    ? `${selectedOption.code} - ${isRTL && selectedOption.nameAr ? selectedOption.nameAr : selectedOption.name}`
    : '';

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (id: string) => {
    onChange(id === value ? null : id);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {/* Label */}
      {displayLabel && (
        <label className="block text-xs flex items-center gap-1.5 text-[var(--color-text-secondary)] mb-1.5">
          {displayLabel}
          {required && <span className="ms-1" style={{ color: 'var(--color-text-danger)' }}>*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 px-3 py-2 text-sm transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-[var(--select-ring)] focus:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        style={{
          backgroundColor: 'var(--select-bg)',
          color: selectedOption ? 'var(--select-text)' : 'var(--select-placeholder)',
          borderRadius: 'var(--radius, 0.375rem)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: error ? 'var(--input-error-border)' : 'var(--select-border)',
        }}
      >
        <span className="truncate">
          {displayValue || displayPlaceholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <X className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-[var(--select-icon)]" />
        </span>
      </button>

      {/* Error */}
      {error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-danger)' }}>{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full rounded-lg border shadow-lg',
            'bg-[var(--select-dropdown-bg)] border-[var(--select-dropdown-border)]',
            'max-h-72 flex flex-col',
          )}
        >
          {/* Search */}
          <div className="p-2 border-b border-[var(--color-border)]">
            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] start-2.5" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRTL ? 'بحث...' : 'Search...'}
                className={cn(
                  'w-full h-9 ps-9 pe-3 text-sm rounded-md border',
                  'bg-[var(--color-surface)] border-[var(--color-border)]',
                  'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
                  'focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]',
                )}
              />
            </div>
          </div>

          {/* Options */}
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-[var(--color-text-muted)]">
                {isRTL ? 'لا توجد نتائج' : 'No results found'}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm py-2 pe-2 text-sm transition-colors',
                      'text-[var(--select-item-text)]',
                      'hover:bg-[var(--select-item-hover-bg)]',
                      isSelected && 'bg-[var(--select-item-selected-bg)] text-[var(--select-item-selected-text)]',
                    )}
                    style={{ paddingInlineStart: `${12 + opt.depth * 20}px` }}
                  >
                    <span className="flex-1 text-start truncate">
                      <span className="font-mono text-xs opacity-70">{opt.code}</span>
                      <span className="mx-1.5">-</span>
                      <span>{isRTL && opt.nameAr ? opt.nameAr : opt.name}</span>
                    </span>
                    {opt.isPostable && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
                        {isRTL ? 'قابل للترحيل' : 'Postable'}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountSelector;
