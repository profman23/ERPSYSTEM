import { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { GitBranch, Mail, Phone, Loader2, Pencil, Briefcase, Tag, FileText } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { PhoneInput, CountryCodeSelect } from '@/components/ui/PhoneInput';
import { useBusinessLine, useUpdateBusinessLine } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenPermission } from '@/hooks/useScreenPermission';

const businessLineTypes = [
  { value: 'veterinary_clinic', label: 'Veterinary Clinic' },
  { value: 'pet_store', label: 'Pet Store' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'boarding', label: 'Boarding' },
  { value: 'general', label: 'General' },
];

const SCREEN_CODE = 'BUSINESS_LINES';

export default function EditBusinessLinePage() {
  const navigate = useNavigate();
  const { businessLineId } = useParams<{ businessLineId: string }>();
  const { user } = useAuth();
  const { canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);
  const { data: businessLine, isLoading: loadingBL } = useBusinessLine(businessLineId);
  const updateBusinessLine = useUpdateBusinessLine();

  const isTenantScope = user?.accessScope === 'tenant';

  const [formData, setFormData] = useState({
    name: '',
    businessLineType: 'general',
    description: '',
    contactEmail: '',
    contactPhone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState('EG');
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  useEffect(() => {
    if (businessLine && !initialized) {
      setFormData({
        name: businessLine.name || '',
        businessLineType: businessLine.businessLineType || 'general',
        description: businessLine.description || '',
        contactEmail: businessLine.contactEmail || '',
        contactPhone: businessLine.contactPhone || '',
      });
      setInitialized(true);
    }
  }, [businessLine, initialized]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Business line name is required';
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !businessLineId) return;

    try {
      await updateBusinessLine.mutateAsync({
        id: businessLineId,
        name: formData.name,
        ...(!isTenantScope && {
          description: formData.description || undefined,
          contactEmail: formData.contactEmail || undefined,
          contactPhone: formData.contactPhone || undefined,
        }),
      });
      navigate('/app/administration/business-lines');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update business line';
      setErrors({ submit: message });
    }
  };

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

  if (loadingBL) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
        <span className="ml-3" style={{ color: 'var(--color-text-secondary)' }}>Loading...</span>
      </div>
    );
  }

  if (!businessLine) {
    return (
      <div className="text-center py-24" style={{ color: 'var(--color-text-secondary)' }}>
        Business line not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-3">
          <StyledIcon icon={Pencil} emoji="✏️" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            Edit Business Line
          </h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      <div className="rounded-lg border max-w-2xl" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            {errors.submit && (
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: 'var(--alert-danger-bg)',
                  borderColor: 'var(--alert-danger-border)',
                  color: 'var(--alert-danger-text)',
                }}
              >
                {errors.submit}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Briefcase} emoji="💼" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                Business Line Name *
              </Label>
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

            {!isTenantScope && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="businessLineType" className="text-xs flex items-center gap-1.5">
                    <StyledIcon icon={Tag} emoji="🏷️" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    Business Type
                  </Label>
                  <SimpleSelect
                    value={formData.businessLineType}
                    onValueChange={(value) => handleSelectChange('businessLineType', value)}
                    options={businessLineTypes}
                    placeholder="Select business type"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs flex items-center gap-1.5">
                    <StyledIcon icon={FileText} emoji="📄" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe this business line..."
                    className="min-h-[80px]"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail" className="text-xs flex items-center gap-1.5">
                      <StyledIcon icon={Mail} emoji="📧" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      Contact Email
                    </Label>
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
                    <Label htmlFor="contactPhone" className="text-xs flex items-center gap-1.5">
                      <StyledIcon icon={Phone} emoji="📱" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      Contact Phone
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
                        placeholder="123 456 7890"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={updateBusinessLine.isPending}
              >
                {updateBusinessLine.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/app/administration/business-lines')}
              >
                Cancel
              </Button>
            </div>
          </form>
      </div>
    </div>
  );
}
