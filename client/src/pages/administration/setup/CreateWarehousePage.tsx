/**
 * Create/Edit Warehouse Page
 *
 * Create: /app/administration/setup/warehouses/create
 * Edit:   /app/administration/setup/warehouses/:id/edit
 *
 * 2-Card side-by-side layout: General Info + GL Accounts.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Loader2, Hash, Type, Warehouse, MapPin, GitBranch,
  User, Phone, Mail, FileText, BookOpen,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { Switch } from '@/components/ui/switch';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { AccountSelector } from '@/components/finance/AccountSelector';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { useScopePath } from '@/hooks/useScopePath';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/toast';
import { extractApiError } from '@/lib/apiError';
import { useAllBranchesNoFilter } from '@/hooks/useHierarchy';
import {
  useWarehouseDetail,
  useCreateWarehouse,
  useUpdateWarehouse,
} from '@/hooks/useWarehouses';
import { useSetPageResource } from '@/contexts/PageResourceContext';

const SCREEN_CODE = 'WAREHOUSES';

interface FormData {
  code: string;
  name: string;
  branchId: string;
  warehouseType: 'STANDARD' | 'COLD_STORAGE' | 'DROP_SHIP';
  location: string;
  isDefault: boolean;
  managerName: string;
  phone: string;
  email: string;
  description: string;
  // GL Accounts
  inventoryAccountId: string | null;
  cogsAccountId: string | null;
  priceDifferenceAccountId: string | null;
  revenueAccountId: string | null;
  expenseAccountId: string | null;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  branchId: '',
  warehouseType: 'STANDARD',
  location: '',
  isDefault: false,
  managerName: '',
  phone: '',
  email: '',
  description: '',
  inventoryAccountId: null,
  cogsAccountId: null,
  priceDifferenceAccountId: null,
  revenueAccountId: null,
  expenseAccountId: null,
};

export default function CreateWarehousePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { isLoading: permLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();

  const isEdit = !!id;
  const listPath = getPath('administration/setup/warehouses');

  const { data: existingWarehouse, isLoading: loadingDetail } = useWarehouseDetail(id);
  const { data: branchesData, isLoading: loadingBranches } = useAllBranchesNoFilter();
  const createMutation = useCreateWarehouse();
  const updateMutation = useUpdateWarehouse();

  const [form, setForm] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  useSetPageResource('warehouse', isEdit ? id : undefined, existingWarehouse?.code);

  // Pre-fill form in edit mode
  // Two-step update: clear branchId first to force Radix Select to see a value transition,
  // then set the real value on next frame so it re-matches the SelectItem.
  useEffect(() => {
    if (isEdit && existingWarehouse) {
      const data: FormData = {
        code: existingWarehouse.code,
        name: existingWarehouse.name,
        branchId: existingWarehouse.branchId,
        warehouseType: existingWarehouse.warehouseType,
        location: existingWarehouse.location || '',
        isDefault: existingWarehouse.isDefault,
        managerName: existingWarehouse.managerName || '',
        phone: existingWarehouse.phone || '',
        email: existingWarehouse.email || '',
        description: existingWarehouse.description || '',
        inventoryAccountId: existingWarehouse.inventoryAccountId,
        cogsAccountId: existingWarehouse.cogsAccountId,
        priceDifferenceAccountId: existingWarehouse.priceDifferenceAccountId,
        revenueAccountId: existingWarehouse.revenueAccountId,
        expenseAccountId: existingWarehouse.expenseAccountId,
      };
      setForm({ ...data, branchId: '' });
      requestAnimationFrame(() => setForm(data));
    }
  }, [isEdit, existingWarehouse]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const branchOptions = useMemo(() => {
    if (!branchesData) return [];
    return branchesData.map((b) => ({
      value: b.id,
      label: `${b.name} (${b.code})`,
    }));
  }, [branchesData]);

  const warehouseTypeOptions = useMemo(() => [
    { value: 'STANDARD', label: t('warehouses.typeStandard') },
    { value: 'COLD_STORAGE', label: t('warehouses.typeColdStorage') },
    { value: 'DROP_SHIP', label: t('warehouses.typeDropShip') },
  ], [t]);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError('');

    // Client-side validation
    const newErrors: Record<string, string> = {};
    if (!form.code.trim()) newErrors.code = t('common.required');
    if (!form.name.trim()) newErrors.name = t('common.required');
    if (!form.branchId) newErrors.branchId = t('common.required');

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = isRTL ? 'بريد إلكتروني غير صالح' : 'Invalid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const payload = {
        branchId: form.branchId,
        code: form.code.toUpperCase(),
        name: form.name,
        warehouseType: form.warehouseType,
        location: form.location || undefined,
        isDefault: form.isDefault,
        managerName: form.managerName || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        description: form.description || undefined,
        inventoryAccountId: form.inventoryAccountId,
        cogsAccountId: form.cogsAccountId,
        priceDifferenceAccountId: form.priceDifferenceAccountId,
        revenueAccountId: form.revenueAccountId,
        expenseAccountId: form.expenseAccountId,
      };

      if (isEdit) {
        await updateMutation.mutateAsync({ id, ...payload });
        showToast('success', t('warehouses.warehouseUpdated'));
      } else {
        await createMutation.mutateAsync(payload);
        showToast('success', t('warehouses.warehouseCreated'));
      }

      navigate(listPath);
    } catch (err) {
      const apiError = extractApiError(err);
      if (Object.keys(apiError.fieldErrors).length > 0) {
        setErrors(apiError.fieldErrors);
      }
      setSubmitError(apiError.message);
    }
  };

  if (permLoading || (isEdit && (loadingDetail || loadingBranches))) {
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
          <StyledIcon icon={Warehouse} emoji="🏭" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isEdit ? t('warehouses.editWarehouse') : t('warehouses.createWarehouse')}
          </h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {submitError && (
        <div
          className="px-5 py-3 text-sm rounded-lg border"
          style={{
            backgroundColor: 'var(--badge-danger-bg)',
            borderColor: 'var(--badge-danger-border)',
            color: 'var(--color-text-danger)',
          }}
        >
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 2-Card Side-by-Side Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ═══ Left Card: General Information ═══ */}
          <div
            className="rounded-lg border"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {/* Card Header */}
            <div
              className="px-5 py-3 border-b flex items-center gap-2"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <StyledIcon icon={FileText} emoji="📋" className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {t('warehouses.generalInfo')}
              </span>
            </div>

            {/* Fields */}
            <div className="px-5 py-5 space-y-4">
              {/* Row 1: Code + Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {t('warehouses.code')}
                  </Label>
                  <Input
                    value={form.code}
                    onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                    placeholder={isRTL ? 'مثال: WH-MAIN' : 'e.g., WH-MAIN'}
                    disabled={isEdit}
                    error={!!errors.code}
                    className="h-9 font-mono"
                  />
                  {errors.code && (
                    <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.code}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {t('warehouses.name')}
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder={isRTL ? 'اسم المستودع' : 'Warehouse name'}
                    error={!!errors.name}
                    className="h-9"
                  />
                  {errors.name && (
                    <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.name}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Branch + Warehouse Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {t('warehouses.branch')}
                  </Label>
                  <SimpleSelect
                    options={branchOptions}
                    value={form.branchId}
                    onValueChange={(v: string) => updateField('branchId', v)}
                    placeholder={isRTL ? 'اختر الفرع' : 'Select branch'}
                    error={!!errors.branchId}
                  />
                  {errors.branchId && (
                    <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.branchId}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Warehouse className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {t('warehouses.warehouseType')}
                  </Label>
                  <SimpleSelect
                    options={warehouseTypeOptions}
                    value={form.warehouseType}
                    onValueChange={(v: string) => updateField('warehouseType', v as FormData['warehouseType'])}
                  />
                </div>
              </div>

              {/* Row 3: Location + Is Default */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {t('warehouses.location')}
                  </Label>
                  <Input
                    value={form.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder={isRTL ? 'موقع المستودع' : 'Warehouse location'}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {t('warehouses.isDefault')}
                  </Label>
                  <div className="flex items-center gap-2 h-9">
                    <Switch
                      checked={form.isDefault}
                      onCheckedChange={(checked) => updateField('isDefault', checked)}
                    />
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {form.isDefault
                        ? (isRTL ? 'مستودع افتراضي' : 'Default warehouse')
                        : (isRTL ? 'غير افتراضي' : 'Not default')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 4: Manager + Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {t('warehouses.managerName')}
                  </Label>
                  <Input
                    value={form.managerName}
                    onChange={(e) => updateField('managerName', e.target.value)}
                    placeholder={isRTL ? 'اسم مدير المستودع' : 'Manager name'}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {t('warehouses.phone')}
                  </Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder={isRTL ? 'رقم الهاتف' : 'Phone number'}
                    className="h-9"
                  />
                </div>
              </div>

              {/* Row 5: Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {t('warehouses.email')}
                  </Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder={isRTL ? 'البريد الإلكتروني' : 'Email address'}
                    error={!!errors.email}
                    className="h-9"
                  />
                  {errors.email && (
                    <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Row 6: Description (full width) */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('warehouses.description')}
                </Label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder={isRTL ? 'وصف المستودع (اختياري)' : 'Warehouse description (optional)'}
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 resize-none"
                  style={{
                    backgroundColor: 'var(--color-input)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ═══ Right Card: GL Accounts ═══ */}
          <div
            className="rounded-lg border"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {/* Card Header */}
            <div
              className="px-5 py-3 border-b flex items-center gap-2"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <StyledIcon icon={BookOpen} emoji="📒" className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {t('warehouses.glAccounts')}
              </span>
            </div>

            {/* Account Selectors */}
            <div className="px-5 py-5 space-y-4">
              <AccountSelector
                value={form.inventoryAccountId}
                onChange={(v) => updateField('inventoryAccountId', v)}
                accountType="ASSET"
                onlyPostable
                label={t('warehouses.inventoryAccount')}
                labelAr={isRTL ? t('warehouses.inventoryAccount') : undefined}
                placeholder={isRTL ? 'اختر حساب المخزون...' : 'Select inventory account...'}
                error={errors.inventoryAccountId}
              />

              <AccountSelector
                value={form.cogsAccountId}
                onChange={(v) => updateField('cogsAccountId', v)}
                accountType="EXPENSE"
                onlyPostable
                label={t('warehouses.cogsAccount')}
                labelAr={isRTL ? t('warehouses.cogsAccount') : undefined}
                placeholder={isRTL ? 'اختر حساب التكلفة...' : 'Select COGS account...'}
                error={errors.cogsAccountId}
              />

              <AccountSelector
                value={form.revenueAccountId}
                onChange={(v) => updateField('revenueAccountId', v)}
                accountType="REVENUE"
                onlyPostable
                label={t('warehouses.revenueAccount')}
                labelAr={isRTL ? t('warehouses.revenueAccount') : undefined}
                placeholder={isRTL ? 'اختر حساب الإيرادات...' : 'Select revenue account...'}
                error={errors.revenueAccountId}
              />

              <AccountSelector
                value={form.expenseAccountId}
                onChange={(v) => updateField('expenseAccountId', v)}
                accountType="EXPENSE"
                onlyPostable
                label={t('warehouses.expenseAccount')}
                labelAr={isRTL ? t('warehouses.expenseAccount') : undefined}
                placeholder={isRTL ? 'اختر حساب المصروفات...' : 'Select expense account...'}
                error={errors.expenseAccountId}
              />

              <AccountSelector
                value={form.priceDifferenceAccountId}
                onChange={(v) => updateField('priceDifferenceAccountId', v)}
                accountType="EXPENSE"
                onlyPostable
                label={t('warehouses.priceDifferenceAccount')}
                labelAr={isRTL ? t('warehouses.priceDifferenceAccount') : undefined}
                placeholder={isRTL ? 'اختر حساب فروقات الأسعار...' : 'Select price difference account...'}
                error={errors.priceDifferenceAccountId}
              />
            </div>
          </div>
        </div>

        {/* Footer — Full Width */}
        <div
          className="mt-6 rounded-lg border px-5 py-3 flex items-center justify-end gap-3"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(listPath)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {isEdit ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </form>
    </div>
  );
}
