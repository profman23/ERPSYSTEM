import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CountryCodeSelect } from '@/components/ui/PhoneInput';
import { apiClient } from '@/lib/api';

// Static timezone fallback for countries not returned by API
const COUNTRY_TIMEZONES: Record<string, string> = {
  EG: 'Africa/Cairo', SA: 'Asia/Riyadh', AE: 'Asia/Dubai', KW: 'Asia/Kuwait',
  QA: 'Asia/Qatar', BH: 'Asia/Bahrain', OM: 'Asia/Muscat', JO: 'Asia/Amman',
  LB: 'Asia/Beirut', IQ: 'Asia/Baghdad', PS: 'Asia/Hebron', YE: 'Asia/Aden',
  SY: 'Asia/Damascus', LY: 'Africa/Tripoli', TN: 'Africa/Tunis', DZ: 'Africa/Algiers',
  MA: 'Africa/Casablanca', SD: 'Africa/Khartoum',
  US: 'America/New_York', CA: 'America/Toronto', MX: 'America/Mexico_City',
  BR: 'America/Sao_Paulo', AR: 'America/Argentina/Buenos_Aires', CO: 'America/Bogota',
  GB: 'Europe/London', DE: 'Europe/Berlin', FR: 'Europe/Paris', IT: 'Europe/Rome',
  ES: 'Europe/Madrid', NL: 'Europe/Amsterdam', BE: 'Europe/Brussels', CH: 'Europe/Zurich',
  AT: 'Europe/Vienna', SE: 'Europe/Stockholm', NO: 'Europe/Oslo', DK: 'Europe/Copenhagen',
  PL: 'Europe/Warsaw', PT: 'Europe/Lisbon',
  IN: 'Asia/Kolkata', PK: 'Asia/Karachi', CN: 'Asia/Shanghai', JP: 'Asia/Tokyo',
  KR: 'Asia/Seoul', AU: 'Australia/Sydney', NZ: 'Pacific/Auckland', SG: 'Asia/Singapore',
  MY: 'Asia/Kuala_Lumpur', ID: 'Asia/Jakarta', TH: 'Asia/Bangkok', PH: 'Asia/Manila',
  VN: 'Asia/Ho_Chi_Minh', TR: 'Europe/Istanbul',
};

interface Country {
  code: string;
  name: string;
  nameEn: string;
  nameAr: string;
  timezone: string;
}

interface CountryTimezoneSelectorProps {
  value: string;
  onChange: (countryCode: string, timezone: string) => void;
  language?: 'en' | 'ar';
  error?: string;
  disabled?: boolean;
}

async function fetchCountries(lang: string): Promise<Country[]> {
  const response = await apiClient.get(`/tenants/meta/countries?lang=${lang}`);
  return response.data.data;
}

export function CountryTimezoneSelector({
  value,
  onChange,
  language = 'en',
  error,
  disabled = false,
}: CountryTimezoneSelectorProps) {
  const { data: countries = [] } = useQuery({
    queryKey: ['countries', language],
    queryFn: () => fetchCountries(language),
    staleTime: 1000 * 60 * 60,
    retry: 2,
  });

  const handleChange = (countryCode: string) => {
    // Try API data first, then static fallback
    const apiCountry = countries.find(c => c.code === countryCode);
    const timezone = apiCountry?.timezone || COUNTRY_TIMEZONES[countryCode] || 'UTC';
    onChange(countryCode, timezone);
  };

  // Resolve timezone for display
  const apiCountry = countries.find(c => c.code === value);
  const displayTimezone = apiCountry?.timezone || COUNTRY_TIMEZONES[value] || '';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label style={{ color: 'var(--sys-text)' }}>
          {language === 'ar' ? 'الدولة *' : 'Country *'}
        </Label>
        <CountryCodeSelect
          value={value || ''}
          onChange={handleChange}
          disabled={disabled}
          error={!!error}
          placeholder={language === 'ar' ? 'اختر الدولة...' : 'Select country...'}
        />
        {error && (
          <p className="text-sm" style={{ color: 'var(--color-text-danger)' }}>
            {error}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label style={{ color: 'var(--sys-text)' }}>
          {language === 'ar' ? 'المنطقة الزمنية' : 'Timezone'}
        </Label>
        <Input
          value={displayTimezone}
          readOnly
          disabled
          className="bg-muted"
          style={{
            backgroundColor: 'var(--sys-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--sys-text-muted)',
          }}
        />
      </div>
    </div>
  );
}
