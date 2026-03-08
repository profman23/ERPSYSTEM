/**
 * AccountFormPanel — Create/Edit form for a COA account
 *
 * Fields: G/L Account, Type, Name, Parent, Postable, Balance, Currency, Description
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Hash,
  Layers,
  DollarSign,
  FileText,
  GitBranch,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/useResponsive';
import { AccountSelector } from './AccountSelector';
import { FormRow } from './AccountFormRow';
import { extractApiError } from '@/lib/apiError';
import { useToast } from '@/components/ui/toast';
import {
  useCreateChartOfAccount,
  useUpdateChartOfAccount,
  type ChartOfAccount,
  type CreateChartOfAccountInput,
  type UpdateChartOfAccountInput,
} from '@/hooks/useChartOfAccounts';

// ═══════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════

interface FormData {
  code: string;
  name: string;
  accountType: string;
  parentId: string | null;
  isPostable: boolean;
  normalBalance: 'DEBIT' | 'CREDIT';
  currency: string;
  description: string;
}

const EMPTY_FORM: FormData = {
  code: '',
  name: '',
  accountType: 'ASSET',
  parentId: null,
  isPostable: false,
  normalBalance: 'DEBIT',
  currency: '',
  description: '',
};

const CURRENCY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'SAR', label: 'SAR' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'AED', label: 'AED' },
  { value: 'EGP', label: 'EGP' },
  { value: 'KWD', label: 'KWD' },
  { value: 'QAR', label: 'QAR' },
  { value: 'BHD', label: 'BHD' },
  { value: 'OMR', label: 'OMR' },
  { value: 'JOD', label: 'JOD' },
  { value: 'TRY', label: 'TRY' },
  { value: 'INR', label: 'INR' },
  { value: 'CNY', label: 'CNY' },
  { value: 'JPY', label: 'JPY' },
];

function deriveNormalBalance(accountType: string): 'DEBIT' | 'CREDIT' {
  return ['ASSET', 'EXPENSE'].includes(accountType) ? 'DEBIT' : 'CREDIT';
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AccountFormPanelProps {
  account: ChartOfAccount | null;
  isEdit: boolean;
  isRTL: boolean;
  createDefaults?: { parentId?: string; accountType?: string };
  onCancel: () => void;
  onSuccess: (accountId?: string) => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function AccountFormPanel({ account, isEdit, isRTL, createDefaults, onCancel, onSuccess }: AccountFormPanelProps) {
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const createMutation = useCreateChartOfAccount();
  const updateMutation = useUpdateChartOfAccount();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize form
  useEffect(() => {
    if (isEdit && account) {
      setFormData({
        code: account.code,
        name: account.name,
        accountType: account.accountType,
        parentId: account.parentId,
        isPostable: account.isPostable,
        normalBalance: deriveNormalBalance(account.accountType),
        currency: account.currency || '',
        description: account.description || '',
      });
    } else {
      const type = createDefaults?.accountType || 'ASSET';
      setFormData({
        ...EMPTY_FORM,
        parentId: createDefaults?.parentId || null,
        accountType: type,
        normalBalance: deriveNormalBalance(type),
      });
    }
    setErrors({});
    setSubmitError(null);
  }, [isEdit, account, createDefaults]);

  const updateField = useCallback((field: keyof FormData, value: string | boolean | null) => {
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

  // Auto-derive normalBalance from accountType
  useEffect(() => {
    setFormData((prev) => ({ ...prev, normalBalance: deriveNormalBalance(prev.accountType) }));
  }, [formData.accountType]);

  const accountTypeOptions = useMemo(() => [
    { value: 'ASSET', label: isRTL ? 'أصول' : 'Asset' },
    { value: 'LIABILITY', label: isRTL ? 'خصوم' : 'Liability' },
    { value: 'EQUITY', label: isRTL ? 'حقوق ملكية' : 'Equity' },
    { value: 'REVENUE', label: isRTL ? 'إيرادات' : 'Revenue' },
    { value: 'EXPENSE', label: isRTL ? 'مصروفات' : 'Expense' },
  ], [isRTL]);

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.code.trim()) newErrors.code = isRTL ? 'رمز الحساب مطلوب' : 'Account code is required';
    else if (!/^[A-Z0-9\-_.]+$/i.test(formData.code.trim())) newErrors.code = isRTL ? 'الرمز يجب أن يحتوي على حروف وأرقام فقط' : 'Code must contain only letters, numbers, hyphens, dots, or underscores';
    if (!formData.name.trim()) newErrors.name = isRTL ? 'اسم الحساب مطلوب' : 'Account name is required';
    if (!formData.accountType) newErrors.accountType = isRTL ? 'نوع الحساب مطلوب' : 'Account type is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isRTL]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    setSubmitError(null);

    try {
      if (isEdit && account) {
        const input: UpdateChartOfAccountInput & { id: string } = {
          id: account.id,
          code: formData.code.trim().toUpperCase() || undefined,
          name: formData.name.trim() || undefined,
          parentId: formData.parentId,
          isPostable: formData.isPostable,
          normalBalance: formData.normalBalance,
          currency: formData.currency || undefined,
          description: formData.description.trim() || undefined,
          version: account.version, // optimistic locking
        };
        await updateMutation.mutateAsync(input);
        showToast('success', isRTL ? 'تم تحديث الحساب بنجاح' : 'Account updated successfully');
        onSuccess(account.id);
      } else {
        const input: CreateChartOfAccountInput = {
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          accountType: formData.accountType as CreateChartOfAccountInput['accountType'],
          parentId: formData.parentId,
          isPostable: formData.isPostable,
          normalBalance: formData.normalBalance,
          currency: formData.currency || undefined,
          description: formData.description.trim() || undefined,
        };
        const created = await createMutation.mutateAsync(input);
        showToast('success', isRTL ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully');
        onSuccess(created.id);
      }
    } catch (err) {
      const apiError = extractApiError(err);
      if (Object.keys(apiError.fieldErrors).length > 0) {
        setErrors(apiError.fieldErrors as Partial<Record<keyof FormData, string>>);
      }
      setSubmitError(apiError.message);
    }
  }, [formData, validate, isEdit, account, createMutation, updateMutation, showToast, isRTL, onSuccess]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5">
        {submitError && (
          <div
            className="px-3 py-2 text-sm rounded-lg border"
            style={{ backgroundColor: 'var(--badge-danger-bg)', borderColor: 'var(--badge-danger-border)', color: 'var(--color-text-danger)' }}
          >
            {submitError}
          </div>
        )}

        <FormRow label={isRTL ? 'حساب الأستاذ' : 'G/L Account'} required={!isEdit} error={errors.code} icon={Hash} emoji="#️⃣" compact={isMobile}>
          <Input
            value={formData.code}
            onChange={(e) => updateField('code', e.target.value.toUpperCase())}
            placeholder="1110"
            error={!!errors.code}
            className="h-8 text-sm font-mono"
            dir="ltr"
            disabled={isEdit}
            style={isEdit ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          />
        </FormRow>

        <FormRow label={isRTL ? 'نوع الحساب' : 'Account Type'} required error={errors.accountType} icon={Layers} emoji="📚" compact={isMobile}>
          <SimpleSelect
            value={formData.accountType}
            onValueChange={(v) => updateField('accountType', v)}
            options={accountTypeOptions}
            placeholder={isRTL ? 'اختر' : 'Select'}
            disabled={isEdit}
            error={!!errors.accountType}
          />
        </FormRow>

        <FormRow label={isRTL ? 'الاسم' : 'Name'} required error={errors.name} icon={FileText} emoji="📄" compact={isMobile}>
          <Input
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder={isRTL ? 'اسم الحساب' : 'Account name'}
            error={!!errors.name}
            className="h-8 text-sm"
          />
        </FormRow>

        <FormRow label={isRTL ? 'الحساب الأب' : 'Parent Account'} icon={GitBranch} emoji="🌿" compact={isMobile}>
          <AccountSelector
            value={formData.parentId}
            onChange={(val) => updateField('parentId', val)}
            accountType={formData.accountType as 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'}
            excludeId={account?.id}
            placeholder={isRTL ? 'بدون (جذري)' : 'None (root)'}
            placeholderAr="بدون (جذري)"
            error={errors.parentId}
          />
        </FormRow>

        <FormRow label={isRTL ? 'قابل للترحيل' : 'Postable'} icon={CheckCircle2} emoji="✅" compact={isMobile}>
          <div className="flex items-center gap-2 h-8">
            <Switch
              checked={formData.isPostable}
              onCheckedChange={(val) => updateField('isPostable', val)}
            />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {formData.isPostable ? (isRTL ? 'نعم' : 'Yes') : (isRTL ? 'لا' : 'No')}
            </span>
          </div>
        </FormRow>

        <FormRow label={isRTL ? 'الرصيد' : 'Balance'} icon={DollarSign} emoji="💲" compact={isMobile}>
          <div className="flex items-center h-8">
            <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-text)' }}>0.00</span>
          </div>
        </FormRow>

        <FormRow label={isRTL ? 'العملة' : 'Currency'} icon={DollarSign} emoji="💲" compact={isMobile}>
          <SimpleSelect
            value={formData.currency}
            onValueChange={(v) => updateField('currency', v)}
            options={CURRENCY_OPTIONS}
            placeholder={isRTL ? 'اختر العملة' : 'Select currency'}
          />
        </FormRow>

        <FormRow label={isRTL ? 'الوصف' : 'Description'} alignTop icon={FileText} emoji="📄" compact={isMobile}>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder={isRTL ? 'اختياري' : 'Optional'}
            rows={2}
            className="w-full px-3 py-1.5 text-sm rounded-lg border resize-none"
            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--color-text)' }}
          />
        </FormRow>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 border-t flex items-center justify-end gap-2 shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {isRTL ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin me-1.5" />}
          {isEdit ? (isRTL ? 'حفظ' : 'Save') : (isRTL ? 'إنشاء' : 'Create')}
        </Button>
      </div>
    </div>
  );
}
