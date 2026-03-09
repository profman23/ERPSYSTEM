import { useState, useCallback } from 'react';
import { X, Filter, Calendar, RotateCcw, ChevronDown } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { SimpleSelect } from './select-advanced';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'boolean';
  options?: FilterOption[];
  placeholder?: string;
}

export interface FilterGroupProps {
  filters: FilterConfig[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  onReset?: () => void;
  layout?: 'horizontal' | 'vertical';
  showActiveCount?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// Select Filter Component
// ═══════════════════════════════════════════════════════════════

interface SelectFilterProps {
  filter: FilterConfig;
  value: string | undefined;
  onChange: (value: string) => void;
}

// Special value for "All" option since Radix UI doesn't allow empty string values
const ALL_VALUE = '__all__';

function SelectFilter({ filter, value, onChange }: SelectFilterProps) {
  // Transform options to include count in label if present
  const options = filter.options?.map((option) => ({
    value: option.value,
    label: option.count !== undefined ? `${option.label} (${option.count})` : option.label,
  })) || [];

  // Add "All" option with special value
  const allOptions = [
    { value: ALL_VALUE, label: filter.placeholder || `All ${filter.label}` },
    ...options,
  ];

  return (
    <SimpleSelect
      value={value || ALL_VALUE}
      onValueChange={(val) => onChange(val === ALL_VALUE ? '' : val)}
      options={allOptions}
      placeholder={filter.placeholder || `All ${filter.label}`}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// Multi-Select Filter Component
// ═══════════════════════════════════════════════════════════════

interface MultiSelectFilterProps {
  filter: FilterConfig;
  value: string[] | undefined;
  onChange: (value: string[]) => void;
}

function MultiSelectFilter({ filter, value = [], onChange }: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-3 pr-8 rounded-lg border text-left
          bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--color-text)]
          hover:border-[var(--input-border-hover)] focus:border-[var(--input-border-focus)]
          focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-light)]
          transition-colors duration-200"
      >
        {value.length > 0 ? (
          <span className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {value.length} selected
            </Badge>
          </span>
        ) : (
          <span className="text-[var(--color-text-muted)]">
            {filter.placeholder || `Select ${filter.label}`}
          </span>
        )}
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border shadow-lg
            bg-[var(--color-surface)] border-[var(--color-border)] max-h-60 overflow-y-auto">
            {filter.options?.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 px-3 py-2 cursor-pointer
                  hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={value.includes(option.value)}
                  onChange={() => handleToggle(option.value)}
                  className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-accent)]
                    focus:ring-[var(--color-accent)] focus:ring-offset-0"
                />
                <span className="text-[var(--color-text)]">{option.label}</span>
                {option.count !== undefined && (
                  <span className="ml-auto text-xs text-[var(--color-text-muted)]">
                    {option.count}
                  </span>
                )}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Date Filter Component
// ═══════════════════════════════════════════════════════════════

interface DateFilterProps {
  filter: FilterConfig;
  value: string | undefined;
  onChange: (value: string) => void;
}

function DateFilter({ filter, value, onChange }: DateFilterProps) {
  return (
    <div className="relative">
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 pr-10 rounded-lg border
          bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--color-text)]
          hover:border-[var(--input-border-hover)] focus:border-[var(--input-border-focus)]
          focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-light)]
          transition-colors duration-200"
        placeholder={filter.placeholder || `Select ${filter.label}`}
      />
      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Date Range Filter Component
// ═══════════════════════════════════════════════════════════════

interface DateRangeFilterProps {
  filter: FilterConfig;
  value: { from?: string; to?: string } | undefined;
  onChange: (value: { from?: string; to?: string }) => void;
}

function DateRangeFilter({ filter: _filter, value = {}, onChange }: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          type="date"
          value={value.from || ''}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="w-full h-10 px-3 rounded-lg border
            bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--color-text)]
            hover:border-[var(--input-border-hover)] focus:border-[var(--input-border-focus)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-light)]
            transition-colors duration-200 text-sm"
          placeholder="From"
        />
      </div>
      <span className="text-[var(--color-text-muted)]">—</span>
      <div className="relative flex-1">
        <input
          type="date"
          value={value.to || ''}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="w-full h-10 px-3 rounded-lg border
            bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--color-text)]
            hover:border-[var(--input-border-hover)] focus:border-[var(--input-border-focus)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-light)]
            transition-colors duration-200 text-sm"
          placeholder="To"
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Boolean Filter Component
// ═══════════════════════════════════════════════════════════════

interface BooleanFilterProps {
  filter: FilterConfig;
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
}

function BooleanFilter({ filter: _filter, value, onChange }: BooleanFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(value === true ? undefined : true)}
        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors
          ${value === true
            ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--color-text-on-accent)]'
            : 'bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--color-text)] hover:border-[var(--input-border-hover)]'
          }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(value === false ? undefined : false)}
        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors
          ${value === false
            ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--color-text-on-accent)]'
            : 'bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--color-text)] hover:border-[var(--input-border-hover)]'
          }`}
      >
        No
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main FilterGroup Component
// ═══════════════════════════════════════════════════════════════

export function FilterGroup({
  filters,
  values,
  onChange,
  onReset,
  layout = 'horizontal',
  showActiveCount = true,
  className = '',
}: FilterGroupProps) {
  // Count active filters
  const activeFiltersCount = Object.entries(values).filter(([, value]) => {
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && !Array.isArray(value)) {
      return Object.values(value).some((v) => v !== undefined && v !== '');
    }
    return true;
  }).length;

  // Handle individual filter change
  const handleFilterChange = useCallback((key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  }, [values, onChange]);

  // Handle reset
  const handleReset = useCallback(() => {
    if (onReset) {
      onReset();
    } else {
      const resetValues: Record<string, unknown> = {};
      filters.forEach((filter) => {
        resetValues[filter.key] = undefined;
      });
      onChange(resetValues);
    }
  }, [filters, onChange, onReset]);

  // Render filter based on type
  const renderFilter = (filter: FilterConfig) => {
    switch (filter.type) {
      case 'select':
        return (
          <SelectFilter
            filter={filter}
            value={values[filter.key] as string | undefined}
            onChange={(value) => handleFilterChange(filter.key, value || undefined)}
          />
        );
      case 'multiselect':
        return (
          <MultiSelectFilter
            filter={filter}
            value={values[filter.key] as string[] | undefined}
            onChange={(value) => handleFilterChange(filter.key, value.length > 0 ? value : undefined)}
          />
        );
      case 'date':
        return (
          <DateFilter
            filter={filter}
            value={values[filter.key] as string | undefined}
            onChange={(value) => handleFilterChange(filter.key, value || undefined)}
          />
        );
      case 'daterange':
        return (
          <DateRangeFilter
            filter={filter}
            value={values[filter.key] as { from?: string; to?: string } | undefined}
            onChange={(value) => handleFilterChange(filter.key, value)}
          />
        );
      case 'boolean':
        return (
          <BooleanFilter
            filter={filter}
            value={values[filter.key] as boolean | undefined}
            onChange={(value) => handleFilterChange(filter.key, value)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with active count and reset */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--color-text-muted)]" />
          <span className="text-sm font-medium text-[var(--color-text)]">Filters</span>
          {showActiveCount && activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs badge-info">
              {activeFiltersCount} active
            </Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className={`gap-4 ${layout === 'horizontal' ? 'flex flex-wrap items-end' : 'flex flex-col'}`}>
        {filters.map((filter) => (
          <div
            key={filter.key}
            className={layout === 'horizontal' ? 'min-w-[180px] flex-1 max-w-[280px]' : 'w-full'}
          >
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              {filter.label}
            </label>
            {renderFilter(filter)}
          </div>
        ))}
      </div>

      {/* Active filter tags */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const value = values[filter.key];
            if (value === undefined || value === null || value === '') return null;
            if (Array.isArray(value) && value.length === 0) return null;

            let displayValue = '';
            if (filter.type === 'select' && typeof value === 'string') {
              const option = filter.options?.find((o) => o.value === value);
              displayValue = option?.label || value;
            } else if (filter.type === 'multiselect' && Array.isArray(value)) {
              displayValue = `${value.length} selected`;
            } else if (filter.type === 'boolean') {
              displayValue = value ? 'Yes' : 'No';
            } else if (filter.type === 'daterange' && typeof value === 'object') {
              const dateValue = value as { from?: string; to?: string };
              displayValue = `${dateValue.from || '...'} - ${dateValue.to || '...'}`;
            } else {
              displayValue = String(value);
            }

            return (
              <Badge
                key={filter.key}
                variant="secondary"
                className="flex items-center gap-1 pr-1 badge-default"
              >
                <span className="text-[var(--color-text-muted)]">{filter.label}:</span>
                <span>{displayValue}</span>
                <button
                  type="button"
                  onClick={() => handleFilterChange(filter.key, undefined)}
                  className="ml-1 p-0.5 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FilterGroup;
