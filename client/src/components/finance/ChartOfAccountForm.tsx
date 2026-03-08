/**
 * Chart of Account Form (Drawer)
 *
 * Create / Edit a single account in the Chart of Accounts.
 * Opened as a Drawer from the COA page.
 *
 * Fields: code, name, nameAr, accountType, parentId, isPostable,
 *         normalBalance, currency, description
 */

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Drawer, DrawerFooter } from '@/components/ui/Drawer';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AccountSelector } from './AccountSelector';
import { extractApiError } from '@/lib/apiError';
import {
  useCreateChartOfAccount,
  useUpdateChartOfAccount,
  type ChartOfAccount,
  type CreateChartOfAccountInput,
  type UpdateChartOfAccountInput,
} from '@/hooks/useChartOfAccounts';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ChartOfAccountFormProps {
  open: boolean;
  onClose: () => void;
  /** Account to edit — null = create mode */
  account?: ChartOfAccount | null;
  /** Pre-set parent (when "Add Child" is clicked) */
  defaultParentId?: string | null;
  /** Pre-set account type from parent */
  defaultAccountType?: string;
  onSuccess?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ACCOUNT_TYPES = [
  { value: 'ASSET', label: 'Asset', labelAr: 'أصول' },
  { value: 'LIABILITY', label: 'Liability', labelAr: 'خصوم' },
  { value: 'EQUITY', label: 'Equity', labelAr: 'حقوق ملكية' },
  { value: 'REVENUE', label: 'Revenue', labelAr: 'إيرادات' },
  { value: 'EXPENSE', label: 'Expense', labelAr: 'مصروفات' },
];

function deriveNormalBalance(accountType: string): 'DEBIT' | 'CREDIT' {
  return ['ASSET', 'EXPENSE'].includes(accountType) ? 'DEBIT' : 'CREDIT';
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function ChartOfAccountForm({
  open,
  onClose,
  account,
  defaultParentId,
  defaultAccountType,
  onSuccess,
}: ChartOfAccountFormProps) {
  const { isRTL } = useLanguage();
  const isEdit = !!account;

  // Mutations
  const createMutation = useCreateChartOfAccount();
  const updateMutation = useUpdateChartOfAccount();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [accountType, setAccountType] = useState('ASSET');
  const [parentId, setParentId] = useState<string | null>(null);
  const [isPostable, setIsPostable] = useState(false);
  const [normalBalance, setNormalBalance] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [currency, setCurrency] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');

  // Errors
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Initialize form
  useEffect(() => {
    if (!open) return;

    if (account) {
      setCode(account.code);
      setName(account.name);
      setNameAr(account.nameAr || '');
      setAccountType(account.accountType);
      setParentId(account.parentId);
      setIsPostable(account.isPostable);
      setNormalBalance(account.normalBalance);
      setCurrency(account.currency || '');
      setDescription(account.description || '');
      setDescriptionAr(account.descriptionAr || '');
    } else {
      setCode('');
      setName('');
      setNameAr('');
      setAccountType(defaultAccountType || 'ASSET');
      setParentId(defaultParentId || null);
      setIsPostable(false);
      setNormalBalance(deriveNormalBalance(defaultAccountType || 'ASSET'));
      setCurrency('');
      setDescription('');
      setDescriptionAr('');
    }

    setSubmitError('');
    setFieldErrors({});
  }, [open, account, defaultParentId, defaultAccountType]);

  // Auto-derive normalBalance when accountType changes (only in create mode)
  useEffect(() => {
    if (!isEdit) {
      setNormalBalance(deriveNormalBalance(accountType));
    }
  }, [accountType, isEdit]);

  // Account type options (translated)
  const accountTypeOptions = useMemo(
    () =>
      ACCOUNT_TYPES.map((at) => ({
        value: at.value,
        label: isRTL ? at.labelAr : at.label,
      })),
    [isRTL],
  );

  // Submit
  const handleSubmit = async () => {
    setSubmitError('');
    setFieldErrors({});

    try {
      if (isEdit && account) {
        const input: UpdateChartOfAccountInput & { id: string } = {
          id: account.id,
          code: code.trim() || undefined,
          name: name.trim() || undefined,
          nameAr: nameAr.trim() || undefined,
          parentId: parentId,
          isPostable,
          normalBalance,
          currency: currency.trim() || undefined,
          description: description.trim() || undefined,
          descriptionAr: descriptionAr.trim() || undefined,
        };
        await updateMutation.mutateAsync(input);
      } else {
        const input: CreateChartOfAccountInput = {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          nameAr: nameAr.trim() || undefined,
          accountType: accountType as CreateChartOfAccountInput['accountType'],
          parentId: parentId,
          isPostable,
          normalBalance,
          currency: currency.trim() || undefined,
          description: description.trim() || undefined,
          descriptionAr: descriptionAr.trim() || undefined,
        };
        await createMutation.mutateAsync(input);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      const apiError = extractApiError(err);
      if (Object.keys(apiError.fieldErrors).length > 0) {
        setFieldErrors(apiError.fieldErrors);
      }
      setSubmitError(apiError.message);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Account' : 'New Account'}
      titleAr={isEdit ? 'تعديل حساب' : 'حساب جديد'}
      size="md"
      footer={
        <DrawerFooter
          onCancel={onClose}
          onConfirm={handleSubmit}
          confirmLabel={isEdit ? 'Save Changes' : 'Create Account'}
          loading={isSubmitting}
          disabled={!code.trim() || !name.trim()}
        />
      }
    >
      <div className="space-y-5">
        {/* Submit error */}
        {submitError && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
          </div>
        )}

        {/* Account Code */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
            {isRTL ? 'رمز الحساب' : 'Account Code'}
            <span className="text-red-500 ms-1">*</span>
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={isRTL ? 'مثال: 1110' : 'e.g. 1110'}
            className={cn(
              'w-full h-11 px-3 text-sm rounded-lg border font-mono',
              'bg-[var(--color-surface)] text-[var(--color-text)]',
              'placeholder:text-[var(--color-text-muted)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]',
              fieldErrors.code ? 'border-red-500' : 'border-[var(--color-border)]',
            )}
            dir="ltr"
          />
          {fieldErrors.code && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.code}</p>
          )}
        </div>

        {/* Account Name (EN) */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
            {isRTL ? 'اسم الحساب (إنجليزي)' : 'Account Name'}
            <span className="text-red-500 ms-1">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isRTL ? 'اسم الحساب بالإنجليزية' : 'Enter account name'}
            className={cn(
              'w-full h-11 px-3 text-sm rounded-lg border',
              'bg-[var(--color-surface)] text-[var(--color-text)]',
              'placeholder:text-[var(--color-text-muted)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]',
              fieldErrors.name ? 'border-red-500' : 'border-[var(--color-border)]',
            )}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
          )}
        </div>

        {/* Account Name (AR) */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
            {isRTL ? 'اسم الحساب (عربي)' : 'Account Name (Arabic)'}
          </label>
          <input
            type="text"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder={isRTL ? 'اسم الحساب بالعربية' : 'Arabic account name'}
            className={cn(
              'w-full h-11 px-3 text-sm rounded-lg border',
              'bg-[var(--color-surface)] text-[var(--color-text)]',
              'placeholder:text-[var(--color-text-muted)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]',
              'border-[var(--color-border)]',
            )}
            dir="rtl"
          />
        </div>

        {/* Account Type */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
            {isRTL ? 'نوع الحساب' : 'Account Type'}
            <span className="text-red-500 ms-1">*</span>
          </label>
          <SimpleSelect
            value={accountType}
            onValueChange={(val) => setAccountType(val)}
            options={accountTypeOptions}
            placeholder={isRTL ? 'اختر نوع الحساب' : 'Select type'}
            disabled={isEdit}
            error={!!fieldErrors.accountType}
          />
          {isEdit && (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {isRTL ? 'لا يمكن تغيير نوع الحساب بعد الإنشاء' : 'Account type cannot be changed after creation'}
            </p>
          )}
          {fieldErrors.accountType && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.accountType}</p>
          )}
        </div>

        {/* Parent Account */}
        <AccountSelector
          value={parentId}
          onChange={setParentId}
          accountType={accountType as 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'}
          excludeId={account?.id}
          label={isRTL ? 'الحساب الأب' : 'Parent Account'}
          placeholder={isRTL ? 'بدون أب (حساب جذري)' : 'None (root account)'}
          placeholderAr="بدون أب (حساب جذري)"
          error={fieldErrors.parentId}
        />

        {/* Postable Toggle */}
        <div className="flex items-center justify-between py-2">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)]">
              {isRTL ? 'قابل للترحيل' : 'Postable'}
            </label>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {isRTL
                ? 'الحسابات القابلة للترحيل تقبل القيود المحاسبية'
                : 'Postable accounts accept journal entries'}
            </p>
          </div>
          <Switch
            checked={isPostable}
            onCheckedChange={setIsPostable}
          />
        </div>

        {/* Normal Balance */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            {isRTL ? 'الرصيد الطبيعي' : 'Normal Balance'}
          </label>
          <RadioGroup
            value={normalBalance}
            onValueChange={(val) => setNormalBalance(val as 'DEBIT' | 'CREDIT')}
            className="flex gap-6"
          >
            <RadioGroupItem value="DEBIT">
              <span className="text-sm text-[var(--color-text)]">
                {isRTL ? 'مدين' : 'Debit'}
              </span>
            </RadioGroupItem>
            <RadioGroupItem value="CREDIT">
              <span className="text-sm text-[var(--color-text)]">
                {isRTL ? 'دائن' : 'Credit'}
              </span>
            </RadioGroupItem>
          </RadioGroup>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {isRTL
              ? 'يُحدد تلقائياً بناءً على نوع الحساب. قم بالتغيير للحسابات المعاكسة فقط.'
              : 'Auto-derived from account type. Override for contra accounts only.'}
          </p>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
            {isRTL ? 'العملة' : 'Currency'}
          </label>
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            placeholder={isRTL ? 'مثال: USD, SAR' : 'e.g. USD, SAR'}
            maxLength={3}
            className={cn(
              'w-full h-11 px-3 text-sm rounded-lg border font-mono',
              'bg-[var(--color-surface)] text-[var(--color-text)]',
              'placeholder:text-[var(--color-text-muted)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]',
              'border-[var(--color-border)]',
            )}
            dir="ltr"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {isRTL ? 'اتركه فارغاً لاستخدام العملة الافتراضية للمنشأة' : 'Leave empty to use tenant default currency'}
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
            {isRTL ? 'الوصف' : 'Description'}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isRTL ? 'وصف اختياري' : 'Optional description'}
            rows={2}
            className={cn(
              'w-full px-3 py-2 text-sm rounded-lg border resize-none',
              'bg-[var(--color-surface)] text-[var(--color-text)]',
              'placeholder:text-[var(--color-text-muted)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]',
              'border-[var(--color-border)]',
            )}
          />
        </div>
      </div>
    </Drawer>
  );
}

export default ChartOfAccountForm;
