import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Loader2, 
  Briefcase, 
  GitBranch,
  CreditCard,
  Palette,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormField, FormActions } from '@/components/ui/form-field';
import { useCreateTenant } from '@/hooks/useHierarchy';

const subscriptionPlans = [
  { value: 'trial', label: 'Trial (14 days)' },
  { value: 'standard', label: 'Standard' },
  { value: 'enterprise', label: 'Enterprise' },
];

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Riyadh', label: 'Riyadh (AST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
];

const countries = [
  { value: '', label: 'Select a country...' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Germany', label: 'Germany' },
  { value: 'France', label: 'France' },
  { value: 'Australia', label: 'Australia' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia' },
  { value: 'Egypt', label: 'Egypt' },
  { value: 'Japan', label: 'Japan' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'India', label: 'India' },
  { value: 'Brazil', label: 'Brazil' },
  { value: 'Mexico', label: 'Mexico' },
];

interface FormData {
  organizationName: string;
  organizationCode: string;
  country: string;
  timezone: string;
  subscriptionPlan: 'trial' | 'standard' | 'enterprise';
  allowedBusinessLines: string;
  allowedBranches: string;
  allowedUsers: string;
  storageLimitGB: string;
  apiRateLimit: string;
  brandingColorPrimary: string;
  brandingColorAccent: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

const initialFormData: FormData = {
  organizationName: '',
  organizationCode: '',
  country: '',
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
};

export default function SystemCreateTenantPage() {
  const navigate = useNavigate();
  const createTenant = useCreateTenant();
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'organizationCode') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (submitError) {
      setSubmitError('');
    }
  }, [errors, submitError]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Organization name is required';
    } else if (formData.organizationName.length < 2) {
      newErrors.organizationName = 'Organization name must be at least 2 characters';
    }

    if (!formData.organizationCode.trim()) {
      newErrors.organizationCode = 'Organization code is required';
    } else if (!/^[A-Z0-9_-]+$/.test(formData.organizationCode)) {
      newErrors.organizationCode = 'Code can only contain letters, numbers, hyphens, and underscores';
    } else if (formData.organizationCode.length < 2 || formData.organizationCode.length > 20) {
      newErrors.organizationCode = 'Code must be between 2 and 20 characters';
    }

    const businessLines = parseInt(formData.allowedBusinessLines);
    if (isNaN(businessLines) || businessLines < 1) {
      newErrors.allowedBusinessLines = 'Must be at least 1';
    } else if (businessLines > 1000) {
      newErrors.allowedBusinessLines = 'Cannot exceed 1000';
    }

    const branches = parseInt(formData.allowedBranches);
    if (isNaN(branches) || branches < 1) {
      newErrors.allowedBranches = 'Must be at least 1';
    } else if (branches > 5000) {
      newErrors.allowedBranches = 'Cannot exceed 5000';
    }

    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(formData.brandingColorPrimary)) {
      newErrors.brandingColorPrimary = 'Invalid hex color format';
    }
    if (!hexColorRegex.test(formData.brandingColorAccent)) {
      newErrors.brandingColorAccent = 'Invalid hex color format';
    }

    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    try {
      await createTenant.mutateAsync({
        name: formData.organizationName.trim(),
        code: formData.organizationCode.toUpperCase(),
        country: formData.country || undefined,
        timezone: formData.timezone,
        subscriptionPlan: formData.subscriptionPlan,
        allowedBusinessLines: parseInt(formData.allowedBusinessLines),
        allowedBranches: parseInt(formData.allowedBranches),
        allowedUsers: parseInt(formData.allowedUsers),
        storageLimitGB: parseInt(formData.storageLimitGB),
        apiRateLimit: parseInt(formData.apiRateLimit),
        primaryColor: formData.brandingColorPrimary,
        accentColor: formData.brandingColorAccent,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        address: formData.address || undefined,
      });
      navigate('/system/tenants');
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to create tenant';
      setSubmitError(message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link
          to="/system/tenants"
          className="inline-flex items-center gap-2 text-sm mb-4 transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tenants
        </Link>
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--btn-primary-bg)' }}
          >
            <Building2 className="w-6 h-6" style={{ color: 'var(--color-text-on-accent)' }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              Create New Tenant
            </h1>
            <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Add a new organization to the platform with subscription limits and branding
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {submitError && (
          <Alert variant="error">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                <CardTitle className="text-lg">Organization Information</CardTitle>
              </div>
              <CardDescription>Basic details about the organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField 
                label="Organization Name" 
                required 
                error={errors.organizationName}
                labelFor="organizationName"
              >
                <Input
                  id="organizationName"
                  name="organizationName"
                  placeholder="e.g., Petcare Plus Veterinary"
                  value={formData.organizationName}
                  onChange={handleChange}
                  error={!!errors.organizationName}
                  icon={<Building2 className="w-4 h-4" />}
                />
              </FormField>

              <FormField 
                label="Organization Code" 
                required 
                error={errors.organizationCode}
                hint="Unique identifier (auto-uppercase)"
                labelFor="organizationCode"
              >
                <Input
                  id="organizationCode"
                  name="organizationCode"
                  placeholder="e.g., PETCARE-001"
                  value={formData.organizationCode}
                  onChange={handleChange}
                  error={!!errors.organizationCode}
                  className="uppercase"
                  icon={<Sparkles className="w-4 h-4" />}
                />
              </FormField>

              <FormField label="Country" labelFor="country">
                <Select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  options={countries}
                />
              </FormField>

              <FormField label="Timezone" labelFor="timezone">
                <Select
                  id="timezone"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  options={timezones}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                <CardTitle className="text-lg">Subscription & Limits</CardTitle>
              </div>
              <CardDescription>Configure plan and resource limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Subscription Plan" labelFor="subscriptionPlan">
                <Select
                  id="subscriptionPlan"
                  name="subscriptionPlan"
                  value={formData.subscriptionPlan}
                  onChange={handleChange}
                  options={subscriptionPlans}
                />
              </FormField>

              <FormField 
                label="Allowed Business Lines" 
                error={errors.allowedBusinessLines}
                hint="Maximum number of business lines this tenant can create"
                labelFor="allowedBusinessLines"
              >
                <Input
                  id="allowedBusinessLines"
                  name="allowedBusinessLines"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.allowedBusinessLines}
                  onChange={handleChange}
                  error={!!errors.allowedBusinessLines}
                  icon={<Briefcase className="w-4 h-4" />}
                />
              </FormField>

              <FormField 
                label="Allowed Branches" 
                error={errors.allowedBranches}
                hint="Maximum number of branches across all business lines"
                labelFor="allowedBranches"
              >
                <Input
                  id="allowedBranches"
                  name="allowedBranches"
                  type="number"
                  min="1"
                  max="5000"
                  value={formData.allowedBranches}
                  onChange={handleChange}
                  error={!!errors.allowedBranches}
                  icon={<GitBranch className="w-4 h-4" />}
                />
              </FormField>

              <div 
                className="p-3 rounded-lg border"
                style={{ 
                  backgroundColor: 'var(--color-surface-hover)', 
                  borderColor: 'var(--color-border)' 
                }}
              >
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Additional limits (allowedUsers, storageLimitGB, apiRateLimit) are managed via backend defaults and can be configured later.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                <CardTitle className="text-lg">Branding</CardTitle>
              </div>
              <CardDescription>Customize the organization's visual identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField 
                label="Primary Color" 
                error={errors.brandingColorPrimary}
                hint="Main brand color for buttons and accents"
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
                      name="brandingColorPrimary"
                      value={formData.brandingColorPrimary}
                      onChange={handleChange}
                      className="absolute inset-0 w-full h-full cursor-pointer border-0"
                      style={{ padding: 0 }}
                    />
                  </div>
                  <Input
                    id="brandingColorPrimary"
                    name="brandingColorPrimary"
                    value={formData.brandingColorPrimary}
                    onChange={handleChange}
                    error={!!errors.brandingColorPrimary}
                    placeholder="#2563EB"
                    className="flex-1 font-mono"
                  />
                </div>
              </FormField>

              <FormField 
                label="Accent Color" 
                required
                error={errors.brandingColorAccent}
                hint="Secondary brand color for highlights and gradients"
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
                      name="brandingColorAccent"
                      value={formData.brandingColorAccent}
                      onChange={handleChange}
                      className="absolute inset-0 w-full h-full cursor-pointer border-0"
                      style={{ padding: 0 }}
                    />
                  </div>
                  <Input
                    id="brandingColorAccent"
                    name="brandingColorAccent"
                    value={formData.brandingColorAccent}
                    onChange={handleChange}
                    error={!!errors.brandingColorAccent}
                    placeholder="#8B5CF6"
                    className="flex-1 font-mono"
                  />
                </div>
              </FormField>

              <div 
                className="p-4 rounded-lg border"
                style={{ 
                  backgroundColor: 'var(--color-surface-hover)', 
                  borderColor: 'var(--color-border)' 
                }}
              >
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                  Color Preview
                </p>
                <div className="flex gap-2">
                  <div 
                    className="h-8 flex-1 rounded-md flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: formData.brandingColorPrimary, color: '#FFFFFF' }}
                  >
                    Primary
                  </div>
                  <div 
                    className="h-8 flex-1 rounded-md flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: formData.brandingColorAccent, color: '#FFFFFF' }}
                  >
                    Accent
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </div>
              <CardDescription>Organization contact details (optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField 
                label="Contact Email" 
                error={errors.contactEmail}
                labelFor="contactEmail"
              >
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  placeholder="admin@organization.com"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  error={!!errors.contactEmail}
                  icon={<Mail className="w-4 h-4" />}
                />
              </FormField>

              <FormField label="Contact Phone" labelFor="contactPhone">
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  icon={<Phone className="w-4 h-4" />}
                />
              </FormField>

              <FormField label="Address" labelFor="address">
                <div className="relative">
                  <MapPin 
                    className="absolute left-3 top-3 w-4 h-4 pointer-events-none" 
                    style={{ color: 'var(--color-text-muted)' }} 
                  />
                  <Textarea
                    id="address"
                    name="address"
                    placeholder="Full business address..."
                    value={formData.address}
                    onChange={handleChange}
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
        </div>

        <Card>
          <CardContent className="pt-6">
            <FormActions align="between">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/system/tenants')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTenant.isPending}
              >
                {createTenant.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Tenant
              </Button>
            </FormActions>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
