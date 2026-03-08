import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Country Dial Codes ─────────────────────────────────────────────────────

const COUNTRY_DIAL_CODES: Record<string, string> = {
  // Middle East & North Africa
  EG: '+20',
  SA: '+966',
  AE: '+971',
  KW: '+965',
  QA: '+974',
  BH: '+973',
  OM: '+968',
  JO: '+962',
  LB: '+961',
  IQ: '+964',
  PS: '+970',
  YE: '+967',
  SY: '+963',
  LY: '+218',
  TN: '+216',
  DZ: '+213',
  MA: '+212',
  SD: '+249',
  // Americas
  US: '+1',
  CA: '+1',
  MX: '+52',
  BR: '+55',
  AR: '+54',
  CO: '+57',
  // Europe
  GB: '+44',
  DE: '+49',
  FR: '+33',
  IT: '+39',
  ES: '+34',
  NL: '+31',
  BE: '+32',
  CH: '+41',
  AT: '+43',
  SE: '+46',
  NO: '+47',
  DK: '+45',
  PL: '+48',
  PT: '+351',
  // Asia-Pacific
  IN: '+91',
  PK: '+92',
  CN: '+86',
  JP: '+81',
  KR: '+82',
  AU: '+61',
  NZ: '+64',
  SG: '+65',
  MY: '+60',
  ID: '+62',
  TH: '+66',
  PH: '+63',
  VN: '+84',
  // Turkey
  TR: '+90',
};

// Country name labels for dropdown selectors
const COUNTRY_NAMES: Record<string, string> = {
  EG: 'Egypt', SA: 'Saudi Arabia', AE: 'UAE', KW: 'Kuwait', QA: 'Qatar',
  BH: 'Bahrain', OM: 'Oman', JO: 'Jordan', LB: 'Lebanon', IQ: 'Iraq',
  PS: 'Palestine', YE: 'Yemen', SY: 'Syria', LY: 'Libya', TN: 'Tunisia',
  DZ: 'Algeria', MA: 'Morocco', SD: 'Sudan',
  US: 'United States', CA: 'Canada', MX: 'Mexico', BR: 'Brazil',
  AR: 'Argentina', CO: 'Colombia',
  GB: 'United Kingdom', DE: 'Germany', FR: 'France', IT: 'Italy',
  ES: 'Spain', NL: 'Netherlands', BE: 'Belgium', CH: 'Switzerland',
  AT: 'Austria', SE: 'Sweden', NO: 'Norway', DK: 'Denmark',
  PL: 'Poland', PT: 'Portugal',
  IN: 'India', PK: 'Pakistan', CN: 'China', JP: 'Japan', KR: 'South Korea',
  AU: 'Australia', NZ: 'New Zealand', SG: 'Singapore', MY: 'Malaysia',
  ID: 'Indonesia', TH: 'Thailand', PH: 'Philippines', VN: 'Vietnam',
  TR: 'Turkey',
};

/** Country flag image using flagcdn.com CDN (works on all platforms including Windows) */
function CountryFlag({ code, size = 20 }: { code: string; size?: number }) {
  if (!code || code.length !== 2) return null;
  const lc = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/w${size}/${lc}.png`}
      srcSet={`https://flagcdn.com/w${size * 2}/${lc}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={COUNTRY_NAMES[code.toUpperCase()] || code}
      className="inline-block shrink-0 rounded-sm"
      loading="lazy"
    />
  );
}

/** Pre-built options list */
const COUNTRY_SELECT_OPTIONS = Object.keys(COUNTRY_DIAL_CODES).map(code => ({
  value: code,
  label: `${COUNTRY_NAMES[code] || code} (${COUNTRY_DIAL_CODES[code]})`,
}));

export { COUNTRY_DIAL_CODES, CountryFlag, COUNTRY_NAMES, COUNTRY_SELECT_OPTIONS };

// ─── CountryCodeSelect Component (Searchable) ──────────────────────────────

interface CountryCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function CountryCodeSelect({
  value,
  onChange,
  placeholder = 'Select country',
  disabled = false,
  error = false,
  className,
}: CountryCodeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedInfo = useMemo(() => {
    if (!value) return null;
    const name = COUNTRY_NAMES[value] || value;
    const dial = COUNTRY_DIAL_CODES[value] || '';
    return { name, dial };
  }, [value]);

  const filtered = useMemo(() => {
    if (!search) return COUNTRY_SELECT_OPTIONS;
    const q = search.toLowerCase();
    return COUNTRY_SELECT_OPTIONS.filter(opt => {
      const name = (COUNTRY_NAMES[opt.value] || '').toLowerCase();
      const code = opt.value.toLowerCase();
      const dial = COUNTRY_DIAL_CODES[opt.value] || '';
      return name.includes(q) || code.includes(q) || dial.includes(q);
    });
  }, [search]);

  const handleSelect = useCallback((code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearch('');
  }, [onChange]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const borderColor = error ? 'var(--input-error-border)' : 'var(--input-border)';

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-1.5 rounded-md px-2.5 py-1.5 text-sm',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus)] focus:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        style={{
          backgroundColor: 'var(--select-bg, var(--input-bg))',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: isOpen ? 'var(--input-border-focus)' : borderColor,
          color: value ? 'var(--select-text, var(--input-text))' : 'var(--select-placeholder, var(--color-text-muted))',
        }}
      >
        <span className="truncate flex items-center gap-1.5 text-xs font-medium tabular-nums">
          {value && selectedInfo ? (
            <>
              <CountryFlag code={value} size={20} />
              <span>{value}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>{selectedInfo.dial}</span>
            </>
          ) : placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-180')} style={{ color: 'var(--select-icon, var(--color-text-muted))' }} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border shadow-lg overflow-hidden"
          style={{
            backgroundColor: 'var(--select-dropdown-bg, var(--color-surface))',
            borderColor: 'var(--select-dropdown-border, var(--color-border))',
          }}
        >
          {/* Search input */}
          <div className="p-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or code..."
                className="w-full h-9 pl-8 pr-3 text-sm rounded-md border outline-none focus:ring-2 focus:ring-[var(--input-border-focus)] focus:ring-offset-0"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--input-text)',
                }}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No countries found
              </div>
            ) : (
              filtered.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm cursor-pointer transition-colors',
                      isSelected ? 'font-medium' : '',
                    )}
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--select-item-selected-bg, var(--color-accent-light))'
                        : 'transparent',
                      color: isSelected
                        ? 'var(--select-item-selected-text, var(--color-accent))'
                        : 'var(--select-item-text, var(--color-text))',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'var(--select-item-hover-bg, var(--color-surface-hover))';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <CountryFlag code={opt.value} size={20} />
                    <span className="flex-1 text-left">{COUNTRY_NAMES[opt.value] || opt.value}</span>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                      {opt.value} {COUNTRY_DIAL_CODES[opt.value]}
                    </span>
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

// ─── PhoneInput Component ───────────────────────────────────────────────────

interface PhoneInputProps {
  countryCode: string;
  value: string;
  onChange: (fullPhone: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function PhoneInput({
  countryCode,
  value,
  onChange,
  placeholder = '123 456 7890',
  disabled = false,
  error = false,
  className,
}: PhoneInputProps) {
  const dialCode = COUNTRY_DIAL_CODES[countryCode] || '';
  const prevDialCodeRef = useRef(dialCode);

  // Extract local number by stripping dial code prefix
  function extractLocalNumber(fullValue: string): string {
    if (!fullValue) return '';
    const trimmed = fullValue.trim();

    // Try current country dial code first
    if (dialCode && trimmed.startsWith(dialCode)) {
      return trimmed.slice(dialCode.length).trim();
    }

    // Fallback: strip any +XX... prefix
    const match = trimmed.match(/^\+\d{1,4}\s+(.*)/);
    return match ? match[1] : trimmed;
  }

  const localNumber = extractLocalNumber(value || '');

  // When country changes → update dial code prefix
  useEffect(() => {
    if (prevDialCodeRef.current !== dialCode) {
      const local = extractLocalNumber(value || '');
      if (local) {
        onChange(dialCode ? `${dialCode} ${local}` : local);
      }
      prevDialCodeRef.current = dialCode;
    }
  }, [dialCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const local = e.target.value.replace(/[^0-9]/g, '');
    onChange(dialCode ? `${dialCode} ${local}` : local);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return;
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const borderColor = error ? 'var(--input-error-border)' : 'var(--input-border)';

  return (
    <div
      className={cn(
        'flex rounded-md focus-within:ring-2 focus-within:ring-[var(--input-border-focus)] focus-within:ring-offset-0 transition-all duration-200 ease-out',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      style={{ borderRadius: 'var(--radius)' }}
    >
      {/* Dial code section */}
      <div
        className="flex items-center gap-1.5 px-3 border select-none shrink-0"
        style={{
          backgroundColor: 'var(--sys-bg)',
          borderColor,
          color: 'var(--sys-text)',
          borderTopLeftRadius: 'var(--radius)',
          borderBottomLeftRadius: 'var(--radius)',
          borderRight: 'none',
          height: '2.25rem', // h-9
        }}
      >
        {countryCode ? (
          <CountryFlag code={countryCode} size={20} />
        ) : (
          <span className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>--</span>
        )}
        {dialCode && (
          <span
            className="text-sm font-medium tabular-nums"
            style={{ color: 'var(--sys-text-muted)' }}
          >
            {dialCode}
          </span>
        )}
      </div>

      {/* Number input */}
      <input
        type="tel"
        inputMode="numeric"
        dir="ltr"
        name="phone-local-number"
        autoComplete="one-time-code"
        value={localNumber}
        onChange={handleLocalChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'flex h-9 w-full border px-3 py-1.5 text-sm',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        style={{
          backgroundColor: 'var(--input-bg)',
          borderColor,
          color: 'var(--input-text)',
          borderTopRightRadius: 'var(--radius)',
          borderBottomRightRadius: 'var(--radius)',
          borderLeft: 'none',
        }}
      />
    </div>
  );
}
