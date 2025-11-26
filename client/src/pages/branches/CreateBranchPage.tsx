import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Mail, Phone, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useCreateBranch, useBusinessLines, useTenants } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
];

export default function CreateBranchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: tenants } = useTenants();
  const tenantId = user?.tenantId || tenants?.[0]?.id;
  const { data: businessLines } = useBusinessLines(tenantId);
  const createBranch = useCreateBranch();
  
  const businessLineIdFromParams = searchParams.get('businessLineId');
  
  const [formData, setFormData] = useState({
    businessLineId: businessLineIdFromParams || '',
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    email: '',
    phone: '',
    timezone: 'UTC',
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
    if (!formData.businessLineId) newErrors.businessLineId = 'Please select a business line';
    if (!formData.name.trim()) newErrors.name = 'Branch name is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createBranch.mutateAsync({
        businessLineId: formData.businessLineId,
        name: formData.name,
        code: formData.code || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        country: formData.country || undefined,
        postalCode: formData.postalCode || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        timezone: formData.timezone,
      });
      navigate('/branches');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create branch';
      setErrors({ submit: message });
    }
  };

  const businessLineOptions = businessLines?.map(bl => ({ value: bl.id, label: `${bl.name} (${bl.code})` })) || [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          to="/branches"
          className="inline-flex items-center gap-2 text-sm mb-4 hover:text-[#2563EB] transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Branches
        </Link>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
          Create Branch
        </h1>
        <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          Add a new physical location or service point
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branch Information</CardTitle>
          <CardDescription>Enter the branch details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
                {errors.submit}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="businessLineId">Business Line *</Label>
              <Select
                id="businessLineId"
                name="businessLineId"
                value={formData.businessLineId}
                onChange={handleChange}
              >
                <option value="">Select a business line</option>
                {businessLineOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
              {errors.businessLineId && <p className="text-sm text-red-600">{errors.businessLineId}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Branch Name *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter branch name"
                    className="pl-10"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Code (Optional)</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="Auto-generated if empty"
                  value={formData.code}
                  onChange={handleChange}
                  className="uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                placeholder="Enter full street address"
                className="min-h-[60px]"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="City name"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State / Province</Label>
                <Input
                  id="state"
                  name="state"
                  placeholder="State or province"
                  value={formData.state}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="country"
                  placeholder="Country"
                  value={formData.country}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  placeholder="Postal / ZIP code"
                  value={formData.postalCode}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="branch@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="+1-555-123-4567"
                    className="pl-10"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
                <Select
                  id="timezone"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  options={timezones}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="bg-[#2563EB] hover:bg-[#1E40AF]"
                disabled={createBranch.isPending}
              >
                {createBranch.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Branch
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/branches')}
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
