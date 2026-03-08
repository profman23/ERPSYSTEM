import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Building2, Mail, Loader2, Pencil, Bot } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { PhoneInput, CountryCodeSelect } from '@/components/ui/PhoneInput';
import { useTenant, useUpdateTenant } from '@/hooks/useHierarchy';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Switch } from '@/components/ui/switch';

const subscriptionPlans = [
  { value: 'trial', label: 'Trial' },
  { value: 'standard', label: 'Standard' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

const statuses = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
];

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
];

const SCREEN_CODE = 'TENANTS';

export default function EditTenantPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: tenant, isLoading: loadingTenant } = useTenant(tenantId);
  const updateTenant = useUpdateTenant();
  const { canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);

  const [formData, setFormData] = useState({
    name: '',
    country: '',
    timezone: 'UTC',
    subscriptionPlan: 'trial',
    status: 'active',
    contactEmail: '',
    contactPhone: '',
    address: '',
    primaryColor: '#2563EB',
    aiAssistantEnabled: false,
  });

  const [phoneCountryCode, setPhoneCountryCode] = useState('EG');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        country: tenant.country || '',
        timezone: tenant.timezone || 'UTC',
        subscriptionPlan: tenant.subscriptionPlan || 'trial',
        status: tenant.status || 'active',
        contactEmail: tenant.contactEmail || '',
        contactPhone: tenant.contactPhone || '',
        address: tenant.address || '',
        primaryColor: tenant.primaryColor || '#2563EB',
        aiAssistantEnabled: tenant.aiAssistantEnabled ?? false,
      });
      if (tenant.country) {
        setPhoneCountryCode(tenant.country);
      }
    }
  }, [tenant]);

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
    if (!formData.name.trim()) newErrors.name = 'Organization name is required';
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !tenantId) return;

    try {
      await updateTenant.mutateAsync({
        id: tenantId,
        name: formData.name,
        country: formData.country || undefined,
        timezone: formData.timezone,
        subscriptionPlan: formData.subscriptionPlan as 'trial' | 'standard' | 'enterprise',
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        address: formData.address || undefined,
        primaryColor: formData.primaryColor,
        aiAssistantEnabled: formData.aiAssistantEnabled,
      });
      navigate(`/tenants/${tenantId}`);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update tenant';
      setErrors({ submit: message });
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
    return <Navigate to="/app/administration/tenants" replace />;
  }

  if (loadingTenant) {
    return <LoadingState size="lg" message="Loading tenant..." fullPage />;
  }

  if (!tenant) {
    return (
      <EmptyState
        icon={Building2}
        title="Tenant Not Found"
        description="The tenant you're looking for doesn't exist."
        action={{
          label: 'Back to Tenants',
          onClick: () => navigate('/tenants'),
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-3">
          <StyledIcon icon={Pencil} emoji="✏️" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {t('tenants.editTenant')}
          </h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      <div
        className="rounded-lg border max-w-2xl"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="px-5 py-3 border-b flex items-center gap-2 text-sm font-medium" style={{ borderColor: 'var(--color-border)' }}>
          <Building2 className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          Organization Information
          <span className="font-mono text-xs ms-2" style={{ color: 'var(--color-text-muted)' }}>{tenant.code}</span>
        </div>
        <div className="px-5 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.submit && (
              <div
                className="p-4 rounded-lg border"
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
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name *</Label>
                <div className="relative">
                  <Building2
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--color-text-muted)' }}
                  />
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter organization name"
                    className="pl-10"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                {errors.name && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <SimpleSelect
                  value={formData.status}
                  onValueChange={(value) => handleSelectChange('status', value)}
                  options={statuses}
                  placeholder="Select status"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <CountryCodeSelect
                  value={formData.country}
                  onChange={(code) => {
                    handleSelectChange('country', code);
                    setPhoneCountryCode(code);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <SimpleSelect
                  value={formData.timezone}
                  onValueChange={(value) => handleSelectChange('timezone', value)}
                  options={timezones}
                  placeholder="Select timezone"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="subscriptionPlan">Subscription Plan</Label>
                <SimpleSelect
                  value={formData.subscriptionPlan}
                  onValueChange={(value) => handleSelectChange('subscriptionPlan', value)}
                  options={subscriptionPlans}
                  placeholder="Select plan"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="primaryColor"
                    name="primaryColor"
                    value={formData.primaryColor}
                    onChange={handleChange}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={handleChange}
                    name="primaryColor"
                    placeholder="#2563EB"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--color-text-muted)' }}
                  />
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    placeholder="admin@organization.com"
                    className="pl-10"
                    value={formData.contactEmail}
                    onChange={handleChange}
                  />
                </div>
                {errors.contactEmail && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.contactEmail}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <PhoneInput
                  countryCode={phoneCountryCode}
                  value={formData.contactPhone}
                  onChange={(val) => handleSelectChange('contactPhone', val)}
                  placeholder="123 456 7890"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                placeholder="Enter full address"
                className="min-h-[80px]"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            {/* AI Assistant Toggle */}
            <div
              className="flex items-center justify-between p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--color-surface-hover)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    AI Assistant "Zaki" (ذكي)
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Users with FULL permissions can use voice and text AI commands
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.aiAssistantEnabled}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, aiAssistantEnabled: checked }))}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={updateTenant.isPending}
              >
                {updateTenant.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('common.save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/tenants/${tenantId}`)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
