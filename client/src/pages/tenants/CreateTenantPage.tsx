import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, MapPin, Mail, Loader2, Briefcase, GitBranch, CreditCard, Globe, Clock, Palette, Hash, Phone } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { PhoneInput, CountryCodeSelect } from '@/components/ui/PhoneInput';
import { useCreateTenant } from '@/hooks/useHierarchy';
import { useScopePath } from '@/hooks/useScopePath';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { extractApiError } from '@/lib/apiError';
import { useToast } from '@/components/ui/toast';

const createTenantSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .min(2, 'Organization name must be at least 2 characters'),
  code: z
    .string()
    .min(1, 'Organization code is required')
    .regex(/^[A-Z0-9-]+$/i, 'Code must contain only letters, numbers, and hyphens'),
  country: z.string().optional().or(z.literal('')),
  timezone: z.string().default('UTC'),
  subscriptionPlan: z.enum(['trial', 'standard', 'professional', 'enterprise']).default('trial'),
  allowedBusinessLines: z
    .string()
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 1;
    }, 'Must be at least 1'),
  allowedBranches: z
    .string()
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 1;
    }, 'Must be at least 1'),
  contactEmail: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  contactPhone: z.string().optional().or(z.literal('')),
  address: z.string().max(500, 'Address must be less than 500 characters').optional().or(z.literal('')),
  primaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format')
    .default('#2563EB'),
});

type CreateTenantFormData = z.infer<typeof createTenantSchema>;

const subscriptionPlans = [
  { value: 'trial', label: 'Trial (14 days)' },
  { value: 'standard', label: 'Standard' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
];

const defaultValues: CreateTenantFormData = {
  name: '',
  code: '',
  country: '',
  timezone: 'UTC',
  subscriptionPlan: 'trial',
  allowedBusinessLines: '5',
  allowedBranches: '10',
  contactEmail: '',
  contactPhone: '',
  address: '',
  primaryColor: '#2563EB',
};

const SCREEN_CODE = 'TENANTS';

export default function CreateTenantPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const createTenant = useCreateTenant();
  const { isSystemScope, getPath } = useScopePath();
  const { canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();
  const [submitError, setSubmitError] = useState<string>('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('EG');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTenantFormData>({
    resolver: zodResolver(createTenantSchema),
    defaultValues,
  });

  const formData = watch();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const listPath = isSystemScope ? '/system/tenants' : '/tenants';

  const onSubmit = async (data: CreateTenantFormData) => {
    setSubmitError('');

    try {
      await createTenant.mutateAsync({
        name: data.name,
        code: data.code.toUpperCase(),
        country: data.country || undefined,
        timezone: data.timezone,
        subscriptionPlan: data.subscriptionPlan as 'trial' | 'standard' | 'enterprise',
        allowedBusinessLines: parseInt(data.allowedBusinessLines),
        allowedBranches: parseInt(data.allowedBranches),
        contactEmail: data.contactEmail || undefined,
        contactPhone: data.contactPhone || undefined,
        address: data.address || undefined,
        primaryColor: data.primaryColor,
      });
      showToast('success', 'Tenant Created');
      navigate(listPath);
    } catch (error) {
      const apiError = extractApiError(error);
      setSubmitError(apiError.message);
    }
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canModify) {
    return <Navigate to={getPath('administration/tenants')} replace />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <StyledIcon icon={Building2} emoji="🏢" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {t('tenants.createNewTenant')}
          </h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Form Card */}
      <div
        className="rounded-lg border max-w-2xl"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Error Banner */}
        {submitError && (
          <div
            className="px-5 py-3 text-sm border-b"
            style={{
              backgroundColor: 'var(--alert-danger-bg)',
              borderColor: 'var(--alert-danger-border)',
              color: 'var(--alert-danger-text)',
            }}
          >
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-5 py-5 space-y-4">
            {/* Name + Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Building2} emoji="🏢" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  Organization Name *
                </Label>
                <Input
                  {...register('name')}
                  placeholder="Enter organization name"
                  className="h-9"
                />
                {errors.name && <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  Organization Code *
                </Label>
                <Input
                  {...register('code')}
                  placeholder="e.g., CLINIC001"
                  className="h-9 uppercase"
                />
                {errors.code && <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.code.message}</p>}
              </div>
            </div>

            {/* Subscription & Limits — system scope only */}
            {isSystemScope && (
              <div
                className="p-4 rounded-lg border"
                style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}
              >
                <h3 className="font-medium mb-4 flex items-center gap-2 text-sm" style={{ color: 'var(--color-text)' }}>
                  <CreditCard className="w-4 h-4" /> Subscription & Limits
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <StyledIcon icon={CreditCard} emoji="💳" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      Subscription Plan
                    </Label>
                    <SimpleSelect
                      value={formData.subscriptionPlan}
                      onValueChange={(value) => setValue('subscriptionPlan', value as CreateTenantFormData['subscriptionPlan'])}
                      options={subscriptionPlans}
                      placeholder="Select plan"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <StyledIcon icon={Briefcase} emoji="💼" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      Allowed Business Lines
                    </Label>
                    <Input
                      {...register('allowedBusinessLines')}
                      type="number"
                      min="1"
                      max="100"
                      placeholder="5"
                      className="h-9"
                    />
                    {errors.allowedBusinessLines && <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.allowedBusinessLines.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <StyledIcon icon={GitBranch} emoji="🌿" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      Allowed Branches
                    </Label>
                    <Input
                      {...register('allowedBranches')}
                      type="number"
                      min="1"
                      max="500"
                      placeholder="10"
                      className="h-9"
                    />
                    {errors.allowedBranches && <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.allowedBranches.message}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Non-system: Subscription Plan inline */}
            {!isSystemScope && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <StyledIcon icon={CreditCard} emoji="💳" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    Subscription Plan
                  </Label>
                  <SimpleSelect
                    value={formData.subscriptionPlan}
                    onValueChange={(value) => setValue('subscriptionPlan', value as CreateTenantFormData['subscriptionPlan'])}
                    options={subscriptionPlans}
                    placeholder="Select plan"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <StyledIcon icon={Palette} emoji="🎨" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    Brand Color
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setValue('primaryColor', e.target.value)}
                      className="w-12 h-9 p-1 cursor-pointer"
                    />
                    <Input
                      {...register('primaryColor')}
                      placeholder="#2563EB"
                      className="h-9 flex-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Country + Timezone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Globe} emoji="🌍" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  Country
                </Label>
                <CountryCodeSelect
                  value={watch('country') || ''}
                  onChange={(code) => {
                    setValue('country', code);
                    setPhoneCountryCode(code);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Clock} emoji="🕐" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  Timezone
                </Label>
                <SimpleSelect
                  value={formData.timezone}
                  onValueChange={(value) => setValue('timezone', value)}
                  options={timezones}
                  placeholder="Select timezone"
                />
              </div>
            </div>

            {/* Brand Color — system scope (non-system already shown above) */}
            {isSystemScope && (
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Palette} emoji="🎨" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  Brand Color
                </Label>
                <div className="flex gap-2 max-w-xs">
                  <Input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setValue('primaryColor', e.target.value)}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    {...register('primaryColor')}
                    placeholder="#2563EB"
                    className="h-9 flex-1"
                  />
                </div>
              </div>
            )}

            {/* Contact Email + Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Mail} emoji="📧" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  Contact Email
                </Label>
                <Input
                  {...register('contactEmail')}
                  type="email"
                  placeholder="admin@organization.com"
                  className="h-9"
                />
                {errors.contactEmail && <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.contactEmail.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Phone} emoji="📱" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  Contact Phone
                </Label>
                <PhoneInput
                  countryCode={phoneCountryCode}
                  value={watch('contactPhone') || ''}
                  onChange={(val) => setValue('contactPhone', val)}
                  placeholder="123 456 7890"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={MapPin} emoji="📍" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                Address
              </Label>
              <Textarea
                {...register('address')}
                placeholder="Enter full address"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-5 py-3 flex items-center justify-end gap-3 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(listPath)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createTenant.isPending}
            >
              {createTenant.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t('tenants.createTenant')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
