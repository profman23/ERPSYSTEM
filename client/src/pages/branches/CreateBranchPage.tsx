/**
 * CreateBranchPage — Create & Edit Branch Form (APP Panel)
 *
 * Create mode: /app/administration/branches/create
 * Edit mode:   /app/administration/branches/:branchId/edit
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin, Mail, Phone, Loader2, Briefcase, Building, Globe, Hash,
  Clock, FileText, Landmark, Home,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput, CountryCodeSelect } from '@/components/ui/PhoneInput';
import { useCreateBranch, useUpdateBranch, useBranch, useBusinessLines, useTenants } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';
import { useScopePath } from '@/hooks/useScopePath';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { extractApiError } from '@/lib/apiError';
import { useToast } from '@/components/ui/toast';

// Country → Timezone mapping (reused from CountryTimezoneSelector)
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

interface FormData {
  businessLineId: string;
  name: string;
  country: string;
  city: string;
  address: string;
  buildingNumber: string;
  vatRegistrationNumber: string;
  commercialRegistrationNumber: string;
  district: string;
  email: string;
  phone: string;
  postalCode: string;
  timezone: string;
}

const initialFormData: FormData = {
  businessLineId: '',
  name: '',
  country: '',
  city: '',
  address: '',
  buildingNumber: '',
  vatRegistrationNumber: '',
  commercialRegistrationNumber: '',
  district: '',
  email: '',
  phone: '',
  postalCode: '',
  timezone: '',
};

const SCREEN_CODE = 'BRANCHES';

export default function CreateBranchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { branchId } = useParams<{ branchId: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { getPath } = useScopePath();
  const { canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();

  const isEditMode = !!branchId;
  const isSystemUser = user?.accessScope === 'system';

  // Data hooks
  const { data: tenants } = useTenants(isSystemUser);
  const tenantId = user?.tenantId || tenants?.[0]?.id;
  const { data: businessLines } = useBusinessLines(tenantId);
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const { data: existingBranch, isLoading: isLoadingBranch } = useBranch(branchId);

  const businessLineIdFromParams = searchParams.get('businessLineId');

  // Form state
  const [formData, setFormData] = useState<FormData>({
    ...initialFormData,
    businessLineId: businessLineIdFromParams || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phoneCountryCode, setPhoneCountryCode] = useState('EG');
  const [formLoaded, setFormLoaded] = useState(false);

  // Pre-fill form in edit mode
  useEffect(() => {
    if (isEditMode && existingBranch && !formLoaded) {
      setFormData({
        businessLineId: existingBranch.businessLineId || '',
        name: existingBranch.name || '',
        country: existingBranch.country || '',
        city: existingBranch.city || '',
        address: existingBranch.address || '',
        buildingNumber: existingBranch.buildingNumber || '',
        vatRegistrationNumber: existingBranch.vatRegistrationNumber || '',
        commercialRegistrationNumber: existingBranch.commercialRegistrationNumber || '',
        district: existingBranch.district || '',
        email: existingBranch.email || '',
        phone: existingBranch.phone || '',
        postalCode: existingBranch.postalCode || '',
        timezone: existingBranch.timezone || COUNTRY_TIMEZONES[existingBranch.country || ''] || '',
      });
      setFormLoaded(true);
    }
  }, [isEditMode, existingBranch, formLoaded]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const handleSelectChange = useCallback((name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const handleCountryChange = useCallback((countryCode: string) => {
    const tz = COUNTRY_TIMEZONES[countryCode] || '';
    setFormData((prev) => ({ ...prev, country: countryCode, timezone: tz }));
    if (errors.country) {
      setErrors((prev) => ({ ...prev, country: '' }));
    }
  }, [errors]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!isEditMode && !formData.businessLineId) newErrors.businessLineId = t('branches.validationBusinessLineRequired');
    if (!formData.name.trim()) newErrors.name = t('branches.validationNameRequired');
    if (!formData.country) newErrors.country = t('branches.validationCountryRequired');
    if (!formData.city.trim()) newErrors.city = t('branches.validationCityRequired');
    if (!formData.address.trim()) newErrors.address = t('branches.validationStreetRequired');
    if (!formData.buildingNumber.trim()) {
      newErrors.buildingNumber = t('branches.validationBuildingRequired');
    } else if (formData.buildingNumber.length > 50) {
      newErrors.buildingNumber = t('branches.validationMaxLength', { field: t('branches.buildingNumber'), max: 50 });
    }
    if (!formData.vatRegistrationNumber.trim()) {
      newErrors.vatRegistrationNumber = t('branches.validationVatRequired');
    } else if (formData.vatRegistrationNumber.length > 50) {
      newErrors.vatRegistrationNumber = t('branches.validationMaxLength', { field: t('branches.vatNumber'), max: 50 });
    }
    if (!formData.commercialRegistrationNumber.trim()) {
      newErrors.commercialRegistrationNumber = t('branches.validationCrRequired');
    } else if (formData.commercialRegistrationNumber.length > 100) {
      newErrors.commercialRegistrationNumber = t('branches.validationMaxLength', { field: t('branches.crNumber'), max: 100 });
    }
    if (formData.name.length > 255) {
      newErrors.name = t('branches.validationMaxLength', { field: t('branches.branchName'), max: 255 });
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('branches.validationEmailInvalid');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isEditMode]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (isEditMode && branchId) {
        await updateBranch.mutateAsync({
          id: branchId,
          name: formData.name,
          country: formData.country,
          city: formData.city,
          address: formData.address || undefined,
          buildingNumber: formData.buildingNumber,
          vatRegistrationNumber: formData.vatRegistrationNumber,
          commercialRegistrationNumber: formData.commercialRegistrationNumber,
          district: formData.district || undefined,
          postalCode: formData.postalCode || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          timezone: formData.timezone || undefined,
        });
      } else {
        await createBranch.mutateAsync({
          businessLineId: formData.businessLineId,
          name: formData.name,
          country: formData.country,
          city: formData.city,
          address: formData.address,
          buildingNumber: formData.buildingNumber,
          vatRegistrationNumber: formData.vatRegistrationNumber,
          commercialRegistrationNumber: formData.commercialRegistrationNumber,
          district: formData.district || undefined,
          postalCode: formData.postalCode || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          timezone: formData.timezone || undefined,
        });
      }
      showToast('success', isEditMode ? t('branches.branchUpdated') : t('branches.branchCreated'));
      navigate(getPath('administration/branches'));
    } catch (error) {
      const apiError = extractApiError(error);
      if (Object.keys(apiError.fieldErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...apiError.fieldErrors }));
      }
      setErrors(prev => ({ ...prev, submit: apiError.message }));
    }
  }, [formData, validate, isEditMode, branchId, createBranch, updateBranch, navigate, getPath]);

  const businessLineOptions = businessLines?.map(bl => ({ value: bl.id, label: `${bl.name} (${bl.code})` })) || [];
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const backPath = getPath('administration/branches');
  const isPending = createBranch.isPending || updateBranch.isPending;

  // Permission guard
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canModify) {
    return <Navigate to={getPath('administration/branches')} replace />;
  }

  // Loading state for edit mode
  if (isEditMode && isLoadingBranch) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-3">
          <StyledIcon icon={MapPin} emoji="📍" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isEditMode ? t('branches.editBranch') : t('branches.createBranch')}
          </h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      <div className="rounded-lg border max-w-4xl" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <form onSubmit={handleSubmit} className="px-5 py-5">
            {errors.submit && (
              <div
                className="p-4 rounded-lg border mb-6"
                style={{
                  backgroundColor: 'var(--alert-danger-bg)',
                  borderColor: 'var(--alert-danger-border)',
                  color: 'var(--alert-danger-text)'
                }}
              >
                {errors.submit}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Business Line */}
              <div className="space-y-2">
                <Label htmlFor="businessLineId" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Briefcase} emoji="💼" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('branches.businessLine')} {!isEditMode && '*'}
                </Label>
                {isEditMode ? (
                  <div
                    className="h-10 px-3 rounded-md border flex items-center text-sm"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--input-border)',
                      color: 'var(--color-text-muted)',
                      opacity: 0.7,
                    }}
                  >
                    {businessLineOptions.find(o => o.value === formData.businessLineId)?.label || existingBranch?.businessLineId || t('branches.nA')}
                  </div>
                ) : (
                  <>
                    <SimpleSelect
                      value={formData.businessLineId}
                      onValueChange={(value) => handleSelectChange('businessLineId', value)}
                      options={businessLineOptions}
                      placeholder={t('branches.selectBusinessLinePlaceholder')}
                    />
                    {errors.businessLineId && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.businessLineId}</p>}
                  </>
                )}
              </div>

              {/* Branch Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={MapPin} emoji="📍" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('branches.branchName')} *
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                  <Input
                    id="name"
                    name="name"
                    placeholder={t('branches.enterBranchName')}
                    className="pl-10"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                {errors.name && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.name}</p>}
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Globe} emoji="🌍" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('branches.country')} *
                </Label>
                <CountryCodeSelect
                  value={formData.country}
                  onChange={handleCountryChange}
                  placeholder={t('branches.selectCountry')}
                />
                {errors.country && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.country}</p>}
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Building} emoji="🏗️" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('branches.city')} *
                </Label>
                <Input
                  id="city"
                  name="city"
                  placeholder={t('branches.cityPlaceholder')}
                  value={formData.city}
                  onChange={handleChange}
                />
                {errors.city && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.city}</p>}
              </div>

              {/* Street (full width) */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={MapPin} emoji="📍" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('branches.street')} *
                </Label>
                <Input
                  id="address"
                  name="address"
                  placeholder={t('branches.streetPlaceholder')}
                  value={formData.address}
                  onChange={handleChange}
                />
                {errors.address && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.address}</p>}
              </div>

              {/* Building Number */}
              <div className="space-y-2">
                <Label htmlFor="buildingNumber" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Home} emoji="🏠" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('branches.buildingNumber')} *
                </Label>
                <Input
                  id="buildingNumber"
                  name="buildingNumber"
                  placeholder={t('branches.buildingNumberPlaceholder')}
                  value={formData.buildingNumber}
                  onChange={handleChange}
                />
                {errors.buildingNumber && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.buildingNumber}</p>}
              </div>

              {/* District */}
              <div className="space-y-2">
                <Label htmlFor="district" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Building} emoji="🏢" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('branches.district')}
                </Label>
                <Input
                  id="district"
                  name="district"
                  placeholder={t('branches.districtPlaceholder')}
                  value={formData.district}
                  onChange={handleChange}
                />
              </div>

              {/* VAT Registration Number */}
              <div className="space-y-2">
                <Label htmlFor="vatRegistrationNumber" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={FileText} emoji="📄" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('branches.vatRegistrationNumber')} *
                </Label>
                <Input
                  id="vatRegistrationNumber"
                  name="vatRegistrationNumber"
                  placeholder={t('branches.vatPlaceholder')}
                  value={formData.vatRegistrationNumber}
                  onChange={handleChange}
                />
                {errors.vatRegistrationNumber && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.vatRegistrationNumber}</p>}
              </div>

              {/* Commercial Registration Number */}
              <div className="space-y-2">
                <Label htmlFor="commercialRegistrationNumber" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Landmark} emoji="🏛️" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('branches.commercialRegistration')} *
                </Label>
                <Input
                  id="commercialRegistrationNumber"
                  name="commercialRegistrationNumber"
                  placeholder={t('branches.crPlaceholder')}
                  value={formData.commercialRegistrationNumber}
                  onChange={handleChange}
                />
                {errors.commercialRegistrationNumber && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.commercialRegistrationNumber}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Mail} emoji="📧" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('branches.email')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={t('branches.emailPlaceholder')}
                    className="pl-10"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                {errors.email && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.email}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Phone} emoji="📱" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('branches.phone')}
                </Label>
                <div className="flex gap-2">
                  <CountryCodeSelect
                    value={phoneCountryCode}
                    onChange={setPhoneCountryCode}
                    className="w-[140px] flex-shrink-0"
                  />
                  <PhoneInput
                    countryCode={phoneCountryCode}
                    value={formData.phone}
                    onChange={(val) => setFormData((prev) => ({ ...prev, phone: val }))}
                    placeholder="123 456 7890"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Zip Code */}
              <div className="space-y-2">
                <Label htmlFor="postalCode" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('branches.zipCode')}
                </Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  placeholder={t('branches.zipCodePlaceholder')}
                  value={formData.postalCode}
                  onChange={handleChange}
                />
              </div>

              {/* Timezone (read-only, auto from country) */}
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Clock} emoji="🕐" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('branches.timezone')}
                </Label>
                <Input
                  id="timezone"
                  name="timezone"
                  value={formData.timezone}
                  readOnly
                  disabled
                  placeholder={t('branches.timezoneAuto')}
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--input-border)',
                    color: 'var(--color-text-muted)',
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={isPending}
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditMode ? t('common.save') : t('branches.createBranch')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(backPath)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
      </div>
    </div>
  );
}
