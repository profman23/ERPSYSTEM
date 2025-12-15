import { useQuery } from '@tanstack/react-query';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
  const response = await fetch(`/api/v1/tenants/meta/countries?lang=${lang}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch countries');
  const data = await response.json();
  return data.data;
}

export function CountryTimezoneSelector({
  value,
  onChange,
  language = 'en',
  error,
  disabled = false,
}: CountryTimezoneSelectorProps) {
  const { data: countries = [], isLoading } = useQuery({
    queryKey: ['countries', language],
    queryFn: () => fetchCountries(language),
    staleTime: 1000 * 60 * 60,
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryCode = e.target.value;
    const country = countries.find(c => c.code === countryCode);
    if (country) {
      onChange(countryCode, country.timezone);
    }
  };

  const selectedCountry = countries.find(c => c.code === value);

  return (
    <div className="space-y-2">
      <Label style={{ color: 'var(--sys-text)' }}>
        {language === 'ar' ? 'الدولة' : 'Country'}
      </Label>
      <Select
        value={value}
        onChange={handleChange}
        disabled={disabled || isLoading}
        error={!!error}
        placeholder={isLoading ? 'Loading...' : (language === 'ar' ? 'اختر الدولة...' : 'Select country...')}
        options={countries.map(country => ({
          value: country.code,
          label: language === 'ar' ? country.nameAr : country.nameEn,
        }))}
      />
      {selectedCountry && (
        <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>
          {language === 'ar' ? 'المنطقة الزمنية: ' : 'Timezone: '}
          {selectedCountry.timezone}
        </p>
      )}
      {error && (
        <p className="text-sm" style={{ color: 'var(--color-text-danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
