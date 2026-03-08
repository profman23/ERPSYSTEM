/**
 * SearchField Component
 *
 * Search input with debounce, clear button, and loading state
 *
 * Usage:
 * <SearchField
 *   value={search}
 *   onChange={setSearch}
 *   placeholder="Search users..."
 *   debounceMs={300}
 * />
 */

import { useState, useEffect, useRef, useCallback, InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
export interface SearchFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void | Promise<void>;
  placeholder?: string;
  placeholderAr?: string;
  debounceMs?: number;
  loading?: boolean;
  clearable?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'ghost';
}

// ═══════════════════════════════════════════════════════════════
// SIZE MAP
// ═══════════════════════════════════════════════════════════════
const sizeMap = {
  sm: {
    input: 'h-8 text-sm px-8',
    icon: 'h-3.5 w-3.5',
    iconLeft: 'left-2.5',
    iconRight: 'right-2.5',
  },
  md: {
    input: 'h-10 text-sm px-10',
    icon: 'h-4 w-4',
    iconLeft: 'left-3',
    iconRight: 'right-3',
  },
  lg: {
    input: 'h-12 text-base px-12',
    icon: 'h-5 w-5',
    iconLeft: 'left-4',
    iconRight: 'right-4',
  },
};

const variantMap = {
  default: cn(
    'bg-[var(--color-surface)] border border-[var(--color-border)]',
    'focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--focus-ring)]'
  ),
  filled: cn(
    'bg-[var(--color-surface-hover)] border border-transparent',
    'focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--focus-ring)]'
  ),
  ghost: cn(
    'bg-transparent border border-transparent',
    'hover:bg-[var(--color-surface-hover)]',
    'focus:bg-[var(--color-surface)] focus:border-[var(--color-border)]'
  ),
};

// ═══════════════════════════════════════════════════════════════
// DEBOUNCE HOOK
// ═══════════════════════════════════════════════════════════════
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
export function SearchField({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  placeholderAr,
  debounceMs = 300,
  loading = false,
  clearable = true,
  showIcon = true,
  size = 'md',
  variant = 'default',
  className,
  disabled,
  ...props
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sizes = sizeMap[size];
  const { isRTL } = useLanguage();
  const { t } = useTranslation();

  const displayPlaceholder = isRTL && placeholderAr ? placeholderAr : placeholder;

  // Internal state for immediate UI feedback
  const [localValue, setLocalValue] = useState(value);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce the value
  const debouncedValue = useDebounce(localValue, debounceMs);

  // Call onChange and onSearch when debounced value changes
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
      onSearch?.(debouncedValue);
    }
  }, [debouncedValue, value, onChange, onSearch]);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  }, []);

  // Handle clear
  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    onSearch?.('');
    inputRef.current?.focus();
  }, [onChange, onSearch]);

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' && localValue) {
        handleClear();
      }
    },
    [localValue, handleClear]
  );

  const showClear = clearable && localValue && !loading && !disabled;

  return (
    <div className={cn('relative', className)}>
      {/* Search icon */}
      {showIcon && (
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 pointer-events-none',
            'text-[var(--color-text-muted)]',
            isRTL ? sizes.iconRight : sizes.iconLeft
          )}
        >
          <Search className={sizes.icon} />
        </div>
      )}

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={displayPlaceholder}
        disabled={disabled}
        className={cn(
          'w-full rounded-lg transition-colors',
          'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
          'outline-none',
          sizes.input,
          variantMap[variant],
          disabled && 'opacity-50 cursor-not-allowed',
          isRTL && 'text-right'
        )}
        {...props}
      />

      {/* Clear button or loading */}
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2',
          isRTL ? sizes.iconLeft : sizes.iconRight
        )}
      >
        {loading ? (
          <Loader2
            className={cn(sizes.icon, 'text-[var(--color-text-muted)] animate-spin')}
          />
        ) : showClear ? (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              'p-0.5 rounded transition-colors',
              'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              'hover:bg-[var(--color-surface-hover)]'
            )}
            aria-label={t('common.clearSearch')}
          >
            <X className={sizes.icon} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEARCH FIELD WITH BUTTON
// ═══════════════════════════════════════════════════════════════
export interface SearchFieldWithButtonProps extends SearchFieldProps {
  buttonLabel?: string;
  buttonLabelAr?: string;
  onSubmit?: () => void;
}

export function SearchFieldWithButton({
  buttonLabel = 'Search',
  buttonLabelAr,
  onSubmit,
  ...props
}: SearchFieldWithButtonProps) {
  const { isRTL } = useLanguage();

  const displayLabel = isRTL && buttonLabelAr ? buttonLabelAr : buttonLabel;

  return (
    <div className={cn('flex gap-2', isRTL && 'flex-row-reverse')}>
      <SearchField {...props} className="flex-1" />
      <button
        type="button"
        onClick={onSubmit}
        disabled={props.loading || props.disabled}
        className={cn(
          'px-4 py-2 rounded-lg font-medium transition-colors',
          'bg-[var(--color-primary)] text-white',
          'hover:bg-[var(--color-primary-hover)]',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {displayLabel}
      </button>
    </div>
  );
}

export default SearchField;
