/**
 * SystemCreateUserPage — Create & Edit User Form
 *
 * Create mode: /system/administration/users/create?type=system|tenant_admin
 * Edit mode:   /system/administration/users/:userId/edit?type=system|tenant_admin
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, Navigate, useSearchParams, useParams } from 'react-router-dom';
import { Shield, Building2, Loader2, User, Mail, Phone, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { PhoneInput, CountryCodeSelect } from '@/components/ui/PhoneInput';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useTenants, useUser } from '@/hooks/useHierarchy';
import { useSystemRoles } from '@/hooks/useSystemRoles';
import { apiClient } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { extractApiError } from '@/lib/apiError';
import { useToast } from '@/components/ui/toast';
import { useTranslation } from 'react-i18next';

const SCREEN_CODE = 'SYSTEM_USER_LIST';

type UserType = 'system' | 'tenant_admin';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  roleId: string;
  tenantId: string;
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  roleId: '',
  tenantId: '',
};

export default function SystemCreateUserPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { userId } = useParams<{ userId: string }>();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();
  const { t } = useTranslation();

  const isEditMode = !!userId;

  // Read type from URL, default to system
  const typeParam = searchParams.get('type');
  const userType: UserType = typeParam === 'tenant_admin' ? 'tenant_admin' : 'system';

  // Form state
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [phoneCountryCode, setPhoneCountryCode] = useState('EG');
  const [formLoaded, setFormLoaded] = useState(false);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Data hooks
  const { data: tenants } = useTenants();
  const { data: systemRolesData, isLoading: isLoadingRoles } = useSystemRoles({ limit: 100 });
  const { data: existingUser, isLoading: isLoadingUser } = useUser(userId);

  // Derived data
  const systemRoleOptions = useMemo(() => {
    if (!systemRolesData?.data?.length) return [];
    const uniqueRoles = new Map<string, { id: string; label: string }>();
    systemRolesData.data.forEach((role) => {
      if (!uniqueRoles.has(role.roleCode)) {
        uniqueRoles.set(role.roleCode, {
          id: role.id,
          label: role.roleName,
        });
      }
    });
    return Array.from(uniqueRoles.values());
  }, [systemRolesData]);

  const nonSystemTenants = useMemo(() => {
    if (!tenants) return [];
    return tenants.filter((t) => t.code !== 'SYSTEM');
  }, [tenants]);

  const tenantOptions = useMemo(() => {
    return nonSystemTenants.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` }));
  }, [nonSystemTenants]);

  // Pre-fill form in edit mode
  useEffect(() => {
    if (isEditMode && existingUser && !formLoaded) {
      setFormData({
        firstName: existingUser.firstName || '',
        lastName: existingUser.lastName || '',
        email: existingUser.email || '',
        phone: existingUser.phone || '',
        password: '',
        confirmPassword: '',
        roleId: existingUser.dpfRoleId || '',
        tenantId: existingUser.tenantId || '',
      });
      setFormLoaded(true);
    }
  }, [isEditMode, existingUser, formLoaded]);

  // Auto-set defaults when data loads (create mode only)
  useEffect(() => {
    if (!isEditMode && userType === 'system' && systemRoleOptions.length > 0 && !formData.roleId) {
      setFormData((prev) => ({ ...prev, roleId: systemRoleOptions[0].id }));
    }
  }, [systemRoleOptions, userType, formData.roleId, isEditMode]);

  useEffect(() => {
    if (!isEditMode && userType === 'tenant_admin' && nonSystemTenants.length > 0 && !formData.tenantId) {
      setFormData((prev) => ({ ...prev, tenantId: nonSystemTenants[0].id }));
    }
  }, [nonSystemTenants, userType, formData.tenantId, isEditMode]);

  // Field updater
  const updateField = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  // Validate
  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'Required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Required';
    if (!formData.email.trim()) {
      newErrors.email = 'Required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email';
    }

    // Password required only in create mode
    if (!isEditMode) {
      if (!formData.password || formData.password.length < 8) {
        newErrors.password = 'Min 8 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Does not match';
      }
    } else {
      // In edit mode, only validate if user typed something
      if (formData.password && formData.password.length < 8) {
        newErrors.password = 'Min 8 characters';
      }
      if (formData.password && formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Does not match';
      }
    }

    if (userType === 'system' && !formData.roleId) {
      newErrors.roleId = 'Required';
    }
    if (userType === 'tenant_admin' && !formData.tenantId) {
      newErrors.tenantId = 'Required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, userType, isEditMode]);

  // Submit
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (isEditMode) {
        // Edit mode — PATCH
        const payload: Record<string, unknown> = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone || undefined,
        };
        // Only send password if user entered one
        if (formData.password) {
          payload.password = formData.password;
        }
        await apiClient.patch(`/tenant/users/${userId}`, payload);
        queryClient.invalidateQueries({ queryKey: ['allUsers'] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['user', userId] });
      } else {
        // Create mode — POST
        if (userType === 'system') {
          await apiClient.post('/hierarchy/system-users', {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim(),
            password: formData.password,
            phone: formData.phone || undefined,
            roleId: formData.roleId,
          });
        } else {
          await apiClient.post('/hierarchy/tenant-admins', {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim(),
            password: formData.password,
            phone: formData.phone || undefined,
            tenantId: formData.tenantId,
          });
        }
        queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      }
      showToast('success', isEditMode ? 'User Updated' : 'User Created');
      navigate('/system/administration/users');
    } catch (err) {
      const apiError = extractApiError(err);
      if (Object.keys(apiError.fieldErrors).length > 0) {
        setErrors(apiError.fieldErrors);
      }
      setSubmitError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [userType, formData, validate, navigate, isEditMode, userId, queryClient]);

  const pageTitle = isEditMode
    ? (userType === 'system' ? t('users.editSystemUser') : t('users.editTenantAdmin'))
    : (userType === 'system' ? t('users.createSystemUser') : t('users.createTenantAdmin'));
  const TypeIcon = userType === 'system' ? Shield : Building2;

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canModify) {
    return <Navigate to="/system/users" replace />;
  }

  // Show loading for edit mode while fetching user
  if (isEditMode && isLoadingUser) {
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
          <TypeIcon className="w-8 h-8 text-[var(--color-accent)]" />
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
        {/* Error banner */}
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

        {/* Fields */}
        <div className="px-5 py-5 space-y-4">
          {/* Row: First Name + Last Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><User className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.firstName')}</Label>
              <Input
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder={t('users.firstName')}
                error={!!errors.firstName}
                className="h-9"
              />
              {errors.firstName && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><User className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.lastName')}</Label>
              <Input
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder={t('users.lastName')}
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
            <Label className="text-xs flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.emailAddress')}</Label>
            <Input
              type="email"
              name="new-user-email"
              autoComplete="one-time-code"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="user@example.com"
              error={!!errors.email}
              className="h-9"
              disabled={isEditMode}
            />
            {errors.email && (
              <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.phoneNumber')}</Label>
            <div className="flex gap-2">
              <CountryCodeSelect
                value={phoneCountryCode}
                onChange={setPhoneCountryCode}
                className="w-[140px] flex-shrink-0"
              />
              <PhoneInput
                countryCode={phoneCountryCode}
                value={formData.phone}
                onChange={(val) => updateField('phone', val)}
                placeholder="123 456 7890"
                className="flex-1"
              />
            </div>
          </div>

          {/* Row: Password + Confirm Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.password')} {isEditMode && <span className="text-[var(--color-text-muted)] font-normal">({t('users.leaveEmptyToKeep')})</span>}
              </Label>
              <Input
                type="password"
                name="new-user-password"
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder={isEditMode ? t('users.leaveEmptyToKeep') : t('users.minChars')}
                error={!!errors.password}
                className="h-9"
              />
              {errors.password && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.password}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.confirmPassword')}</Label>
              <Input
                type="password"
                name="new-user-confirm"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                placeholder={t('users.repeatPassword')}
                error={!!errors.confirmPassword}
                className="h-9"
              />
              {errors.confirmPassword && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Role or Tenant selector */}
          {userType === 'system' ? (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.systemRole')}</Label>
              {isLoadingRoles ? (
                <div
                  className="flex items-center gap-2 h-9 px-3 rounded-md border text-sm"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--input-border)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('common.loading')}
                </div>
              ) : (
                <SimpleSelect
                  value={formData.roleId}
                  onValueChange={(value) => updateField('roleId', value)}
                  options={systemRoleOptions.map((opt) => ({ value: opt.id, label: opt.label }))}
                  placeholder={t('users.selectRole')}
                  error={!!errors.roleId}
                  disabled={isEditMode}
                />
              )}
              {errors.roleId && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.roleId}</p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.tenant')}</Label>
              <SimpleSelect
                value={formData.tenantId}
                onValueChange={(value) => updateField('tenantId', value)}
                options={tenantOptions}
                placeholder={t('users.selectTenant')}
                error={!!errors.tenantId}
                disabled={isEditMode}
              />
              {errors.tenantId && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.tenantId}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 flex items-center justify-end gap-3 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/system/administration/users')}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {isEditMode ? t('users.update') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
