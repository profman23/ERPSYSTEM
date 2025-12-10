import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, GitBranch, Mail, Phone, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useCreateBusinessLine, useTenants } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';

const businessLineTypes = [
  { value: 'veterinary_clinic', label: 'Veterinary Clinic' },
  { value: 'pet_store', label: 'Pet Store' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'boarding', label: 'Boarding' },
  { value: 'general', label: 'General' },
];

export default function CreateBusinessLinePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: tenants } = useTenants();
  const createBusinessLine = useCreateBusinessLine();
  
  const tenantIdFromParams = searchParams.get('tenantId');
  const defaultTenantId = tenantIdFromParams || user?.tenantId || '';
  
  const [formData, setFormData] = useState({
    tenantId: defaultTenantId,
    name: '',
    code: '',
    businessLineType: 'veterinary_clinic',
    description: '',
    contactEmail: '',
    contactPhone: '',
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
    if (!formData.tenantId) newErrors.tenantId = 'Please select a tenant';
    if (!formData.name.trim()) newErrors.name = 'Business line name is required';
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
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
        code: formData.code || undefined,
        businessLineType: formData.businessLineType,
        description: formData.description || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
      });
      navigate('/business-lines');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create business line';
      setErrors({ submit: message });
    }
  };

  const tenantOptions = tenants?.map(t => ({ value: t.id, label: `${t.name} (${t.code})` })) || [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          to="/business-lines"
          className="inline-flex items-center gap-2 text-sm mb-4 transition-colors hover:opacity-70"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Business Lines
        </Link>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
          Create Business Line
        </h1>
        <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          Add a new business line to organize your branches
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Line Information</CardTitle>
          <CardDescription>Enter the business line details</CardDescription>
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

            {user?.accessScope === 'system' && (
              <div className="space-y-2">
                <Label htmlFor="tenantId">Tenant *</Label>
                <Select
                  id="tenantId"
                  name="tenantId"
                  value={formData.tenantId}
                  onChange={handleChange}
                >
                  <option value="">Select a tenant</option>
                  {tenantOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
                {errors.tenantId && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.tenantId}</p>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Business Line Name *</Label>
                <div className="relative">
                  <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter business line name"
                    className="pl-10"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                {errors.name && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{errors.name}</p>}
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
              <Label htmlFor="businessLineType">Business Type</Label>
              <Select
                id="businessLineType"
                name="businessLineType"
                value={formData.businessLineType}
                onChange={handleChange}
                options={businessLineTypes}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe this business line..."
                className="min-h-[80px]"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    placeholder="contact@example.com"
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
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
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

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={createBusinessLine.isPending}
              >
                {createBusinessLine.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Business Line
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/business-lines')}
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
