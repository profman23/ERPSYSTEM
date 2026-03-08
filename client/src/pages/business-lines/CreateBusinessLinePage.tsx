import { useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GitBranch, Mail, Phone, Loader2, Briefcase, Building2, Tag, FileText } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { PhoneInput, CountryCodeSelect } from '@/components/ui/PhoneInput';
import { useCreateBusinessLine, useTenants } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { extractApiError } from '@/lib/apiError';
import { useToast } from '@/components/ui/toast';

const SCREEN_CODE = 'BUSINESS_LINES';

export default function CreateBusinessLinePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();

  const businessLineTypes = [
    { value: 'veterinary_clinic', label: t('businessLines.veterinaryClinic') },
    { value: 'pet_store', label: t('businessLines.petStore') },
    { value: 'grooming', label: t('businessLines.grooming') },
    { value: 'boarding', label: t('businessLines.boarding') },
    { value: 'general', label: t('businessLines.general') },
  ];
  const isSystemUser = user?.accessScope === 'system';
  const { data: tenants } = useTenants(isSystemUser);
  const createBusinessLine = useCreateBusinessLine();

  const tenantIdFromParams = searchParams.get('tenantId');
  const defaultTenantId = tenantIdFromParams || user?.tenantId || '';

  const [formData, setFormData] = useState({
    tenantId: defaultTenantId,
    name: '',
    businessLineType: 'veterinary_clinic',
    description: '',
    contactEmail: '',
    contactPhone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phoneCountryCode, setPhoneCountryCode] = useState('EG');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.tenantId) newErrors.tenantId = t('businessLines.validationTenantRequired');
    if (!formData.name.trim()) newErrors.name = t('businessLines.validationNameRequired');
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = t('businessLines.validationEmailInvalid');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createBusinessLine.mutateAsync({
        tenantId: formData.tenantId,
        name: formData.name,
        businessLineType: formData.businessLineType,
        description: formData.description || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
      });
      showToast('success', t('businessLines.businessLineCreated'));
      navigate('/business-lines');
    } catch (error) {
      const apiError = extractApiError(error);
      if (Object.keys(apiError.fieldErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...apiError.fieldErrors }));
      }
      setErrors(prev => ({ ...prev, submit: apiError.message }));
    }
  };

  const tenantOptions = tenants?.map(t => ({ value: t.id, label: `${t.name} (${t.code})` })) || [];
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  // Permission guard
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canModify) {
    return <Navigate to="/app/administration/business-lines" replace />;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-3">
          <StyledIcon icon={Briefcase} emoji="💼" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {t('businessLines.createBusinessLine')}
          </h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit}>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {user?.accessScope === 'system' && (
                <div className="space-y-2">
                  <Label htmlFor="tenantId" className="text-xs flex items-center gap-1.5">
                    <StyledIcon icon={Building2} emoji="🏢" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {t('businessLines.tenant')} *
                  </Label>
                  <SimpleSelect
                    value={formData.tenantId}
                    onValueChange={(value) => handleSelectChange('tenantId', value)}
                    options={tenantOptions}
                    placeholder={t('businessLines.selectTenant')}
                  />
                  {errors.tenantId && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.tenantId}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Briefcase} emoji="💼" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('businessLines.businessLineName')} *
                </Label>
                <div className="relative">
                  <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                  <Input
                    id="name"
                    name="name"
                    placeholder={t('businessLines.enterBusinessLineName')}
                    className="pl-10"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                {errors.name && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessLineType" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Tag} emoji="🏷️" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('businessLines.businessType')}
                </Label>
                <SimpleSelect
                  value={formData.businessLineType}
                  onValueChange={(value) => handleSelectChange('businessLineType', value)}
                  options={businessLineTypes}
                  placeholder={t('businessLines.selectBusinessType')}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={FileText} emoji="📄" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('businessLines.description')}
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder={t('businessLines.descriptionPlaceholder')}
                  className="min-h-[80px]"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Mail} emoji="📧" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('businessLines.contactEmail')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    placeholder={t('businessLines.contactEmailPlaceholder')}
                    className="pl-10"
                    value={formData.contactEmail}
                    onChange={handleChange}
                  />
                </div>
                {errors.contactEmail && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.contactEmail}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Phone} emoji="📱" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('businessLines.contactPhone')}
                </Label>
                <div className="flex gap-2">
                  <CountryCodeSelect
                    value={phoneCountryCode}
                    onChange={setPhoneCountryCode}
                    className="w-[140px] flex-shrink-0"
                  />
                  <PhoneInput
                    countryCode={phoneCountryCode}
                    value={formData.contactPhone}
                    onChange={(val) => setFormData((prev) => ({ ...prev, contactPhone: val }))}
                    placeholder={t('businessLines.phonePlaceholder')}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={createBusinessLine.isPending}
              >
                {createBusinessLine.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('businessLines.createBusinessLine')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/business-lines')}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
