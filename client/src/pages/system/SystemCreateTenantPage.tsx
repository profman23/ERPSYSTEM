import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Navigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  MapPin,
  Mail,
  Loader2,
  Briefcase,
  GitBranch,
  CreditCard,
  Palette,
  Users,
  HardDrive,
  Gauge,
  Bot,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormField, FormActions } from '@/components/ui/form-field';
import { CountryTimezoneSelector } from '@/components/tenants/CountryTimezoneSelector';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Switch } from '@/components/ui/switch';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { apiClient } from '@/lib/api';
import { extractApiError } from '@/lib/apiError';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '@/components/ui/Skeleton';

const SCREEN_CODE = 'SYSTEM_TENANT_LIST';

// Zod Schema
const systemCreateTenantSchema = z.object({
  organizationName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters'),
  countryCode: z.string().optional().or(z.literal('')),
  timezone: z.string().default('UTC'),
  subscriptionPlan: z.enum(['trial', 'standard', 'professional', 'enterprise']).default('trial'),
  allowedBusinessLines: z
    .string()
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 1 && num <= 1000;
    }, 'Must be between 1 and 1000'),
  allowedBranches: z
    .string()
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 1 && num <= 5000;
    }, 'Must be between 1 and 5000'),
  allowedUsers: z
    .string()
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 1 && num <= 100000;
    }, 'Must be between 1 and 100,000'),
  storageLimitGB: z
    .string()
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 1 && num <= 10000;
    }, 'Must be between 1 and 10,000'),
  apiRateLimit: z
    .string()
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 100 && num <= 100000;
    }, 'Must be between 100 and 100,000'),
  brandingColorPrimary: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'),
  brandingColorAccent: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'),
  contactEmail: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  contactPhone: z.string().optional().or(z.literal('')),
  address: z.string().max(500, 'Address must be less than 500 characters').optional().or(z.literal('')),
  aiAssistantEnabled: z.boolean().default(false),
});

type SystemCreateTenantFormData = z.infer<typeof systemCreateTenantSchema>;

const defaultValues: SystemCreateTenantFormData = {
  organizationName: '',
  countryCode: '',
  timezone: 'UTC',
  subscriptionPlan: 'trial',
  allowedBusinessLines: '5',
  allowedBranches: '10',
  allowedUsers: '50',
  storageLimitGB: '10',
  apiRateLimit: '1000',
  brandingColorPrimary: '#2563EB',
  brandingColorAccent: '#8B5CF6',
  contactEmail: '',
  contactPhone: '',
  address: '',
  aiAssistantEnabled: false,
};

export default function SystemCreateTenantPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const { tenantId } = useParams<{ tenantId?: string }>();

  const isEditMode = !!tenantId;

  const subscriptionPlans = useMemo(() => [
    { value: 'trial', label: t('tenants.trial14') },
    { value: 'standard', label: t('tenants.standard') },
    { value: 'professional', label: t('tenants.professional') },
    { value: 'enterprise', label: t('tenants.enterprise') },
  ], [t]);
  const [submitError, setSubmitError] = useState<string>('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('EG');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SystemCreateTenantFormData>({
    resolver: zodResolver(systemCreateTenantSchema),
    defaultValues,
  });

  // Fetch tenant data in edit mode
  const { data: tenantData, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const response = await apiClient.get(`/system/tenants/${tenantId}`);
      return response.data.data ?? response.data;
    },
    enabled: isEditMode,
    staleTime: 5 * 60 * 1000,
  });

  // Pre-fill form when tenant data loads
  useEffect(() => {
    if (tenantData && isEditMode) {
      // DB has both `countryCode` (2-letter "EG") and `country` (full name "Egypt")
      // The form + CountryTimezoneSelector need the 2-letter code
      const code = tenantData.countryCode || '';
      reset({
        organizationName: tenantData.name || '',
        countryCode: code,
        timezone: tenantData.timezone || 'UTC',
        subscriptionPlan: tenantData.subscriptionPlan || 'trial',
        allowedBusinessLines: String(tenantData.allowedBusinessLines ?? 5),
        allowedBranches: String(tenantData.allowedBranches ?? 10),
        allowedUsers: String(tenantData.allowedUsers ?? 50),
        storageLimitGB: String(tenantData.storageLimitGB ?? 10),
        apiRateLimit: String(tenantData.apiRateLimit ?? 1000),
        brandingColorPrimary: tenantData.primaryColor || '#2563EB',
        brandingColorAccent: tenantData.accentColor || '#8B5CF6',
        contactEmail: tenantData.contactEmail || '',
        contactPhone: tenantData.contactPhone || '',
        address: tenantData.address || '',
        aiAssistantEnabled: tenantData.aiAssistantEnabled ?? false,
      });
      if (code) {
        setPhoneCountryCode(code);
      }
    }
  }, [tenantData, isEditMode, reset]);

  const formData = watch();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: SystemCreateTenantFormData) => {
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const payload = {
        name: data.organizationName.trim(),
        countryCode: data.countryCode || undefined,
        subscriptionPlan: data.subscriptionPlan,
        allowedBusinessLines: parseInt(data.allowedBusinessLines),
        allowedBranches: parseInt(data.allowedBranches),
        allowedUsers: parseInt(data.allowedUsers),
        storageLimitGB: parseInt(data.storageLimitGB),
        apiRateLimit: parseInt(data.apiRateLimit),
        contactEmail: data.contactEmail || undefined,
        contactPhone: data.contactPhone || undefined,
        address: data.address || undefined,
        primaryColor: data.brandingColorPrimary,
        accentColor: data.brandingColorAccent,
        defaultLanguage: 'en',
        aiAssistantEnabled: data.aiAssistantEnabled,
      };

      if (isEditMode) {
        await apiClient.put(`/system/tenants/advanced/${tenantId}`, payload);
        showToast('success', t('tenants.tenantUpdated'));
      } else {
        await apiClient.post('/system/tenants/advanced', payload);
        showToast('success', t('tenants.tenantCreated'));
      }

      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
      navigate('/system/tenants');
    } catch (error) {
      const apiError = extractApiError(error);
      setSubmitError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (permissionsLoading || (isEditMode && tenantLoading)) {
    return (
      <div className="space-y-4 pb-8">
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-[var(--color-accent)]" />
          <div className="h-9 w-64 rounded-md animate-pulse" style={{ backgroundColor: 'var(--color-surface-hover)' }} />
        </div>
        <TableSkeleton rows={4} columns={2} showHeader />
      </div>
    );
  }

  if (!canModify) {
    return <Navigate to="/system/tenants" replace />;
  }

  return (
    <div className="space-y-4 pb-8">
      <div>
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-[var(--color-accent)]" />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isEditMode ? t('tenants.editTenant') : t('tenants.createNewTenant')}
          </h1>
        </div>
        {isEditMode && tenantData?.code && (
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {tenantData.code}
          </p>
        )}
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {submitError && (
          <Alert variant="error">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Section 1: Organization Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" /> {t('tenants.organizationInfo')}
            </CardTitle>
            <CardDescription>{t('tenants.basicDetails')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label={t('tenants.organizationName')}
              required
              error={errors.organizationName?.message}
              labelFor="organizationName"
            >
              <Input
                id="organizationName"
                {...register('organizationName')}
                placeholder={t('tenants.orgNamePlaceholder')}
                error={!!errors.organizationName}
                icon={<Building2 className="w-4 h-4" />}
              />
            </FormField>

            <CountryTimezoneSelector
              value={formData.countryCode || ''}
              onChange={(countryCode, timezone) => {
                setValue('countryCode', countryCode);
                setValue('timezone', timezone);
                setPhoneCountryCode(countryCode);
              }}
              error={errors.countryCode?.message}
            />
          </CardContent>
        </Card>

        {/* Section 2: Subscription & Limits */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> {t('tenants.subscriptionAndLimits')}
            </CardTitle>
            <CardDescription>{t('tenants.configurePlanLimits')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label={t('tenants.subscriptionPlan')} labelFor="subscriptionPlan">
              <SimpleSelect
                value={formData.subscriptionPlan}
                onValueChange={(value) => setValue('subscriptionPlan', value as 'trial' | 'standard' | 'professional' | 'enterprise')}
                options={subscriptionPlans}
                placeholder={t('tenants.selectPlan')}
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                label={t('tenants.businessLines')}
                error={errors.allowedBusinessLines?.message}
                hint={t('tenants.maxBusinessLines')}
                labelFor="allowedBusinessLines"
              >
                <Input
                  id="allowedBusinessLines"
                  {...register('allowedBusinessLines')}
                  type="number"
                  min="1"
                  max="1000"
                  error={!!errors.allowedBusinessLines}
                  icon={<Briefcase className="w-4 h-4" />}
                />
              </FormField>

              <FormField
                label={t('tenants.branches')}
                error={errors.allowedBranches?.message}
                hint={t('tenants.maxBranches')}
                labelFor="allowedBranches"
              >
                <Input
                  id="allowedBranches"
                  {...register('allowedBranches')}
                  type="number"
                  min="1"
                  max="5000"
                  error={!!errors.allowedBranches}
                  icon={<GitBranch className="w-4 h-4" />}
                />
              </FormField>

              <FormField
                label={t('tenants.users')}
                error={errors.allowedUsers?.message}
                hint={t('tenants.maxUsers')}
                labelFor="allowedUsers"
              >
                <Input
                  id="allowedUsers"
                  {...register('allowedUsers')}
                  type="number"
                  min="1"
                  max="100000"
                  error={!!errors.allowedUsers}
                  icon={<Users className="w-4 h-4" />}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label={t('tenants.storageLimitGB')}
                error={errors.storageLimitGB?.message}
                labelFor="storageLimitGB"
              >
                <Input
                  id="storageLimitGB"
                  {...register('storageLimitGB')}
                  type="number"
                  min="1"
                  max="10000"
                  error={!!errors.storageLimitGB}
                  icon={<HardDrive className="w-4 h-4" />}
                />
              </FormField>

              <FormField
                label={t('tenants.apiRateLimit')}
                error={errors.apiRateLimit?.message}
                labelFor="apiRateLimit"
              >
                <Input
                  id="apiRateLimit"
                  {...register('apiRateLimit')}
                  type="number"
                  min="100"
                  max="100000"
                  error={!!errors.apiRateLimit}
                  icon={<Gauge className="w-4 h-4" />}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Branding */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="w-5 h-5" /> {t('tenants.branding')}
            </CardTitle>
            <CardDescription>{t('tenants.customizeBranding')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label={t('tenants.primaryColor')}
                error={errors.brandingColorPrimary?.message}
                hint={t('tenants.mainBrandColor')}
                labelFor="brandingColorPrimary"
              >
                <div className="flex gap-3">
                  <div
                    className="relative w-14 h-11 rounded-md border overflow-hidden flex-shrink-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <input
                      type="color"
                      id="brandingColorPrimaryPicker"
                      value={formData.brandingColorPrimary}
                      onChange={(e) => setValue('brandingColorPrimary', e.target.value)}
                      className="absolute inset-0 w-full h-full cursor-pointer border-0"
                      style={{ padding: 0 }}
                    />
                  </div>
                  <Input
                    id="brandingColorPrimary"
                    {...register('brandingColorPrimary')}
                    error={!!errors.brandingColorPrimary}
                    placeholder="#2563EB"
                    className="flex-1 font-mono"
                  />
                </div>
              </FormField>

              <FormField
                label={t('tenants.accentColor')}
                error={errors.brandingColorAccent?.message}
                hint={t('tenants.secondaryBrandColor')}
                labelFor="brandingColorAccent"
              >
                <div className="flex gap-3">
                  <div
                    className="relative w-14 h-11 rounded-md border overflow-hidden flex-shrink-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <input
                      type="color"
                      id="brandingColorAccentPicker"
                      value={formData.brandingColorAccent}
                      onChange={(e) => setValue('brandingColorAccent', e.target.value)}
                      className="absolute inset-0 w-full h-full cursor-pointer border-0"
                      style={{ padding: 0 }}
                    />
                  </div>
                  <Input
                    id="brandingColorAccent"
                    {...register('brandingColorAccent')}
                    error={!!errors.brandingColorAccent}
                    placeholder="#8B5CF6"
                    className="flex-1 font-mono"
                  />
                </div>
              </FormField>
            </div>

            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-surface-hover)',
                borderColor: 'var(--color-border)'
              }}
            >
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                {t('tenants.colorPreview')}
              </p>
              <div className="flex gap-2">
                <div
                  className="h-8 flex-1 rounded-md flex items-center justify-center text-xs font-medium"
                  style={{ backgroundColor: formData.brandingColorPrimary, color: '#FFFFFF' }}
                >
                  {t('tenants.primary')}
                </div>
                <div
                  className="h-8 flex-1 rounded-md flex items-center justify-center text-xs font-medium"
                  style={{ backgroundColor: formData.brandingColorAccent, color: '#FFFFFF' }}
                >
                  {t('tenants.accent')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Contact Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5" /> {t('tenants.contactInfo')}
            </CardTitle>
            <CardDescription>{t('tenants.contactInfoDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label={t('tenants.contactEmail')}
                error={errors.contactEmail?.message}
                labelFor="contactEmail"
              >
                <Input
                  id="contactEmail"
                  {...register('contactEmail')}
                  type="email"
                  placeholder={t('tenants.contactEmailPlaceholder')}
                  error={!!errors.contactEmail}
                  icon={<Mail className="w-4 h-4" />}
                />
              </FormField>

              <FormField label={t('tenants.contactPhone')} labelFor="contactPhone">
                <PhoneInput
                  value={formData.contactPhone || ''}
                  onChange={(val) => setValue('contactPhone', val)}
                  countryCode={phoneCountryCode}
                  placeholder={t('tenants.phoneNumber')}
                />
              </FormField>
            </div>

            <FormField label={t('tenants.addressLabel')} labelFor="address" error={errors.address?.message}>
              <div className="relative">
                <MapPin
                  className="absolute left-3 top-3 w-4 h-4 pointer-events-none"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <Textarea
                  id="address"
                  {...register('address')}
                  placeholder={t('tenants.fullBusinessAddress')}
                  className="pl-10 min-h-[80px]"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--input-border)',
                    color: 'var(--input-text)',
                  }}
                />
              </div>
            </FormField>
          </CardContent>
        </Card>

        {/* Section 5: AI Assistant */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="w-5 h-5" /> {t('tenants.aiAssistant')}
            </CardTitle>
            <CardDescription>{t('tenants.aiAssistantDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="flex items-center justify-between p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-surface-hover)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="space-y-1">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {t('tenants.enableAiAssistant')}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {t('tenants.aiAssistantPermNote')}
                </p>
              </div>
              <Switch
                checked={formData.aiAssistantEnabled}
                onCheckedChange={(checked) => setValue('aiAssistantEnabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <FormActions align="between">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/system/tenants')}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting && <Loader2 className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} animate-spin`} />}
                {isEditMode ? t('common.saveChanges') : t('tenants.createTenant')}
              </Button>
            </FormActions>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
