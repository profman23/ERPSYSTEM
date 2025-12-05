import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Globe, MapPin, Mail, Phone, Loader2, Briefcase, GitBranch, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useCreateTenant } from '@/hooks/useHierarchy';
import { useScopePath } from '@/hooks/useScopePath';

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

export default function CreateTenantPage() {
  const navigate = useNavigate();
  const createTenant = useCreateTenant();
  const { isSystemScope } = useScopePath();
  
  const [formData, setFormData] = useState({
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Organization name is required';
    if (!formData.code.trim()) newErrors.code = 'Organization code is required';
    if (formData.code && !/^[A-Z0-9-]+$/i.test(formData.code)) {
      newErrors.code = 'Code must contain only letters, numbers, and hyphens';
    }
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }
    const businessLines = parseInt(formData.allowedBusinessLines);
    if (isNaN(businessLines) || businessLines < 1) {
      newErrors.allowedBusinessLines = 'Must be at least 1';
    }
    const branches = parseInt(formData.allowedBranches);
    if (isNaN(branches) || branches < 1) {
      newErrors.allowedBranches = 'Must be at least 1';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createTenant.mutateAsync({
        name: formData.name,
        code: formData.code.toUpperCase(),
        country: formData.country || undefined,
        timezone: formData.timezone,
        subscriptionPlan: formData.subscriptionPlan,
        allowedBusinessLines: parseInt(formData.allowedBusinessLines),
        allowedBranches: parseInt(formData.allowedBranches),
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        address: formData.address || undefined,
        primaryColor: formData.primaryColor,
      });
      navigate(isSystemScope ? '/system/tenants' : '/tenants');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create tenant';
      setErrors({ submit: message });
    }
  };

  if (isSystemScope) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <Link
            to="/system/tenants"
            className="inline-flex items-center gap-2 text-sm mb-4 text-[var(--sys-text-secondary)] hover:text-[var(--sys-accent)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tenants
          </Link>
          <h1 className="text-3xl font-bold text-[var(--sys-text)]">
            Create New Tenant
          </h1>
          <p className="mt-2 text-[var(--sys-text-secondary)]">
            Add a new organization to the platform
          </p>
        </div>

        <div 
          className="rounded-xl border p-6"
          style={{ 
            backgroundColor: 'var(--sys-surface)', 
            borderColor: 'var(--sys-border)' 
          }}
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[var(--sys-text)]">Organization Information</h2>
            <p className="text-sm text-[var(--sys-text-secondary)]">Enter the basic organization details</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {errors.submit}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[var(--sys-text)]">Organization Name *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sys-text-muted)]" />
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter organization name"
                    className="pl-10 bg-[var(--sys-bg)] border-[var(--sys-border)] text-[var(--sys-text)] placeholder:text-[var(--sys-text-muted)]"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                {errors.name && <p className="text-sm text-red-400">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-[var(--sys-text)]">Organization Code *</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="e.g., CLINIC001"
                  value={formData.code}
                  onChange={handleChange}
                  className="uppercase bg-[var(--sys-bg)] border-[var(--sys-border)] text-[var(--sys-text)] placeholder:text-[var(--sys-text-muted)]"
                />
                {errors.code && <p className="text-sm text-red-400">{errors.code}</p>}
              </div>
            </div>

            <div 
              className="p-4 rounded-lg border"
              style={{ backgroundColor: 'var(--sys-bg)', borderColor: 'var(--sys-border)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-[var(--sys-accent)]" />
                <h3 className="font-medium text-[var(--sys-text)]">Subscription & Limits</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[var(--sys-text)]">Subscription Plan</Label>
                  <Select
                    id="subscriptionPlan"
                    name="subscriptionPlan"
                    value={formData.subscriptionPlan}
                    onChange={handleChange}
                    options={subscriptionPlans}
                    className="bg-[var(--sys-surface)] border-[var(--sys-border)] text-[var(--sys-text)]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[var(--sys-text)]">Allowed Business Lines</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sys-text-muted)]" />
                    <Input
                      id="allowedBusinessLines"
                      name="allowedBusinessLines"
                      type="number"
                      min="1"
                      max="100"
                      placeholder="5"
                      className="pl-10 bg-[var(--sys-surface)] border-[var(--sys-border)] text-[var(--sys-text)] placeholder:text-[var(--sys-text-muted)]"
                      value={formData.allowedBusinessLines}
                      onChange={handleChange}
                    />
                  </div>
                  {errors.allowedBusinessLines && <p className="text-sm text-red-400">{errors.allowedBusinessLines}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-[var(--sys-text)]">Allowed Branches</Label>
                  <div className="relative">
                    <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sys-text-muted)]" />
                    <Input
                      id="allowedBranches"
                      name="allowedBranches"
                      type="number"
                      min="1"
                      max="500"
                      placeholder="10"
                      className="pl-10 bg-[var(--sys-surface)] border-[var(--sys-border)] text-[var(--sys-text)] placeholder:text-[var(--sys-text-muted)]"
                      value={formData.allowedBranches}
                      onChange={handleChange}
                    />
                  </div>
                  {errors.allowedBranches && <p className="text-sm text-red-400">{errors.allowedBranches}</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[var(--sys-text)]">Country</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sys-text-muted)]" />
                  <Input
                    id="country"
                    name="country"
                    placeholder="e.g., United States"
                    className="pl-10 bg-[var(--sys-bg)] border-[var(--sys-border)] text-[var(--sys-text)] placeholder:text-[var(--sys-text-muted)]"
                    value={formData.country}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[var(--sys-text)]">Timezone</Label>
                <Select
                  id="timezone"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  options={timezones}
                  className="bg-[var(--sys-bg)] border-[var(--sys-border)] text-[var(--sys-text)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[var(--sys-text)]">Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="primaryColor"
                    name="primaryColor"
                    value={formData.primaryColor}
                    onChange={handleChange}
                    className="w-12 h-10 p-1 cursor-pointer bg-[var(--sys-bg)] border-[var(--sys-border)]"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={handleChange}
                    name="primaryColor"
                    placeholder="#2563EB"
                    className="flex-1 bg-[var(--sys-bg)] border-[var(--sys-border)] text-[var(--sys-text)]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[var(--sys-text)]">Contact Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sys-text-muted)]" />
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    placeholder="admin@organization.com"
                    className="pl-10 bg-[var(--sys-bg)] border-[var(--sys-border)] text-[var(--sys-text)] placeholder:text-[var(--sys-text-muted)]"
                    value={formData.contactEmail}
                    onChange={handleChange}
                  />
                </div>
                {errors.contactEmail && <p className="text-sm text-red-400">{errors.contactEmail}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-[var(--sys-text)]">Contact Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sys-text-muted)]" />
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    placeholder="+1-555-123-4567"
                    className="pl-10 bg-[var(--sys-bg)] border-[var(--sys-border)] text-[var(--sys-text)] placeholder:text-[var(--sys-text-muted)]"
                    value={formData.contactPhone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[var(--sys-text)]">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-[var(--sys-text-muted)]" />
                <Textarea
                  id="address"
                  name="address"
                  placeholder="Enter full address"
                  className="pl-10 min-h-[80px] bg-[var(--sys-bg)] border-[var(--sys-border)] text-[var(--sys-text)] placeholder:text-[var(--sys-text-muted)]"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="bg-[var(--sys-accent)] hover:bg-[var(--sys-accent)]/90 text-white"
                disabled={createTenant.isPending}
              >
                {createTenant.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Tenant
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/system/tenants')}
                className="border-[var(--sys-border)] text-[var(--sys-text)] hover:bg-[var(--sys-surface-hover)]"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          to="/tenants"
          className="inline-flex items-center gap-2 text-sm mb-4 hover:text-[#2563EB] transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tenants
        </Link>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
          Create New Tenant
        </h1>
        <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          Add a new organization to the system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
          <CardDescription>Enter the basic organization details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
                {errors.submit}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter organization name"
                    className="pl-10"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Organization Code *</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="e.g., CLINIC001"
                  value={formData.code}
                  onChange={handleChange}
                  className="uppercase"
                />
                {errors.code && <p className="text-sm text-red-600">{errors.code}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
                  <Input
                    id="country"
                    name="country"
                    placeholder="e.g., United States"
                    className="pl-10"
                    value={formData.country}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  id="timezone"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  options={timezones}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="subscriptionPlan">Subscription Plan</Label>
                <Select
                  id="subscriptionPlan"
                  name="subscriptionPlan"
                  value={formData.subscriptionPlan}
                  onChange={handleChange}
                  options={subscriptionPlans}
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
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
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
                {errors.contactEmail && <p className="text-sm text-red-600">{errors.contactEmail}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    placeholder="+1-555-123-4567"
                    className="pl-10"
                    value={formData.contactPhone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4" style={{ color: '#9CA3AF' }} />
                <Textarea
                  id="address"
                  name="address"
                  placeholder="Enter full address"
                  className="pl-10 min-h-[80px]"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="bg-[#2563EB] hover:bg-[#1E40AF]"
                disabled={createTenant.isPending}
              >
                {createTenant.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Tenant
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/tenants')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
