import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { CountryTimezoneSelector } from './CountryTimezoneSelector';
import { SubscriptionPlanSelector } from './SubscriptionPlanSelector';
import { Loader2, Building2 } from 'lucide-react';

interface TenantFormData {
  name: string;
  countryCode: string;
  timezone: string;
  subscriptionPlan: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  primaryColor: string;
  defaultLanguage: 'en' | 'ar';
  status?: 'active' | 'inactive' | 'suspended';
}

interface TenantFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: {
    id: string;
    name: string;
    code: string;
    countryCode?: string;
    subscriptionPlan: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    primaryColor?: string;
    defaultLanguage?: 'en' | 'ar';
    status?: 'active' | 'inactive' | 'suspended';
  } | null;
  onSuccess?: () => void;
}

async function createTenant(data: TenantFormData) {
  const response = await fetch('/api/v1/tenants/advanced', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create tenant');
  }
  return response.json();
}

async function updateTenant(id: string, data: Partial<TenantFormData>) {
  const response = await fetch(`/api/v1/tenants/advanced/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update tenant');
  }
  return response.json();
}

const DEFAULT_COLORS = [
  { value: '#2563EB', label: 'Blue' },
  { value: '#7C3AED', label: 'Purple' },
  { value: '#059669', label: 'Green' },
  { value: '#DC2626', label: 'Red' },
  { value: '#D97706', label: 'Orange' },
  { value: '#0891B2', label: 'Teal' },
];

export function TenantFormModal({
  open,
  onOpenChange,
  tenant,
  onSuccess,
}: TenantFormModalProps) {
  const isEditMode = !!tenant;
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TenantFormData>({
    defaultValues: {
      name: '',
      countryCode: 'EG',
      timezone: 'Africa/Cairo',
      subscriptionPlan: 'trial',
      contactEmail: '',
      contactPhone: '',
      address: '',
      primaryColor: '#2563EB',
      defaultLanguage: 'en',
      status: 'active',
    },
  });

  const countryCode = watch('countryCode');
  const subscriptionPlan = watch('subscriptionPlan');
  const primaryColor = watch('primaryColor');

  useEffect(() => {
    if (tenant) {
      reset({
        name: tenant.name,
        countryCode: tenant.countryCode || 'EG',
        timezone: 'Africa/Cairo',
        subscriptionPlan: tenant.subscriptionPlan,
        contactEmail: tenant.contactEmail || '',
        contactPhone: tenant.contactPhone || '',
        address: tenant.address || '',
        primaryColor: tenant.primaryColor || '#2563EB',
        defaultLanguage: tenant.defaultLanguage || 'en',
        status: tenant.status || 'active',
      });
    } else {
      reset({
        name: '',
        countryCode: 'EG',
        timezone: 'Africa/Cairo',
        subscriptionPlan: 'trial',
        contactEmail: '',
        contactPhone: '',
        address: '',
        primaryColor: '#2563EB',
        defaultLanguage: 'en',
        status: 'active',
      });
    }
    setServerError(null);
  }, [tenant, reset, open]);

  const createMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      setServerError(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<TenantFormData>) => updateTenant(tenant!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      setServerError(error.message);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: TenantFormData) => {
    setServerError(null);
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCountryChange = (code: string, timezone: string) => {
    setValue('countryCode', code);
    setValue('timezone', timezone);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ 
          backgroundColor: 'var(--sys-surface)', 
          borderColor: 'var(--sys-border)' 
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: 'var(--sys-text)' }}>
            <Building2 className="w-5 h-5" style={{ color: 'var(--sys-accent)' }} />
            {isEditMode ? 'Edit Tenant' : 'Create New Tenant'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {serverError && (
            <div 
              className="p-3 rounded-md text-sm"
              style={{ 
                backgroundColor: 'var(--badge-danger-bg)', 
                color: 'var(--color-text-danger)',
                borderColor: 'var(--badge-danger-border)',
                borderWidth: '1px'
              }}
            >
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" style={{ color: 'var(--sys-text)' }}>
                Organization Name *
              </Label>
              <Input
                id="name"
                {...register('name', { 
                  required: 'Organization name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                })}
                placeholder="Enter organization name"
                style={{ 
                  backgroundColor: 'var(--input-bg)', 
                  borderColor: errors.name ? 'var(--input-error-border)' : 'var(--input-border)',
                  color: 'var(--input-text)'
                }}
              />
              {errors.name && (
                <p className="text-sm" style={{ color: 'var(--color-text-danger)' }}>
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail" style={{ color: 'var(--sys-text)' }}>
                Contact Email *
              </Label>
              <Input
                id="contactEmail"
                type="email"
                {...register('contactEmail', { 
                  required: 'Contact email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                placeholder="contact@example.com"
                style={{ 
                  backgroundColor: 'var(--input-bg)', 
                  borderColor: errors.contactEmail ? 'var(--input-error-border)' : 'var(--input-border)',
                  color: 'var(--input-text)'
                }}
              />
              {errors.contactEmail && (
                <p className="text-sm" style={{ color: 'var(--color-text-danger)' }}>
                  {errors.contactEmail.message}
                </p>
              )}
            </div>
          </div>

          <CountryTimezoneSelector
            value={countryCode}
            onChange={handleCountryChange}
            error={errors.countryCode?.message}
          />

          <SubscriptionPlanSelector
            value={subscriptionPlan}
            onChange={(plan) => setValue('subscriptionPlan', plan)}
            error={errors.subscriptionPlan?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPhone" style={{ color: 'var(--sys-text)' }}>
                Contact Phone
              </Label>
              <Input
                id="contactPhone"
                {...register('contactPhone')}
                placeholder="+20 123 456 7890"
                style={{ 
                  backgroundColor: 'var(--input-bg)', 
                  borderColor: 'var(--input-border)',
                  color: 'var(--input-text)'
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultLanguage" style={{ color: 'var(--sys-text)' }}>
                Default Language
              </Label>
              <Select
                {...register('defaultLanguage')}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'ar', label: 'العربية (Arabic)' },
                ]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" style={{ color: 'var(--sys-text)' }}>
              Address
            </Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="Organization address"
              style={{ 
                backgroundColor: 'var(--input-bg)', 
                borderColor: 'var(--input-border)',
                color: 'var(--input-text)'
              }}
            />
          </div>

          <div className="space-y-2">
            <Label style={{ color: 'var(--sys-text)' }}>Brand Color</Label>
            <div className="flex gap-2">
              {DEFAULT_COLORS.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setValue('primaryColor', color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    primaryColor === color.value ? 'scale-110 shadow-md' : ''
                  }`}
                  style={{
                    backgroundColor: color.value,
                    borderColor: primaryColor === color.value ? 'var(--sys-text)' : 'transparent',
                  }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="status" style={{ color: 'var(--sys-text)' }}>
                Status
              </Label>
              <Select
                {...register('status')}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'suspended', label: 'Suspended' },
                ]}
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              style={{ 
                backgroundColor: 'var(--sys-button)',
                borderColor: 'var(--sys-border)',
                color: 'var(--sys-text)'
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              style={{ 
                background: 'linear-gradient(135deg, var(--sys-accent), var(--sys-accent-hover))',
                color: 'var(--color-text-on-accent)'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Tenant' : 'Create Tenant'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TenantFormModalIndex() {
  return null;
}
