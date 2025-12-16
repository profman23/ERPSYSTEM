import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api';

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
  const response = await apiClient.get(`/api/v1/tenants/meta/countries?lang=${lang}`);
  return response.data.data;
}

export function CountryTimezoneSelector({
  value,
  onChange,
  language = 'en',
  error,
  disabled = false,
}: CountryTimezoneSelectorProps) {
  const { data: countries = [], isLoading, isError } = useQuery({
    queryKey: ['countries', language],
    queryFn: () => fetchCountries(language),
    staleTime: 1000 * 60 * 60,
    retry: 2,
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryCode = e.target.value;
    const country = countries.find(c => c.code === countryCode);
    if (country) {
      onChange(countryCode, country.timezone);
    }
  };

  const selectedCountry = countries.find(c => c.code === value);

  if (isError) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label style={{ color: 'var(--sys-text)' }}>
            {language === 'ar' ? 'الدولة *' : 'Country *'}
          </Label>
          <div 
            className="p-3 rounded-lg border text-sm"
            style={{ 
              backgroundColor: 'var(--badge-warning-bg)', 
              borderColor: 'var(--badge-warning-border)',
              color: 'var(--color-text-warning)'
            }}
          >
            Unable to load countries. Please try again.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label style={{ color: 'var(--sys-text)' }}>
          {language === 'ar' ? 'الدولة *' : 'Country *'}
        </Label>
        <select
          value={value}
          onChange={handleChange}
          disabled={disabled || isLoading}
          className="w-full h-10 px-3 rounded-md border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{
            backgroundColor: 'var(--input-bg)',
            borderColor: error ? 'var(--input-error-border)' : 'var(--input-border)',
            color: 'var(--input-text)',
          }}
        >
          <option value="" disabled>
            {isLoading 
              ? (language === 'ar' ? 'جاري التحميل...' : 'Loading...') 
              : (language === 'ar' ? 'اختر الدولة...' : 'Select country...')}
          </option>
          {countries.map(country => (
            <option key={country.code} value={country.code}>
              {language === 'ar' ? country.nameAr : country.nameEn}
            </option>
          ))}
        </select>
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
          value={selectedCountry?.timezone || ''}
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
