/**
 * Journal Entry Detail Page — SAP B1 Style
 *
 * Route: /app/finance/journal-entries/:id
 * Same visual layout as CreateJournalEntryPage but with all fields disabled (read-only).
 * Actions: Reverse (if POSTED and not already reversed).
 * Uses shared document components: DocumentStatusBadge, DocumentReversalBanner, ReverseDocumentDialog.
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen, Calendar, FileText, Hash,
  RotateCcw, Loader2, CheckCircle2,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { DocumentStatusBadge, DocumentReversalBanner, ReverseDocumentDialog } from '@/components/document';
import { useDocumentReversal } from '@/hooks/useDocumentReversal';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScopePath } from '@/hooks/useScopePath';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/toast';
import { extractApiError } from '@/lib/apiError';
import { useJournalEntryDetail, useReverseJournalEntry } from '@/hooks/useJournalEntries';
import { AccountSelector } from '@/components/finance/AccountSelector';
import { getActiveBranch } from '@/hooks/useActiveBranch';

const SCREEN_CODE = 'JOURNAL_ENTRIES';

export default function JournalEntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { canModify } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();

  const { data: entry, isLoading, error } = useJournalEntryDetail(id);
  const reverseMutation = useReverseJournalEntry();
  const listPath = getPath('finance/journal-entries');

  const { showDialog, setShowDialog, canReverse } = useDocumentReversal({
    status: entry?.status,
    reversedById: entry?.reversedById,
    canModify,
  });

  const activeBranch = getActiveBranch();

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

  const formatAmount = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleReverse = async (reversalDate: string, remarks?: string) => {
    if (!entry || !id) return;
    try {
      await reverseMutation.mutateAsync({
        id,
        reversalDate,
        remarks,
        version: entry.version,
      });
      showToast('success', isRTL ? 'تم عكس القيد بنجاح' : 'Journal entry reversed successfully');
      setShowDialog(false);
    } catch (err) {
      const apiError = extractApiError(err);
      showToast('error', apiError.message);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <StyledIcon icon={BookOpen} emoji="📖" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isRTL ? 'تفاصيل القيد' : 'Entry Details'}
          </h1>
        </div>
        <div className="max-w-4xl"><TableSkeleton rows={6} columns={4} showHeader /></div>
      </div>
    );
  }

  // Error state
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

  const remarks = isRTL && entry.remarksAr ? entry.remarksAr : entry.remarks || '';

  return (
    <div className="space-y-4">
      {/* Header — same structure as Create + document code + status badges */}
      <div>
        <div className="flex items-center gap-3">
          <StyledIcon icon={BookOpen} emoji="📖" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {isRTL ? 'تفاصيل القيد' : 'Entry Details'}
              <span className="font-mono ms-2" style={{ color: 'var(--color-text-secondary)' }}>{entry.code}</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <DocumentStatusBadge status={entry.status} />
              <Badge
                className="border"
                style={{ backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' }}
              >
                {sourceTypeLabel}
              </Badge>
            </div>
          </div>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Reversal Banners — shared component */}
      <DocumentReversalBanner
        reversalOfId={entry.reversalOfId}
        reversedById={entry.reversedById}
        getDetailPath={(docId) => getPath(`finance/journal-entries/${docId}`)}
      />

      {/* Cards — same max-w-4xl as Create */}
      <div className="space-y-4 max-w-4xl">
        {/* Card 1: Entry Details — same layout as Create, all fields disabled */}
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
            {/* Document Code — visible on Detail only (hidden on Create per CLAUDE.md) */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {isRTL ? 'رقم القيد' : 'Entry Code'}
              </Label>
              <Input value={entry.code} disabled className="h-9 max-w-[300px] font-mono" />
            </div>

            {/* Branch — same as Create (disabled in both) */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {isRTL ? 'الفرع' : 'Branch'}
              </Label>
              <Input
                value={activeBranch?.branchName || (isRTL ? 'غير محدد' : 'Not selected')}
                disabled
                className="h-9 max-w-[300px]"
              />
            </div>

            {/* Dates row — grid-cols-3 — same as Create */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Calendar} emoji="📅" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'تاريخ الترحيل' : 'Posting Date'}
                </Label>
                <Input type="date" value={entry.postingDate} disabled className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Calendar} emoji="📆" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'تاريخ المستند' : 'Doc Date'}
                </Label>
                <Input type="date" value={entry.documentDate} disabled className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Calendar} emoji="📆" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}
                </Label>
                <Input type="date" value={entry.dueDate || ''} disabled className="h-9" />
              </div>
            </div>

            {/* Reference + Remarks row — grid-cols-2 — same as Create */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'المرجع' : 'Reference'}
                </Label>
                <Input value={entry.reference || ''} disabled className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={FileText} emoji="📝" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'ملاحظات' : 'Remarks'}
                </Label>
                <Input value={remarks} disabled className="h-9" />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Lines — same table as Create, no Add Line / Delete */}
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
                className="ms-1 px-1.5 py-0.5 rounded text-xs"
                style={{ backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)' }}
              >
                {entry.lines?.length || 0}
              </span>
            </span>
          </div>

          <div className="px-5 py-4">
            <div
              className="rounded-md border overflow-hidden text-sm"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                    <th className="px-3 py-2 text-start font-medium w-10" style={{ color: 'var(--color-text-secondary)' }}>#</th>
                    <th className="px-3 py-2 text-start font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'الحساب' : 'Account'}
                    </th>
                    <th className="px-3 py-2 text-start font-medium w-36" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'مدين' : 'Debit'}
                    </th>
                    <th className="px-3 py-2 text-start font-medium w-36" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'دائن' : 'Credit'}
                    </th>
                    <th className="px-3 py-2 text-start font-medium w-40" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'ملاحظات' : 'Remarks'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(entry.lines || []).map((line, idx) => (
                    <tr key={line.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td className="px-3 py-2 font-mono" style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                      <td className="px-3 py-2">
                        <AccountSelector
                          value={line.accountId || null}
                          onChange={() => {}}
                          onlyPostable
                          disabled
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={parseFloat(line.debit) > 0 ? line.debit : ''}
                          disabled
                          placeholder="0.00"
                          className="h-8 font-mono text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={parseFloat(line.credit) > 0 ? line.credit : ''}
                          disabled
                          placeholder="0.00"
                          className="h-8 font-mono text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={isRTL && line.remarksAr ? line.remarksAr : line.remarks || ''}
                          disabled
                          className="h-8 text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals footer — same as Create (always balanced — already posted) */}
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
                        {formatAmount(entry.totalDebit)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                        {formatAmount(entry.totalCredit)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--badge-success-text)' }} />
                        <span style={{ color: 'var(--badge-success-text)' }}>
                          {isRTL ? 'متوازن' : 'Balanced'}
                        </span>
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer — Back to List + Reverse (replaces Cancel + Save from Create) */}
        <div
          className="rounded-lg border px-5 py-3 flex items-center justify-end gap-3"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <Button type="button" variant="ghost" onClick={() => navigate(listPath)}>
            {isRTL ? 'العودة للقائمة' : 'Back to List'}
          </Button>
          {canReverse && (
            <Button
              onClick={() => setShowDialog(true)}
              disabled={reverseMutation.isPending}
              style={{ backgroundColor: 'var(--color-danger)', color: '#fff' }}
            >
              {reverseMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              <RotateCcw className="w-4 h-4 me-2" />
              {isRTL ? 'عكس القيد' : 'Reverse'}
            </Button>
          )}
        </div>
      </div>

      {/* Reverse Dialog — shared component */}
      <ReverseDocumentDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onConfirm={handleReverse}
        isReversing={reverseMutation.isPending}
        documentLabel={isRTL ? 'قيد اليومية' : 'Journal Entry'}
      />
    </div>
  );
}
