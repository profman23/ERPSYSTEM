/**
 * CreateUserPage — Create & Edit User Form (APP Panel)
 *
 * Create mode: /app/administration/users/create
 * Edit mode:   /app/administration/users/:userId/edit
 *
 * Supports 3 user types:
 * - regular (default for APP panel) — needs Branch + Role
 * - tenant_admin (system users only via ?type=tenant_admin)
 * - system (system users only via ?type=system)
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, User, Mail, Phone, Lock, Shield, Building2, MapPin, Check, Star, Calendar, Tag } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { PhoneInput, CountryCodeSelect } from '@/components/ui/PhoneInput';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useCreateUser, useTenants, useAllBranches, useUser } from '@/hooks/useHierarchy';
import { useRoles } from '@/hooks/useRoles';
import { useAssignRole, useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/contexts/AuthContext';
import { useScopePath } from '@/hooks/useScopePath';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { apiClient } from '@/lib/api';
import { extractApiError } from '@/lib/apiError';
import { useToast } from '@/components/ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useSetPageResource } from '@/contexts/PageResourceContext';

type UserType = 'system' | 'tenant_admin' | 'regular';

// System role options defined inside component to support i18n

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  roleId: string;
  roleCode: string;
  tenantId: string;
  branchId: string;
  selectedBranchIds: string[];
  defaultBranchId: string;
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  roleId: '',
  roleCode: 'SYSTEM_ADMIN',
  tenantId: '',
  branchId: '',
  selectedBranchIds: [],
  defaultBranchId: '',
};

const SCREEN_CODE = 'USERS';

export default function CreateUserPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const { getPath } = useScopePath();
  const { canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();
  const systemRoleOptions = [
    { value: 'SYSTEM_ADMIN', label: t('users.systemAdminRole') },
    { value: 'SUPPORT_STAFF', label: t('users.supportStaffRole') },
    { value: 'BILLING_STAFF', label: t('users.billingStaffRole') },
  ];
  const createUser = useCreateUser();
  const assignRole = useAssignRole();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  const isEditMode = !!userId;

  // Determine user type
  const userTypeParam = searchParams.get('type') as UserType | null;
  const branchIdFromParams = searchParams.get('branchId');
  const isSystemUser = currentUser?.accessScope === 'system';

  const userType: UserType = isSystemUser && userTypeParam
    ? userTypeParam
    : 'regular';

  // Form state
  const [formData, setFormData] = useState<FormData>({
    ...initialFormData,
    tenantId: currentUser?.tenantId || '',
    branchId: branchIdFromParams || '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [phoneCountryCode, setPhoneCountryCode] = useState('EG');
  const [formLoaded, setFormLoaded] = useState(false);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Data hooks
  const { data: tenants } = useTenants(isSystemUser);
  const effectiveTenantId = isSystemUser ? formData.tenantId : currentUser?.tenantId;
  const { data: allBranches } = useAllBranches(effectiveTenantId || undefined);
  const { data: existingUser, isLoading: isLoadingUser } = useUser(userId);
  const { data: userRoles } = useUserRoles(isEditMode ? userId : undefined);

  useSetPageResource('user', isEditMode ? userId : undefined, existingUser?.name || (existingUser ? `${existingUser.firstName} ${existingUser.lastName}` : undefined));

  // Fetch REAL roles from API
  const { data: rolesData, isLoading: isLoadingRoles } = useRoles({
    limit: 100,
    isActive: true,
    enabled: userType === 'regular',
  });

  // Derived data
  const nonSystemTenants = useMemo(() => {
    if (!tenants) return [];
    return tenants.filter(t => t.code !== 'SYSTEM');
  }, [tenants]);

  const tenantOptions = useMemo(() => {
    const list = userType === 'tenant_admin' ? nonSystemTenants : (tenants || []);
    return list.map(t => ({ value: t.id, label: `${t.name} (${t.code})` }));
  }, [tenants, nonSystemTenants, userType]);

  // Role options from API
  const roleOptions = useMemo(() => {
    if (!rolesData?.data) return [];
    return rolesData.data.map(r => ({ value: r.id, label: r.roleName }));
  }, [rolesData]);

  // Branch list for selector
  const branchList = useMemo(() => {
    if (!allBranches) return [];
    return allBranches;
  }, [allBranches]);

  // Pre-fill form in edit mode
  useEffect(() => {
    if (isEditMode && existingUser && !formLoaded) {
      // Get current roleId from user's role assignments
      const currentRoleId = userRoles && userRoles.length > 0
        ? (userRoles[0].roleId || userRoles[0].id || '')
        : '';

      // Build multi-branch state from existing user data
      const defaultBranch = existingUser.branchId || '';
      const extraBranches: string[] = (existingUser as any).allowedBranchIds || [];
      const allBranchIds = defaultBranch
        ? [defaultBranch, ...extraBranches.filter(id => id !== defaultBranch)]
        : [...extraBranches];

      setFormData({
        firstName: existingUser.firstName || '',
        lastName: existingUser.lastName || '',
        email: existingUser.email || '',
        phone: existingUser.phone || '',
        password: '',
        confirmPassword: '',
        roleId: currentRoleId,
        roleCode: 'SYSTEM_ADMIN',
        tenantId: existingUser.tenantId || '',
        branchId: defaultBranch,
        selectedBranchIds: allBranchIds,
        defaultBranchId: defaultBranch,
      });
      setFormLoaded(true);
    }
  }, [isEditMode, existingUser, userRoles, formLoaded]);

  // Auto-set defaults when data loads (create mode only)
  useEffect(() => {
    if (!isEditMode && userType === 'regular' && isSystemUser && !formData.tenantId && nonSystemTenants.length > 0) {
      setFormData(prev => ({ ...prev, tenantId: nonSystemTenants[0].id }));
    }
  }, [nonSystemTenants, userType, isSystemUser, formData.tenantId, isEditMode]);

  useEffect(() => {
    if (!isEditMode && userType === 'tenant_admin' && nonSystemTenants.length > 0 && !formData.tenantId) {
      setFormData(prev => ({ ...prev, tenantId: nonSystemTenants[0].id }));
    }
  }, [nonSystemTenants, userType, formData.tenantId, isEditMode]);

  // Reset branches when tenant changes (system users switching tenants)
  useEffect(() => {
    if (isSystemUser && !isEditMode) {
      setFormData(prev => ({ ...prev, branchId: '', selectedBranchIds: [], defaultBranchId: '' }));
    }
  }, [formData.tenantId, isSystemUser, isEditMode]);

  // Field updater
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

  // Validate
  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.firstName.trim()) newErrors.firstName = t('users.validationRequired');
    if (!formData.lastName.trim()) newErrors.lastName = t('users.validationRequired');
    if (!formData.email.trim()) {
      newErrors.email = t('users.validationRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('users.validationEmailInvalid');
    }

    // Password required only in create mode
    if (!isEditMode) {
      if (!formData.password || formData.password.length < 8) {
        newErrors.password = t('users.validationMinChars');
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('users.validationPasswordMismatch');
      }
    } else {
      if (formData.password && formData.password.length < 8) {
        newErrors.password = t('users.validationMinChars');
      }
      if (formData.password && formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('users.validationPasswordMismatch');
      }
    }

    if (userType === 'tenant_admin' && !formData.tenantId) {
      newErrors.tenantId = t('users.validationRequired');
    }
    if (userType === 'regular' && formData.selectedBranchIds.length === 0) {
      newErrors.branchId = t('users.validationSelectBranch');
    }
    if (userType === 'regular' && formData.selectedBranchIds.length > 0 && !formData.defaultBranchId) {
      newErrors.branchId = t('users.validationSelectDefault');
    }
    if (userType === 'regular' && !isEditMode && !formData.roleId) {
      newErrors.roleId = t('users.validationSelectRole');
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
        const payload: Record<string, unknown> = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone || undefined,
        };
        if (formData.password) {
          payload.password = formData.password;
        }
        await apiClient.put(`/tenant/users/${userId}`, payload);

        // Assign role if selected in edit mode
        if (formData.roleId) {
          try {
            await assignRole.mutateAsync({ userId, roleId: formData.roleId });
          } catch (roleErr) {
            console.error('[CreateUserPage] Role assignment failed (edit):', roleErr);
            showToast('warning', t('users.roleAssignmentFailed'));
          }
        }

        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['allUsers'] });
        queryClient.invalidateQueries({ queryKey: ['user', userId] });
      } else if (userType === 'system') {
        await apiClient.post('/hierarchy/system-users', {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone || undefined,
          roleCode: formData.roleCode,
        });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      } else if (userType === 'tenant_admin') {
        await apiClient.post('/hierarchy/tenant-admins', {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone || undefined,
          tenantId: formData.tenantId,
        });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      } else {
        // Compute accessScope based on branch count
        const branchCount = formData.selectedBranchIds.length;
        const computedScope = branchCount > 1 ? 'mixed' : 'branch';
        const allowedBranchIds = formData.selectedBranchIds.filter(id => id !== formData.defaultBranchId);

        // Create user with atomic role assignment
        await createUser.mutateAsync({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone || undefined,
          accessScope: computedScope,
          branchId: formData.defaultBranchId,
          allowedBranchIds,
          roleId: formData.roleId || undefined,
        });
      }
      showToast('success', isEditMode ? t('users.userUpdated') : t('users.userCreated'));
      navigate(getPath('administration/users'));
    } catch (err) {
      const apiError = extractApiError(err);

      // Map backend field errors to form field errors
      if (Object.keys(apiError.fieldErrors).length > 0) {
        setErrors(apiError.fieldErrors as Partial<Record<keyof FormData, string>>);
      }

      setSubmitError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [userType, formData, validate, navigate, getPath, isEditMode, userId, queryClient, createUser, assignRole]);

  const backPath = getPath('administration/users');

  const pageTitle = isEditMode
    ? t('users.editUser')
    : userType === 'system'
      ? t('users.createUser')
      : userType === 'tenant_admin'
        ? t('users.createUser')
        : t('users.createUser');

  // Permission guard
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canModify) {
    return <Navigate to={getPath('administration/users')} replace />;
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
          <StyledIcon icon={User} emoji="👤" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
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
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={User} emoji="👤" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.firstName')}
              </Label>
              <Input
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder={t('users.firstNamePlaceholder')}
                error={!!errors.firstName}
                className="h-9"
              />
              {errors.firstName && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={User} emoji="👤" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.lastName')}
              </Label>
              <Input
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder={t('users.lastNamePlaceholder')}
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
              <StyledIcon icon={Mail} emoji="📧" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.emailAddress')}
            </Label>
            <Input
              type="email"
              name="new-user-email"
              autoComplete="one-time-code"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder={t('users.emailPlaceholder')}
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
            <Label className="text-xs flex items-center gap-1.5">
              <StyledIcon icon={Phone} emoji="📱" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.phoneNumber')}
            </Label>
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
                <StyledIcon icon={Lock} emoji="🔒" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('users.password')} {isEditMode && <span className="text-[var(--color-text-muted)] font-normal text-xs">({t('users.leaveEmptyToKeep')})</span>}
              </Label>
              <Input
                type="password"
                name="new-user-password"
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder={isEditMode ? t('users.leaveEmptyPlaceholder') : t('users.passwordPlaceholder')}
                error={!!errors.password}
                className="h-9"
              />
              {errors.password && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.password}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Lock} emoji="🔒" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.confirmPassword')}
              </Label>
              <Input
                type="password"
                name="new-user-confirm"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                placeholder={t('users.repeatPasswordPlaceholder')}
                error={!!errors.confirmPassword}
                className="h-9"
              />
              {errors.confirmPassword && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Role — for regular users (fetched from API) */}
          {userType === 'regular' && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Shield} emoji="🛡️" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.role')}
              </Label>
              {isLoadingRoles ? (
                <div
                  className="flex items-center gap-2 h-9 px-3 rounded-md border text-sm"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--input-border)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('users.loadingRoles')}
                </div>
              ) : roleOptions.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {t('users.noRolesAvailable')}
                </p>
              ) : (
                <SimpleSelect
                  value={formData.roleId}
                  onValueChange={(value) => updateField('roleId', value)}
                  options={roleOptions}
                  placeholder={t('users.selectRole')}
                  error={!!errors.roleId}
                />
              )}
              {errors.roleId && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.roleId}</p>
              )}
            </div>
          )}

          {/* System Role — only for system users */}
          {userType === 'system' && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Shield} emoji="🛡️" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.systemRole')}
              </Label>
              <SimpleSelect
                value={formData.roleCode}
                onValueChange={(value) => updateField('roleCode', value)}
                options={systemRoleOptions}
                placeholder={t('users.selectSystemRole')}
                disabled={isEditMode}
              />
            </div>
          )}

          {/* Tenant selector — for tenant_admin, or system user creating regular */}
          {(userType === 'tenant_admin' || (userType === 'regular' && isSystemUser)) && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Building2} emoji="🏢" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />{t('users.tenant')}
              </Label>
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

          {/* Branch selector — multi-select with default star for regular users */}
          {userType === 'regular' && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={MapPin} emoji="📍" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('users.branches')}
                {formData.selectedBranchIds.length > 0 && (
                  <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>
                    ({t('users.branchesSelected', { count: formData.selectedBranchIds.length })})
                  </span>
                )}
              </Label>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {t('users.branchSelectHelp')}
              </p>
              {branchList.length === 0 ? (
                <p className="text-sm py-2" style={{ color: 'var(--color-text-muted)' }}>
                  {isSystemUser && !formData.tenantId ? t('users.selectTenantFirst') : t('users.noBranchesAvailable')}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {branchList.map((branch) => {
                    const isSelected = formData.selectedBranchIds.includes(branch.id);
                    const isDefault = formData.defaultBranchId === branch.id;

                    const toggleBranch = () => {
                      setFormData(prev => {
                        const ids = prev.selectedBranchIds.includes(branch.id)
                          ? prev.selectedBranchIds.filter(id => id !== branch.id)
                          : [...prev.selectedBranchIds, branch.id];

                        // Auto-set default to first selected if current default is removed
                        let newDefault = prev.defaultBranchId;
                        if (!ids.includes(newDefault)) {
                          newDefault = ids[0] || '';
                        }
                        // Auto-set default if this is the first branch selected
                        if (ids.length === 1) {
                          newDefault = ids[0];
                        }

                        return {
                          ...prev,
                          selectedBranchIds: ids,
                          defaultBranchId: newDefault,
                          branchId: newDefault,
                        };
                      });
                      setErrors(prev => {
                        if (prev.branchId) {
                          const next = { ...prev };
                          delete next.branchId;
                          return next;
                        }
                        return prev;
                      });
                    };

                    const setAsDefault = (e: React.MouseEvent) => {
                      e.stopPropagation();
                      if (!isSelected) return;
                      setFormData(prev => ({
                        ...prev,
                        defaultBranchId: branch.id,
                        branchId: branch.id,
                      }));
                    };

                    return (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={toggleBranch}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer
                          ${isSelected
                            ? 'ring-2 ring-[var(--color-accent)]'
                            : 'hover:bg-[var(--color-surface-hover)]'
                          }
                        `}
                        style={{
                          backgroundColor: isSelected
                            ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))'
                            : 'var(--color-surface)',
                          borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                        }}
                      >
                        {/* Checkbox */}
                        <div
                          className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                            backgroundColor: isSelected ? 'var(--color-accent)' : 'transparent',
                          }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>

                        {/* Branch info */}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                            {branch.name}
                            {isDefault && (
                              <span
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
                                  color: 'var(--color-warning)',
                                }}
                              >
                                {t('users.defaultBadge')}
                              </span>
                            )}
                          </div>
                          <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                            {branch.code}
                          </div>
                        </div>

                        {/* Star button for default */}
                        {isSelected && (
                          <button
                            type="button"
                            onClick={setAsDefault}
                            className="flex-shrink-0 p-1 rounded-full transition-colors hover:bg-[var(--color-surface-hover)]"
                            title={isDefault ? t('users.defaultBranchTitle') : t('users.setAsDefault')}
                          >
                            <Star
                              className="w-4 h-4"
                              style={{
                                color: isDefault ? 'var(--color-warning)' : 'var(--color-text-muted)',
                                fill: isDefault ? 'var(--color-warning)' : 'none',
                              }}
                            />
                          </button>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.branchId && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.branchId}</p>
              )}
            </div>
          )}

          {/* Available for Online Appointments — placeholder */}
          {userType === 'regular' && (
            <div className="space-y-1.5">
              <label className="flex items-center gap-3 cursor-not-allowed opacity-60">
                <div
                  className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent' }}
                />
                <span className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <StyledIcon icon={Calendar} emoji="📅" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('users.availableOnlineAppointments')}
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--badge-info-bg)', color: 'var(--badge-info-text)' }}
                  >
                    {t('users.soon')}
                  </span>
                </span>
              </label>
            </div>
          )}

          {/* Visit Types — placeholder */}
          {userType === 'regular' && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <StyledIcon icon={Tag} emoji="🏷️" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('users.visitTypes')}
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'var(--badge-info-bg)', color: 'var(--badge-info-text)' }}
                >
                  {t('users.soon')}
                </span>
              </Label>
              <div
                className="flex items-center gap-2 h-9 px-3 rounded-md border text-sm opacity-60 cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {t('users.visitTypesSoon')}
              </div>
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
            onClick={() => navigate(backPath)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || createUser.isPending}
            loading={isSubmitting || createUser.isPending}
          >
            {isEditMode ? t('common.save') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
