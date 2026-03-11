/**
 * CreateClientPage — Create & Edit Client Form matching CreateUserPage pattern
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Loader2, UserCircle, Mail, Phone, MapPin, FileText, Calendar } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useCreateClient, useUpdateClient, useClientDetail } from '@/hooks/useClients';

import { useScreenPermission } from '@/hooks/useScreenPermission';
import { extractApiError } from '@/lib/apiError';
import { useToast } from '@/components/ui/toast';
import { useSetPageResource } from '@/contexts/PageResourceContext';

const SCREEN_CODE = 'CLIENT_LIST';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  notes: string;
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  address: '',
  notes: '',
};

export default function CreateClientPage() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const { canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  const isEditMode = !!clientId;

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const { data: existingClient, isLoading: isLoadingClient } = useClientDetail(clientId);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formLoaded, setFormLoaded] = useState(false);

  useSetPageResource('client', isEditMode ? clientId : undefined, existingClient?.code);

  // Pre-fill in edit mode
  useEffect(() => {
    if (isEditMode && existingClient && !formLoaded) {
      setFormData({
        firstName: existingClient.firstName || '',
        lastName: existingClient.lastName || '',
        email: existingClient.email || '',
        phone: existingClient.phone || '',
        dateOfBirth: existingClient.dateOfBirth || '',
        address: existingClient.address || '',
        notes: existingClient.notes || '',
      });
      setFormLoaded(true);
    }
  }, [isEditMode, existingClient, formLoaded]);

  const updateField = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'Required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (isEditMode) {
        await updateClient.mutateAsync({ id: clientId!, ...payload });
        showToast('success', 'Client updated successfully');
      } else {
        await createClient.mutateAsync(payload);
        showToast('success', 'Client created successfully');
      }

      navigate('/app/clients');
    } catch (err) {
      const apiError = extractApiError(err);
      if (Object.keys(apiError.fieldErrors).length > 0) {
        setErrors(apiError.fieldErrors as Partial<Record<keyof FormData, string>>);
      }
      setSubmitError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validate, navigate, isEditMode, clientId, createClient, updateClient, showToast]);

  const pageTitle = isEditMode ? 'Edit Client' : 'Create Client';

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canModify) {
    return <Navigate to="/app/clients" replace />;
  }

  if (isEditMode && isLoadingClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <StyledIcon icon={UserCircle} emoji="👤" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold text-[var(--color-text)]">
            {pageTitle}
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
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {submitError && (
          <div
            className="px-5 py-3 text-sm border-b"
            style={{
              backgroundColor: 'var(--badge-danger-bg)',
              borderColor: 'var(--badge-danger-border)',
              color: 'var(--color-text-danger)',
            }}
          >
            {submitError}
          </div>
        )}

        <div className="px-5 py-5 space-y-4">
          {/* Row: First Name + Last Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={UserCircle} emoji="👤" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                First Name
              </Label>
              <Input
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder="First name"
                error={!!errors.firstName}
                className="h-9"
              />
              {errors.firstName && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={UserCircle} emoji="👤" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                Last Name
              </Label>
              <Input
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder="Last name"
                error={!!errors.lastName}
                className="h-9"
              />
              {errors.lastName && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <StyledIcon icon={Mail} emoji="📧" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
              Email Address
            </Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="email@example.com"
              error={!!errors.email}
              className="h-9"
            />
            {errors.email && (
              <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <StyledIcon icon={Phone} emoji="📱" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
              Phone Number
            </Label>
            <Input
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+966 5XX XXX XXX"
              className="h-9"
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <StyledIcon icon={Calendar} emoji="📅" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
              Date of Birth
            </Label>
            <Input
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={formData.dateOfBirth}
              onChange={(e) => updateField('dateOfBirth', e.target.value)}
              className="h-9 max-w-xs"
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <StyledIcon icon={MapPin} emoji="📍" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
              Address
            </Label>
            <Textarea
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              rows={2}
              placeholder="Street address, city..."
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <StyledIcon icon={FileText} emoji="📝" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
              Notes
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={2}
              placeholder="Additional notes..."
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
            onClick={() => navigate('/app/clients')}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || createClient.isPending || updateClient.isPending}
            loading={isSubmitting || createClient.isPending || updateClient.isPending}
          >
            {isEditMode ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
