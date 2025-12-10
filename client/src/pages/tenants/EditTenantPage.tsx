import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Globe, Mail, Phone, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useTenant, useUpdateTenant } from '@/hooks/useHierarchy';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';

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

export default function EditTenantPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { data: tenant, isLoading: loadingTenant } = useTenant(tenantId);
  const updateTenant = useUpdateTenant();
  
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
      });
    }
  }, [tenant]);

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
      });
      navigate(`/tenants/${tenantId}`);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update tenant';
      setErrors({ submit: message });
    }
  };

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
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          to={`/tenants/${tenantId}`}
          className="inline-flex items-center gap-2 text-sm mb-4 transition-colors hover:opacity-70"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tenant
        </Link>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
          Edit Tenant
        </h1>
        <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          Update organization details for {tenant.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
          <CardDescription>
            Code: <code 
              className="px-2 py-0.5 rounded"
              style={{ backgroundColor: 'var(--color-surface-hover)' }}
            >{tenant.code}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                <Select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  options={statuses}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <div className="relative">
                  <Globe 
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                    style={{ color: 'var(--color-text-muted)' }} 
                  />
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
                <div className="relative">
                  <Phone 
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                    style={{ color: 'var(--color-text-muted)' }} 
                  />
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
              <Textarea
                id="address"
                name="address"
                placeholder="Enter full address"
                className="min-h-[80px]"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={updateTenant.isPending}
              >
                {updateTenant.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/tenants/${tenantId}`)}
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
