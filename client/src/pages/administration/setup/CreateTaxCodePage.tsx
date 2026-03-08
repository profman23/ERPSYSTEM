/**
 * Create/Edit Tax Code Page
 *
 * Create: /app/administration/setup/tax-codes/create
 * Edit:   /app/administration/setup/tax-codes/:id/edit
 *
 * Follows SystemCreateUserPage Card-based form pattern.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Loader2, Hash, Type, Receipt, Percent, Calculator, Calendar, Globe,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { AccountSelector } from '@/components/finance/AccountSelector';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { useScopePath } from '@/hooks/useScopePath';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/toast';
import { extractApiError } from '@/lib/apiError';
import {
  useTaxCodeDetail,
  useCreateTaxCode,
  useUpdateTaxCode,
} from '@/hooks/useTaxCodes';

const SCREEN_CODE = 'TAX_CODES';

interface FormData {
  code: string;
  name: string;
  taxType: 'OUTPUT_TAX' | 'INPUT_TAX' | 'EXEMPT' | '';
  rate: string;
  calculationMethod: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'TAX_INCLUDED';
  salesTaxAccountId: string | null;
  purchaseTaxAccountId: string | null;
  effectiveFrom: string;
  effectiveTo: string;
  jurisdiction: string;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  taxType: '',
  rate: '0',
  calculationMethod: 'PERCENTAGE',
  salesTaxAccountId: null,
  purchaseTaxAccountId: null,
  effectiveFrom: '',
  effectiveTo: '',
  jurisdiction: '',
};

export default function CreateTaxCodePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { isLoading: permLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();

  const isEdit = !!id;
  const listPath = getPath('administration/setup/tax-codes');

  const { data: existingTaxCode, isLoading: loadingDetail } = useTaxCodeDetail(id);
  const createMutation = useCreateTaxCode();
  const updateMutation = useUpdateTaxCode();

  const [form, setForm] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  // Pre-fill form in edit mode
  // Two-step update: clear Select fields first to force Radix Select to see a value transition,
  // then set the real values on next frame so they re-match the SelectItems.
  useEffect(() => {
    if (isEdit && existingTaxCode) {
      const data: FormData = {
        code: existingTaxCode.code,
        name: existingTaxCode.name,
        taxType: existingTaxCode.taxType,
        rate: parseFloat(existingTaxCode.rate).toString(),
        calculationMethod: existingTaxCode.calculationMethod,
        salesTaxAccountId: existingTaxCode.salesTaxAccountId,
        purchaseTaxAccountId: existingTaxCode.purchaseTaxAccountId,
        effectiveFrom: existingTaxCode.effectiveFrom || '',
        effectiveTo: existingTaxCode.effectiveTo || '',
        jurisdiction: existingTaxCode.jurisdiction || '',
      };
      setForm({ ...data, taxType: '', calculationMethod: 'PERCENTAGE' });
      requestAnimationFrame(() => setForm(data));
    }
  }, [isEdit, existingTaxCode]);

  const isExempt = form.taxType === 'EXEMPT';
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const taxTypeOptions = useMemo(() => [
    { value: 'OUTPUT_TAX', label: isRTL ? 'ضريبة مخرجات (مبيعات)' : 'Output Tax (Sales)' },
    { value: 'INPUT_TAX', label: isRTL ? 'ضريبة مدخلات (مشتريات)' : 'Input Tax (Purchases)' },
    { value: 'EXEMPT', label: isRTL ? 'معفى' : 'Exempt' },
  ], [isRTL]);

  const calcMethodOptions = useMemo(() => [
    { value: 'PERCENTAGE', label: isRTL ? 'نسبة مئوية' : 'Percentage' },
    { value: 'FIXED_AMOUNT', label: isRTL ? 'مبلغ ثابت' : 'Fixed Amount' },
    { value: 'TAX_INCLUDED', label: isRTL ? 'شامل الضريبة' : 'Tax Included' },
  ], [isRTL]);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'taxType') {
        if (value === 'EXEMPT') {
          next.rate = '0';
          next.salesTaxAccountId = null;
          next.purchaseTaxAccountId = null;
        } else if (value === 'OUTPUT_TAX') {
          next.purchaseTaxAccountId = null;
        } else if (value === 'INPUT_TAX') {
          next.salesTaxAccountId = null;
        }
      }
      return next;
    });
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

    const newErrors: Record<string, string> = {};
    if (!form.code.trim()) newErrors.code = t('common.required');
    if (!form.name.trim()) newErrors.name = t('common.required');
    if (!form.taxType) newErrors.taxType = t('common.required');

    const rateNum = parseFloat(form.rate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      newErrors.rate = isRTL ? 'النسبة يجب أن تكون بين 0 و 100' : 'Rate must be between 0 and 100';
    }

    if (form.effectiveFrom && form.effectiveTo && form.effectiveTo <= form.effectiveFrom) {
      newErrors.effectiveTo = isRTL ? 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية' : 'Effective To must be after Effective From';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const payload = {
        code: form.code.toUpperCase(),
        name: form.name,
        taxType: form.taxType as 'OUTPUT_TAX' | 'INPUT_TAX' | 'EXEMPT',
        rate: rateNum,
        calculationMethod: form.calculationMethod,
        salesTaxAccountId: form.salesTaxAccountId || null,
        purchaseTaxAccountId: form.purchaseTaxAccountId || null,
        effectiveFrom: form.effectiveFrom || undefined,
        effectiveTo: form.effectiveTo || null,
        jurisdiction: form.jurisdiction || undefined,
      };

      if (isEdit && existingTaxCode) {
        await updateMutation.mutateAsync({
          id,
          ...payload,
          version: existingTaxCode.version,
        });
        showToast('success', t('finance.taxCodeUpdated'));
      } else {
        await createMutation.mutateAsync(payload);
        showToast('success', t('finance.taxCodeCreated'));
      }

      navigate(listPath);
    } catch (err) {
      const apiError = extractApiError(err);
      if (Object.keys(apiError.fieldErrors).length > 0) {
        setErrors(apiError.fieldErrors);
      }
      setSubmitError(apiError.message);
      showToast('error', apiError.message);
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
          <StyledIcon icon={Receipt} emoji="🧾" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isEdit ? t('finance.editTaxCode') : t('finance.newTaxCode')}
          </h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
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
          {/* Row 1: Code + Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('finance.taxCode')}
              </Label>
              <Input
                value={form.code}
                onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                placeholder={isRTL ? 'مثال: VAT5-OUT' : 'e.g., VAT5-OUT'}
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
                {t('finance.taxCodeName')}
              </Label>
              <Input
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder={isRTL ? 'اسم رمز الضريبة' : 'Tax code name'}
                error={!!errors.name}
                className="h-9"
              />
              {errors.name && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.name}</p>
              )}
            </div>
          </div>

          {/* Row 2: Tax Type + Rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('finance.taxType')}
              </Label>
              <SimpleSelect
                options={taxTypeOptions}
                value={form.taxType}
                onValueChange={(v: string) => updateField('taxType', v as FormData['taxType'])}
                placeholder={isRTL ? 'اختر نوع الضريبة' : 'Select tax type'}
                disabled={isEdit}
                error={!!errors.taxType}
              />
              {errors.taxType && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.taxType}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('finance.taxRate')}
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.rate}
                onChange={(e) => updateField('rate', e.target.value)}
                disabled={isExempt}
                error={!!errors.rate}
                className="h-9 font-mono"
              />
              {errors.rate && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.rate}</p>
              )}
            </div>
          </div>

          {/* Row 3: Calculation Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('finance.calculationMethod')}
              </Label>
              <SimpleSelect
                options={calcMethodOptions}
                value={form.calculationMethod}
                onValueChange={(v: string) => updateField('calculationMethod', v as FormData['calculationMethod'])}
              />
            </div>
          </div>

          {/* Row 4: Account Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AccountSelector
              value={form.salesTaxAccountId}
              onChange={(v) => updateField('salesTaxAccountId', v)}
              onlyPostable
              disabled={form.taxType === 'INPUT_TAX' || form.taxType === 'EXEMPT'}
              label={t('finance.salesTaxAccount')}
              labelAr={isRTL ? t('finance.salesTaxAccount') : undefined}
              placeholder={isRTL ? 'اختر حساب...' : 'Select account...'}
              error={errors.salesTaxAccountId}
            />
            <AccountSelector
              value={form.purchaseTaxAccountId}
              onChange={(v) => updateField('purchaseTaxAccountId', v)}
              onlyPostable
              disabled={form.taxType === 'OUTPUT_TAX' || form.taxType === 'EXEMPT'}
              label={t('finance.purchaseTaxAccount')}
              labelAr={isRTL ? t('finance.purchaseTaxAccount') : undefined}
              placeholder={isRTL ? 'اختر حساب...' : 'Select account...'}
              error={errors.purchaseTaxAccountId}
            />
          </div>

          {/* Row 5: Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('finance.effectiveFrom')}
              </Label>
              <Input
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => updateField('effectiveFrom', e.target.value)}
                error={!!errors.effectiveFrom}
                className="h-9"
              />
              {errors.effectiveFrom && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.effectiveFrom}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('finance.effectiveTo')}
              </Label>
              <Input
                type="date"
                value={form.effectiveTo}
                onChange={(e) => updateField('effectiveTo', e.target.value)}
                error={!!errors.effectiveTo}
                className="h-9"
              />
              {errors.effectiveTo && (
                <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.effectiveTo}</p>
              )}
            </div>
          </div>

          {/* Row 6: Jurisdiction */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('finance.jurisdiction')}
              </Label>
              <Input
                value={form.jurisdiction}
                onChange={(e) => updateField('jurisdiction', e.target.value)}
                placeholder={isRTL ? 'مثال: SA, AE' : 'e.g., SA, AE'}
                className="h-9"
              />
            </div>
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
