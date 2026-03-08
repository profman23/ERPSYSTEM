/**
 * Journal Entry Detail Page
 *
 * Route: /app/finance/journal-entries/:id
 * Read-only view of a journal entry header + lines.
 * Actions: Reverse (if POSTED and not already reversed).
 * Links: reversal → original, original → reversal.
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, Calendar, FileText, Hash,
  ArrowLeft, RotateCcw, Loader2, AlertCircle, ExternalLink,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScopePath } from '@/hooks/useScopePath';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/toast';
import { extractApiError } from '@/lib/apiError';
import {
  useJournalEntryDetail,
  useReverseJournalEntry,
} from '@/hooks/useJournalEntries';

const SCREEN_CODE = 'JOURNAL_ENTRIES';

export default function JournalEntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { canModify } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();

  const { data: entry, isLoading, error } = useJournalEntryDetail(id);
  const reverseMutation = useReverseJournalEntry();

  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [reversalDate, setReversalDate] = useState(new Date().toISOString().slice(0, 10));
  const [reversalRemarks, setReversalRemarks] = useState('');

  const listPath = getPath('finance/journal-entries');

  const canReverse = entry && entry.status === 'POSTED' && !entry.reversedById && canModify;
  const isReversing = reverseMutation.isPending;

  const formatAmount = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const sourceTypeLabel = useMemo(() => {
    if (!entry) return '';
    const map: Record<string, [string, string]> = {
      MANUAL: ['Manual', 'يدوي'],
      REVERSAL: ['Reversal', 'عكس'],
      SALES_INVOICE: ['Sales Invoice', 'فاتورة مبيعات'],
      PURCHASE_ORDER: ['Purchase Order', 'أمر شراء'],
      PAYMENT: ['Payment', 'دفعة'],
      CREDIT_NOTE: ['Credit Note', 'إشعار دائن'],
    };
    const pair = map[entry.sourceType];
    return pair ? (isRTL ? pair[1] : pair[0]) : entry.sourceType;
  }, [entry, isRTL]);

  const handleReverse = async () => {
    if (!entry || !id) return;
    try {
      await reverseMutation.mutateAsync({
        id,
        reversalDate,
        remarks: reversalRemarks || undefined,
        version: entry.version,
      });
      showToast('success', isRTL ? 'تم عكس القيد بنجاح' : 'Journal entry reversed successfully');
      setShowReverseDialog(false);
    } catch (err) {
      const apiError = extractApiError(err);
      showToast('error', apiError.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <StyledIcon icon={BookOpen} emoji="📖" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isRTL ? 'تفاصيل القيد' : 'Entry Details'}
          </h1>
        </div>
        <div className="p-6">
          <TableSkeleton rows={6} columns={4} showHeader />
        </div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="p-6">
        <ErrorState
          title={isRTL ? 'خطأ في تحميل القيد' : 'Error loading journal entry'}
          message={(error as Error)?.message || (isRTL ? 'القيد غير موجود' : 'Entry not found')}
          retryAction={() => window.location.reload()}
          variant="page"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(listPath)}
              className="me-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <StyledIcon icon={BookOpen} emoji="📖" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
                <span className="font-mono">{entry.code}</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  className="border"
                  style={entry.status === 'POSTED'
                    ? { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' }
                    : { backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' }
                  }
                >
                  {entry.status === 'POSTED' ? (isRTL ? 'مرحّل' : 'Posted') : (isRTL ? 'معكوس' : 'Reversed')}
                </Badge>
                <Badge
                  className="border"
                  style={{ backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' }}
                >
                  {sourceTypeLabel}
                </Badge>
              </div>
            </div>
          </div>
          {canReverse && (
            <Button
              variant="outline"
              onClick={() => setShowReverseDialog(true)}
              disabled={isReversing}
            >
              <RotateCcw className="w-4 h-4 me-2" />
              {isRTL ? 'عكس القيد' : 'Reverse'}
            </Button>
          )}
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Reversal links */}
      {entry.reversalOfId && (
        <div
          className="rounded-lg px-4 py-3 text-sm border flex items-center gap-2 max-w-4xl"
          style={{ backgroundColor: 'var(--badge-info-bg)', borderColor: 'var(--badge-info-border)', color: 'var(--badge-info-text)' }}
        >
          <RotateCcw className="w-4 h-4" />
          {isRTL ? 'هذا القيد عكس لـ: ' : 'Reversal of: '}
          <Link
            to={getPath(`finance/journal-entries/${entry.reversalOfId}`)}
            className="font-mono underline flex items-center gap-1"
          >
            {isRTL ? 'عرض القيد الأصلي' : 'View original entry'}
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
      {entry.reversedById && (
        <div
          className="rounded-lg px-4 py-3 text-sm border flex items-center gap-2 max-w-4xl"
          style={{ backgroundColor: 'var(--badge-warning-bg)', borderColor: 'var(--badge-warning-border)', color: 'var(--badge-warning-text)' }}
        >
          <AlertCircle className="w-4 h-4" />
          {isRTL ? 'تم عكس هذا القيد بواسطة: ' : 'Reversed by: '}
          <Link
            to={getPath(`finance/journal-entries/${entry.reversedById}`)}
            className="font-mono underline flex items-center gap-1"
          >
            {isRTL ? 'عرض قيد العكس' : 'View reversal entry'}
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Info Card */}
      <div
        className="rounded-lg border max-w-4xl"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="px-5 py-3 border-b flex items-center gap-2 text-sm font-medium"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        >
          <StyledIcon icon={FileText} emoji="📄" className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          {isRTL ? 'بيانات القيد' : 'Entry Details'}
        </div>

        <div className="px-5 py-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <DetailRow label={isRTL ? 'تاريخ الترحيل' : 'Posting Date'} value={entry.postingDate} icon={Calendar} mono />
            <DetailRow label={isRTL ? 'تاريخ المستند' : 'Doc Date'} value={entry.documentDate} icon={Calendar} mono />
            <DetailRow label={isRTL ? 'تاريخ الاستحقاق' : 'Due Date'} value={entry.dueDate || (isRTL ? 'غير محدد' : 'N/A')} icon={Calendar} mono />
            <DetailRow label={isRTL ? 'المرجع' : 'Reference'} value={entry.reference || (isRTL ? 'بدون مرجع' : 'None')} icon={Hash} />
            <DetailRow
              label={isRTL ? 'ملاحظات' : 'Remarks'}
              value={isRTL && entry.remarksAr ? entry.remarksAr : entry.remarks || (isRTL ? 'بدون ملاحظات' : 'None')}
              icon={FileText}
              span2
            />
          </div>
        </div>
      </div>

      {/* Lines Card */}
      <div
        className="rounded-lg border max-w-4xl"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="px-5 py-3 border-b flex items-center gap-2 text-sm font-medium"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        >
          <StyledIcon icon={BookOpen} emoji="📖" className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          {isRTL ? 'بنود القيد' : 'Entry Lines'}
          <span className="ms-2 px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)' }}>
            {entry.lines?.length || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                <th className="px-4 py-2.5 text-start font-medium w-12" style={{ color: 'var(--color-text-secondary)' }}>#</th>
                <th className="px-4 py-2.5 text-start font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? 'رمز الحساب' : 'Account Code'}
                </th>
                <th className="px-4 py-2.5 text-start font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? 'اسم الحساب' : 'Account Name'}
                </th>
                <th className="px-4 py-2.5 text-start font-medium w-36" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? 'مدين' : 'Debit'}
                </th>
                <th className="px-4 py-2.5 text-start font-medium w-36" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? 'دائن' : 'Credit'}
                </th>
                <th className="px-4 py-2.5 text-start font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? 'ملاحظات' : 'Remarks'}
                </th>
              </tr>
            </thead>
            <tbody>
              {(entry.lines || []).map((line) => (
                <tr key={line.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--color-text-muted)' }}>{line.lineNumber}</td>
                  <td className="px-4 py-2.5 font-mono">{line.accountCode || '-'}</td>
                  <td className="px-4 py-2.5">{isRTL && line.accountNameAr ? line.accountNameAr : line.accountName || '-'}</td>
                  <td className="px-4 py-2.5 font-mono">
                    {parseFloat(line.debit) > 0 ? formatAmount(line.debit) : ''}
                  </td>
                  <td className="px-4 py-2.5 font-mono">
                    {parseFloat(line.credit) > 0 ? formatAmount(line.credit) : ''}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {isRTL && line.remarksAr ? line.remarksAr : line.remarks || ''}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr
                style={{
                  borderTop: '2px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface-secondary)',
                }}
              >
                <td colSpan={3} className="px-4 py-2.5 text-end font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? 'الإجمالي' : 'Total'}
                </td>
                <td className="px-4 py-2.5 font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                  {formatAmount(entry.totalDebit)}
                </td>
                <td className="px-4 py-2.5 font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                  {formatAmount(entry.totalCredit)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Reverse Dialog */}
      {showReverseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 modal-overlay" onClick={() => setShowReverseDialog(false)} />
          <div
            className="relative z-50 w-full max-w-md rounded-lg border shadow-lg p-6 space-y-4"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <RotateCcw className="w-5 h-5" style={{ color: 'var(--color-text-danger)' }} />
              {isRTL ? 'عكس القيد' : 'Reverse Journal Entry'}
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL
                ? 'سيتم إنشاء قيد عكسي جديد بقيم معكوسة وسيتم تغيير حالة القيد الأصلي إلى "معكوس".'
                : 'A new reversal entry will be created with swapped debit/credit values. The original entry will be marked as Reversed.'}
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  <Calendar className="w-3.5 h-3.5" />
                  {isRTL ? 'تاريخ العكس' : 'Reversal Date'} *
                </label>
                <input
                  type="date"
                  value={reversalDate}
                  onChange={(e) => setReversalDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--input-border)',
                    color: 'var(--input-text)',
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  <FileText className="w-3.5 h-3.5" />
                  {isRTL ? 'ملاحظات' : 'Remarks'}
                </label>
                <input
                  type="text"
                  value={reversalRemarks}
                  onChange={(e) => setReversalRemarks(e.target.value)}
                  placeholder={isRTL ? 'سبب العكس (اختياري)' : 'Reason for reversal (optional)'}
                  className="flex h-9 w-full rounded-md border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--input-border)',
                    color: 'var(--input-text)',
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowReverseDialog(false)} disabled={isReversing}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleReverse}
                disabled={isReversing || !reversalDate}
                style={{ backgroundColor: 'var(--color-danger)', color: '#fff' }}
              >
                {isReversing && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {isRTL ? 'تأكيد العكس' : 'Confirm Reverse'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for detail rows
function DetailRow({
  label,
  value,
  icon: Icon,
  mono,
  span2,
}: {
  label: string;
  value: string;
  icon: typeof Calendar;
  mono?: boolean;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? 'md:col-span-2' : ''}>
      <p className="text-xs flex items-center gap-1.5 mb-1" style={{ color: 'var(--color-text-muted)' }}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </p>
      <p className={mono ? 'font-mono' : ''} style={{ color: 'var(--color-text)' }}>
        {value}
      </p>
    </div>
  );
}
