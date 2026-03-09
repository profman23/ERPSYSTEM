/**
 * Create Journal Entry Page
 *
 * Route: /app/finance/journal-entries/create
 * Multi-card form: Header (branch, dates, remarks) + Lines (dynamic table with AccountSelector).
 * Save = POSTED immediately (Document Immutability Rule — no DRAFT).
 * Golden rule: SUM(debit) = SUM(credit) — enforced before save.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, Calendar, FileText, Hash,
  Plus, Trash2, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScopePath } from '@/hooks/useScopePath';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/toast';
import { extractApiError } from '@/lib/apiError';
import { useCreateJournalEntry } from '@/hooks/useJournalEntries';
import { AccountSelector } from '@/components/finance/AccountSelector';
import { getActiveBranch } from '@/hooks/useActiveBranch';

interface LineInput {
  accountId: string;
  debit: string;
  credit: string;
  remarks: string;
}

function emptyLine(): LineInput {
  return { accountId: '', debit: '', credit: '', remarks: '' };
}

export default function CreateJournalEntryPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { showToast } = useToast();

  const listPath = getPath('finance/journal-entries');
  const createMutation = useCreateJournalEntry();

  const activeBranch = getActiveBranch();

  // Header state
  const [postingDate, setPostingDate] = useState(new Date().toISOString().slice(0, 10));
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [reference, setReference] = useState('');
  const [remarks, setRemarks] = useState('');

  // Lines state
  const [lines, setLines] = useState<LineInput[]>([emptyLine(), emptyLine()]);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const isSaving = createMutation.isPending;

  // Totals
  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const line of lines) {
      const d = parseFloat(line.debit) || 0;
      const c = parseFloat(line.credit) || 0;
      debit += d;
      credit += c;
    }
    return { debit, credit };
  }, [lines]);

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.0001 && totals.debit > 0;

  const formatAmount = (val: number) =>
    val.toLocaleString(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Line handlers
  const updateLine = useCallback((index: number, field: keyof LineInput, value: string) => {
    setLines(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    // Clear line error
    setLineErrors(prev => {
      const next = { ...prev };
      delete next[`${index}.${field}`];
      return next;
    });
  }, []);

  const addLine = useCallback(() => {
    setLines(prev => [...prev, emptyLine()]);
  }, []);

  const removeLine = useCallback((index: number) => {
    setLines(prev => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newLineErrors: Record<string, string> = {};

    if (!activeBranch?.branchId) {
      newErrors.branch = isRTL ? 'يجب اختيار فرع' : 'Branch is required';
    }
    if (!postingDate) {
      newErrors.postingDate = isRTL ? 'تاريخ الترحيل مطلوب' : 'Posting date is required';
    }
    if (!documentDate) {
      newErrors.documentDate = isRTL ? 'تاريخ المستند مطلوب' : 'Document date is required';
    }

    // Validate lines
    let hasLineError = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.accountId) {
        newLineErrors[`${i}.accountId`] = isRTL ? 'الحساب مطلوب' : 'Account is required';
        hasLineError = true;
      }
      const d = parseFloat(line.debit) || 0;
      const c = parseFloat(line.credit) || 0;
      if (d === 0 && c === 0) {
        newLineErrors[`${i}.amount`] = isRTL ? 'يجب إدخال مدين أو دائن' : 'Debit or credit is required';
        hasLineError = true;
      }
      if (d > 0 && c > 0) {
        newLineErrors[`${i}.amount`] = isRTL ? 'لا يمكن إدخال مدين ودائن معاً' : 'Cannot have both debit and credit';
        hasLineError = true;
      }
    }

    if (!isBalanced) {
      newErrors.balance = isRTL ? 'إجمالي المدين يجب أن يساوي إجمالي الدائن' : 'Total debit must equal total credit';
    }

    if (hasLineError || Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLineErrors(newLineErrors);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLineErrors({});
    setSubmitError('');

    if (!validate()) return;

    try {
      await createMutation.mutateAsync({
        branchId: activeBranch!.branchId,
        postingDate,
        documentDate,
        dueDate: dueDate || undefined,
        reference: reference || undefined,
        remarks: remarks || undefined,
        lines: lines.map(line => ({
          accountId: line.accountId,
          debit: parseFloat(line.debit) || 0,
          credit: parseFloat(line.credit) || 0,
          remarks: line.remarks || undefined,
        })),
      });
      showToast('success', isRTL ? 'تم إنشاء قيد اليومية بنجاح' : 'Journal entry created successfully');
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <StyledIcon icon={BookOpen} emoji="📖" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isRTL ? 'قيد يومية جديد' : 'New Journal Entry'}
          </h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Error Banner */}
      {submitError && (
        <div
          className="rounded-lg px-5 py-3 text-sm border"
          style={{
            backgroundColor: 'var(--badge-danger-bg)',
            borderColor: 'var(--badge-danger-border)',
            color: 'var(--color-text-danger)',
          }}
        >
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Card 1: Header */}
        <div
          className="rounded-lg border"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div
            className="px-5 py-3 border-b flex items-center gap-2 text-sm font-medium"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <StyledIcon icon={FileText} emoji="📄" className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            {isRTL ? 'بيانات القيد' : 'Entry Details'}
          </div>

          <div className="px-5 py-5 space-y-4">
            {/* Branch + Dates row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'الفرع' : 'Branch'}
                </Label>
                <Input
                  value={activeBranch?.branchName || (isRTL ? 'غير محدد' : 'Not selected')}
                  disabled
                  className="h-9"
                />
                {errors.branch && (
                  <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.branch}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Calendar} emoji="📅" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'تاريخ الترحيل' : 'Posting Date'} *
                </Label>
                <Input
                  type="date"
                  value={postingDate}
                  onChange={(e) => setPostingDate(e.target.value)}
                  className="h-9"
                  error={!!errors.postingDate}
                />
                {errors.postingDate && (
                  <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.postingDate}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Calendar} emoji="📆" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'تاريخ المستند' : 'Doc Date'} *
                </Label>
                <Input
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  className="h-9"
                  error={!!errors.documentDate}
                />
                {errors.documentDate && (
                  <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.documentDate}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Calendar} emoji="📆" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* Reference + Remarks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'المرجع' : 'Reference'}
                </Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={isRTL ? 'رقم مرجعي خارجي' : 'External reference number'}
                  className="h-9"
                  maxLength={255}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={FileText} emoji="📝" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'ملاحظات' : 'Remarks'}
                </Label>
                <Input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={isRTL ? 'وصف القيد' : 'Entry description'}
                  className="h-9"
                  maxLength={1000}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Lines */}
        <div
          className="rounded-lg border"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div
            className="px-5 py-3 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              <StyledIcon icon={BookOpen} emoji="📖" className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              {isRTL ? 'بنود القيد' : 'Entry Lines'}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                style={{ backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)', border: '1px solid' }}
              >
                {lines.length}
              </span>
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={addLine}>
              <Plus className="w-4 h-4 me-1" />
              {isRTL ? 'إضافة بند' : 'Add Line'}
            </Button>
          </div>

          <div className="px-5 py-4">
            {/* Lines table */}
            <div
              className="rounded-md border overflow-hidden text-sm"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                    <th className="px-3 py-2 text-start font-medium w-12" style={{ color: 'var(--color-text-secondary)' }}>#</th>
                    <th className="px-3 py-2 text-start font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'الحساب' : 'Account'} *
                    </th>
                    <th className="px-3 py-2 text-start font-medium w-44" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'مدين' : 'Debit'}
                    </th>
                    <th className="px-3 py-2 text-start font-medium w-44" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'دائن' : 'Credit'}
                    </th>
                    <th className="px-3 py-2 text-start font-medium w-56" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'ملاحظات' : 'Remarks'}
                    </th>
                    <th className="px-3 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr
                      key={idx}
                      style={{ borderTop: '1px solid var(--color-border)' }}
                    >
                      <td className="px-3 py-2 font-mono" style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                      <td className="px-3 py-2">
                        <AccountSelector
                          value={line.accountId || null}
                          onChange={(id) => updateLine(idx, 'accountId', id || '')}
                          onlyPostable
                          placeholder={isRTL ? 'اختر حساب...' : 'Select account...'}
                          placeholderAr="اختر حساب..."
                          error={lineErrors[`${idx}.accountId`]}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debit}
                          onChange={(e) => {
                            updateLine(idx, 'debit', e.target.value);
                            if (parseFloat(e.target.value) > 0) updateLine(idx, 'credit', '');
                          }}
                          placeholder="0.00"
                          className="h-8 font-mono text-sm"
                          error={!!lineErrors[`${idx}.amount`]}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.credit}
                          onChange={(e) => {
                            updateLine(idx, 'credit', e.target.value);
                            if (parseFloat(e.target.value) > 0) updateLine(idx, 'debit', '');
                          }}
                          placeholder="0.00"
                          className="h-8 font-mono text-sm"
                          error={!!lineErrors[`${idx}.amount`]}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={line.remarks}
                          onChange={(e) => updateLine(idx, 'remarks', e.target.value)}
                          placeholder={isRTL ? 'ملاحظة' : 'Note'}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          disabled={lines.length <= 2}
                          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-30"
                          style={{ color: 'var(--color-text-danger)' }}
                          onMouseEnter={(e) => { if (lines.length > 2) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          title={isRTL ? 'حذف البند' : 'Remove line'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Line-level errors */}
                  {Object.keys(lineErrors).length > 0 && (
                    <tr style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td colSpan={6} className="px-3 py-2">
                        <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>
                          {Object.values(lineErrors)[0]}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
                {/* Totals footer */}
                <tfoot>
                  <tr
                    style={{
                      borderTop: '2px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface-secondary)',
                    }}
                  >
                    <td colSpan={2} className="px-3 py-2.5 text-end font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'الإجمالي' : 'Total'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                        {formatAmount(totals.debit)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                        {formatAmount(totals.credit)}
                      </span>
                    </td>
                    <td colSpan={2} className="px-3 py-2.5">
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        {isBalanced ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--badge-success-text)' }} />
                            <span style={{ color: 'var(--badge-success-text)' }}>
                              {isRTL ? 'متوازن' : 'Balanced'}
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4" style={{ color: 'var(--color-text-danger)' }} />
                            <span style={{ color: 'var(--color-text-danger)' }}>
                              {isRTL ? 'غير متوازن' : 'Unbalanced'}
                            </span>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {errors.balance && (
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-danger)' }}>{errors.balance}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="rounded-lg border px-5 py-3 flex items-center justify-end gap-3"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <Button type="button" variant="ghost" onClick={() => navigate(listPath)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSaving || !isBalanced}>
            {isSaving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {isRTL ? 'إضافة' : 'Add'}
          </Button>
        </div>
      </form>
    </div>
  );
}
