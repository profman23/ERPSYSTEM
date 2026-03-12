/**
 * Create/Edit Item Group Page
 *
 * Create: /app/administration/setup/item-groups/create
 * Edit:   /app/administration/setup/item-groups/:id/edit
 *
 * 2-Card side-by-side layout: General Info + GL Accounts.
 * Follows CreateWarehousePage pattern.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Loader2, Hash, Type, Layers, FileText, BookOpen, Receipt,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { AccountSelector } from '@/components/finance/AccountSelector';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { useScopePath } from '@/hooks/useScopePath';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/toast';
import { extractApiError } from '@/lib/apiError';
import { useActiveTaxCodes } from '@/hooks/useTaxCodes';
import {
  useItemGroupDetail,
  useCreateItemGroup,
  useUpdateItemGroup,
} from '@/hooks/useItemGroups';
import { useSetPageResource } from '@/contexts/PageResourceContext';

const SCREEN_CODE = 'ITEM_GROUPS';

type ItemGroupType = 'MEDICINE' | 'SURGICAL_SUPPLY' | 'EQUIPMENT' | 'CONSUMABLE' | 'SERVICE';

interface FormData {
  code: string;
  name: string;
  itemGroupType: ItemGroupType | '';
  description: string;
  // GL Accounts
  inventoryAccountId: string | null;
  cogsAccountId: string | null;
  purchaseAccountId: string | null;
  revenueAccountId: string | null;
  defaultSalesTaxCodeId: string | null;
  defaultPurchaseTaxCodeId: string | null;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  itemGroupType: '',
  description: '',
  inventoryAccountId: null,
  cogsAccountId: null,
  purchaseAccountId: null,
  revenueAccountId: null,
  defaultSalesTaxCodeId: null,
  defaultPurchaseTaxCodeId: null,
};

export default function CreateItemGroupPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { isLoading: permLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();

  const isEdit = !!id;
  const listPath = getPath('administration/setup/item-groups');

  const { data: existingItemGroup, isLoading: loadingDetail } = useItemGroupDetail(id);
  const { data: salesTaxCodes } = useActiveTaxCodes('OUTPUT_TAX');
  const { data: purchaseTaxCodes } = useActiveTaxCodes('INPUT_TAX');
  const createMutation = useCreateItemGroup();
  const updateMutation = useUpdateItemGroup();

  const [form, setForm] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  useSetPageResource('item_group', isEdit ? id : undefined, existingItemGroup?.code);

  // Pre-fill form in edit mode
  // Two-step update: clear itemGroupType first to force Radix Select to see a value transition,
  // then set the real value on next frame so it re-matches the SelectItem.
  useEffect(() => {
    if (isEdit && existingItemGroup) {
      const data: FormData = {
        code: existingItemGroup.code,
        name: existingItemGroup.name,
        itemGroupType: existingItemGroup.itemGroupType,
        description: existingItemGroup.description || '',
        inventoryAccountId: existingItemGroup.inventoryAccountId,
        cogsAccountId: existingItemGroup.cogsAccountId,
        purchaseAccountId: existingItemGroup.purchaseAccountId,
        revenueAccountId: existingItemGroup.revenueAccountId,
        defaultSalesTaxCodeId: existingItemGroup.defaultSalesTaxCodeId,
        defaultPurchaseTaxCodeId: existingItemGroup.defaultPurchaseTaxCodeId,
      };
      setForm({ ...data, itemGroupType: '' });
      requestAnimationFrame(() => setForm(data));
    }
  }, [isEdit, existingItemGroup]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const typeOptions = useMemo(() => [
    { value: 'MEDICINE', label: isRTL ? 'أدوية' : 'Medicine' },
    { value: 'SURGICAL_SUPPLY', label: isRTL ? 'مستلزمات جراحية' : 'Surgical Supply' },
    { value: 'EQUIPMENT', label: isRTL ? 'أجهزة ومعدات' : 'Equipment' },
    { value: 'CONSUMABLE', label: isRTL ? 'مواد استهلاكية' : 'Consumable' },
    { value: 'SERVICE', label: isRTL ? 'خدمات' : 'Service' },
  ], [isRTL]);

  const salesTaxOptions = useMemo(() => {
    if (!salesTaxCodes) return [];
    return salesTaxCodes.map((tc) => ({
      value: tc.id,
      label: `${tc.code} - ${isRTL && tc.nameAr ? tc.nameAr : tc.name}`,
    }));
  }, [salesTaxCodes, isRTL]);

  const purchaseTaxOptions = useMemo(() => {
    if (!purchaseTaxCodes) return [];
    return purchaseTaxCodes.map((tc) => ({
      value: tc.id,
      label: `${tc.code} - ${isRTL && tc.nameAr ? tc.nameAr : tc.name}`,
    }));
  }, [purchaseTaxCodes, isRTL]);

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
    if (!form.code.trim()) newErrors.code = t('common.required', 'Required');
    if (!form.name.trim()) newErrors.name = t('common.required', 'Required');
    if (!form.itemGroupType) newErrors.itemGroupType = t('common.required', 'Required');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const payload = {
        code: form.code.toUpperCase(),
        name: form.name,
        itemGroupType: form.itemGroupType as ItemGroupType,
        description: form.description || undefined,
        inventoryAccountId: form.inventoryAccountId,
        cogsAccountId: form.cogsAccountId,
        purchaseAccountId: form.purchaseAccountId,
        revenueAccountId: form.revenueAccountId,
        defaultSalesTaxCodeId: form.defaultSalesTaxCodeId,
        defaultPurchaseTaxCodeId: form.defaultPurchaseTaxCodeId,
      };

      if (isEdit) {
        await updateMutation.mutateAsync({ id, ...payload });
        showToast('success', isRTL ? 'تم تحديث مجموعة الأصناف' : 'Item group updated');
      } else {
        await createMutation.mutateAsync(payload);
        showToast('success', isRTL ? 'تم إنشاء مجموعة الأصناف' : 'Item group created');
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

  if (permLoading || (isEdit && loadingDetail)) {
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
          <StyledIcon icon={Layers} emoji="📦" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isEdit
              ? (isRTL ? 'تعديل مجموعة أصناف' : 'Edit Item Group')
              : (isRTL ? 'إنشاء مجموعة أصناف' : 'Create Item Group')}
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
          {/* Left Card: General Information */}
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
                {isRTL ? 'المعلومات العامة' : 'General Information'}
              </span>
            </div>

            {/* Fields */}
            <div className="px-5 py-5 space-y-4">
              {/* Row 1: Code + Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {t('common.code', 'Code')}
                  </Label>
                  <Input
                    value={form.code}
                    onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                    placeholder={isRTL ? 'مثال: MED' : 'e.g., MED'}
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
                    {t('common.name', 'Name')}
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder={isRTL ? 'اسم مجموعة الأصناف' : 'Item group name'}
                    error={!!errors.name}
                    className="h-9"
                  />
                  {errors.name && (
                    <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.name}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Item Group Type */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'نوع المجموعة' : 'Item Group Type'}
                </Label>
                <SimpleSelect
                  options={typeOptions}
                  value={form.itemGroupType}
                  onValueChange={(v: string) => updateField('itemGroupType', v as ItemGroupType)}
                  placeholder={isRTL ? 'اختر النوع' : 'Select type'}
                  error={!!errors.itemGroupType}
                />
                {errors.itemGroupType && (
                  <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.itemGroupType}</p>
                )}
              </div>

              {/* Row 3: Description */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('common.description', 'Description')}
                </Label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder={isRTL ? 'وصف المجموعة (اختياري)' : 'Item group description (optional)'}
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

          {/* Right Card: GL Accounts */}
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
                {isRTL ? 'الحسابات المحاسبية' : 'GL Accounts'}
              </span>
            </div>

            {/* Account Selectors */}
            <div className="px-5 py-5 space-y-4">
              <AccountSelector
                value={form.inventoryAccountId}
                onChange={(v) => updateField('inventoryAccountId', v)}
                accountType="ASSET"
                onlyPostable
                label={isRTL ? 'حساب المخزون' : 'Inventory Account'}
                placeholder={isRTL ? 'اختر حساب المخزون...' : 'Select inventory account...'}
                error={errors.inventoryAccountId}
              />

              <AccountSelector
                value={form.cogsAccountId}
                onChange={(v) => updateField('cogsAccountId', v)}
                accountType="EXPENSE"
                onlyPostable
                label={isRTL ? 'حساب تكلفة البضاعة المباعة' : 'COGS Account'}
                placeholder={isRTL ? 'اختر حساب التكلفة...' : 'Select COGS account...'}
                error={errors.cogsAccountId}
              />

              <AccountSelector
                value={form.purchaseAccountId}
                onChange={(v) => updateField('purchaseAccountId', v)}
                accountType="EXPENSE"
                onlyPostable
                label={isRTL ? 'حساب المشتريات' : 'Purchase Account'}
                placeholder={isRTL ? 'اختر حساب المشتريات...' : 'Select purchase account...'}
                error={errors.purchaseAccountId}
              />

              <AccountSelector
                value={form.revenueAccountId}
                onChange={(v) => updateField('revenueAccountId', v)}
                accountType="REVENUE"
                onlyPostable
                label={isRTL ? 'حساب الإيرادات' : 'Revenue Account'}
                placeholder={isRTL ? 'اختر حساب الإيرادات...' : 'Select revenue account...'}
                error={errors.revenueAccountId}
              />

              {/* Default Sales Tax Code (OUTPUT_TAX) */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'ضريبة المبيعات الافتراضية' : 'Default Sales Tax'}
                </Label>
                <SimpleSelect
                  options={[
                    { value: '', label: isRTL ? 'بدون ضريبة مبيعات' : 'No sales tax' },
                    ...salesTaxOptions,
                  ]}
                  value={form.defaultSalesTaxCodeId || ''}
                  onValueChange={(v: string) => updateField('defaultSalesTaxCodeId', v || null)}
                  placeholder={isRTL ? 'اختر ضريبة المبيعات...' : 'Select sales tax...'}
                />
              </div>

              {/* Default Purchase Tax Code (INPUT_TAX) */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'ضريبة المشتريات الافتراضية' : 'Default Purchase Tax'}
                </Label>
                <SimpleSelect
                  options={[
                    { value: '', label: isRTL ? 'بدون ضريبة مشتريات' : 'No purchase tax' },
                    ...purchaseTaxOptions,
                  ]}
                  value={form.defaultPurchaseTaxCodeId || ''}
                  onValueChange={(v: string) => updateField('defaultPurchaseTaxCodeId', v || null)}
                  placeholder={isRTL ? 'اختر ضريبة المشتريات...' : 'Select purchase tax...'}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
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
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {isEdit ? t('common.save', 'Save') : t('common.create', 'Create')}
          </Button>
        </div>
      </form>
    </div>
  );
}
