/**
 * Trial Balance Page
 *
 * Route: /app/finance/trial-balance
 * Displays period-based account balance summary from account_balances table.
 * Filters: Fiscal Year, Period From/To, Branch (optional).
 * Click row → Account Ledger drill-down.
 */

import { useState, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Scale, Loader2, Filter, ChevronDown, Hash, FileText, Layers, DollarSign,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { AdvancedDataTable } from '@/components/ui/AdvancedDataTable';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { useScopePath } from '@/hooks/useScopePath';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useTrialBalance,
  type TrialBalanceAccount,
} from '@/hooks/useGLReports';

const SCREEN_CODE = 'TRIAL_BALANCE';

const PERIOD_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

function getYearOptions(): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear();
  const options: { value: string; label: string }[] = [];
  for (let y = currentYear + 1; y >= currentYear - 5; y--) {
    options.push({ value: String(y), label: String(y) });
  }
  return options;
}

export default function TrialBalancePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { canAccess, isLoading: permLoading } = useScreenPermission(SCREEN_CODE);

  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const [periodFrom, setPeriodFrom] = useState(1);
  const [periodTo, setPeriodTo] = useState(12);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const yearOptions = useMemo(() => getYearOptions(), []);

  const { data, isLoading, error } = useTrialBalance({
    fiscalYear,
    periodFrom,
    periodTo,
  });

  const accounts = data?.accounts || [];
  const totals = data?.totals;

  const formatAmount = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleRowClick = (row: TrialBalanceAccount) => {
    const dateFrom = `${fiscalYear}-${String(periodFrom).padStart(2, '0')}-01`;
    const lastDay = new Date(fiscalYear, periodTo, 0).getDate();
    const dateTo = `${fiscalYear}-${String(periodTo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    navigate({
      pathname: getPath('finance/account-ledger'),
      search: `?accountId=${row.accountId}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
    });
  };

  const accountTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      ASSET: { en: 'Asset', ar: 'أصول' },
      LIABILITY: { en: 'Liability', ar: 'التزامات' },
      EQUITY: { en: 'Equity', ar: 'حقوق ملكية' },
      REVENUE: { en: 'Revenue', ar: 'إيرادات' },
      EXPENSE: { en: 'Expense', ar: 'مصروفات' },
    };
    const l = labels[type];
    return l ? (isRTL ? l.ar : l.en) : type;
  };

  const columns = useMemo<ColumnDef<TrialBalanceAccount, unknown>[]>(() => [
    {
      id: 'code',
      accessorKey: 'code',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" />
          {isRTL ? 'الرمز' : 'Code'}
        </span>
      ),
      size: 120,
      minSize: 90,
      maxSize: 160,
      cell: ({ row }) => (
        <span className="font-mono">{row.original.code}</span>
      ),
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={FileText} emoji="📄" className="w-3.5 h-3.5" />
          {isRTL ? 'اسم الحساب' : 'Account Name'}
        </span>
      ),
      size: 250,
      minSize: 160,
      maxSize: 400,
      cell: ({ row }) => (
        <span>{isRTL && row.original.nameAr ? row.original.nameAr : row.original.name}</span>
      ),
    },
    {
      id: 'accountType',
      accessorKey: 'accountType',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Layers} emoji="📚" className="w-3.5 h-3.5" />
          {isRTL ? 'النوع' : 'Type'}
        </span>
      ),
      size: 110,
      minSize: 80,
      maxSize: 150,
      cell: ({ row }) => (
        <Badge
          className="border"
          style={{ backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' }}
        >
          {accountTypeLabel(row.original.accountType)}
        </Badge>
      ),
    },
    {
      id: 'totalDebit',
      accessorKey: 'totalDebit',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={DollarSign} emoji="💲" className="w-3.5 h-3.5" />
          {isRTL ? 'مدين' : 'Debit'}
        </span>
      ),
      size: 150,
      minSize: 110,
      maxSize: 200,
      cell: ({ row }) => (
        <span className="font-mono">{formatAmount(row.original.totalDebit)}</span>
      ),
    },
    {
      id: 'totalCredit',
      accessorKey: 'totalCredit',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={DollarSign} emoji="💲" className="w-3.5 h-3.5" />
          {isRTL ? 'دائن' : 'Credit'}
        </span>
      ),
      size: 150,
      minSize: 110,
      maxSize: 200,
      cell: ({ row }) => (
        <span className="font-mono">{formatAmount(row.original.totalCredit)}</span>
      ),
    },
    {
      id: 'netBalance',
      accessorKey: 'netBalance',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Scale} emoji="⚖️" className="w-3.5 h-3.5" />
          {isRTL ? 'صافي الرصيد' : 'Net Balance'}
        </span>
      ),
      size: 150,
      minSize: 110,
      maxSize: 200,
      cell: ({ row }) => {
        const num = parseFloat(row.original.netBalance);
        const color = num < 0 ? 'var(--color-text-danger)' : 'var(--color-text)';
        return (
          <span className="font-mono" style={{ color }}>{formatAmount(row.original.netBalance)}</span>
        );
      },
    },
  ], [isRTL]);

  if (permLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canAccess) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <StyledIcon icon={Scale} emoji="⚖️" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isRTL ? 'ميزان المراجعة' : 'Trial Balance'}
          </h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="inline-flex items-center gap-2 px-3 h-10 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: filtersOpen ? 'var(--color-accent-light)' : 'var(--color-surface)',
                  borderColor: filtersOpen ? 'var(--color-accent)' : 'var(--color-border)',
                  color: filtersOpen ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
              >
                <Filter className="w-4 h-4" />
                <span>{t('common.filters')}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {filtersOpen && (
              <div className="animate-in slide-in-from-top-1 duration-200">
                <div className="flex gap-4 flex-wrap">
                  <div className="w-36">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                      {isRTL ? 'السنة المالية' : 'Fiscal Year'}
                    </label>
                    <SimpleSelect
                      value={String(fiscalYear)}
                      onValueChange={(v: string) => setFiscalYear(Number(v))}
                      options={yearOptions}
                      placeholder={isRTL ? 'السنة' : 'Year'}
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                      {isRTL ? 'من فترة' : 'Period From'}
                    </label>
                    <SimpleSelect
                      value={String(periodFrom)}
                      onValueChange={(v: string) => setPeriodFrom(Number(v))}
                      options={PERIOD_OPTIONS}
                      placeholder="1"
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                      {isRTL ? 'إلى فترة' : 'Period To'}
                    </label>
                    <SimpleSelect
                      value={String(periodTo)}
                      onValueChange={(v: string) => setPeriodTo(Number(v))}
                      options={PERIOD_OPTIONS}
                      placeholder="12"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={8} columns={6} showHeader />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title={isRTL ? 'خطأ في تحميل ميزان المراجعة' : 'Error loading trial balance'}
              message={(error as Error)?.message || (isRTL ? 'فشل التحميل' : 'Failed to load')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Scale}
              title={isRTL ? 'لا توجد أرصدة' : 'No balances found'}
              description={isRTL ? 'لا توجد حركات مالية في هذه الفترة' : 'No financial activity in this period'}
            />
          </div>
        ) : (
          <>
            <AdvancedDataTable<TrialBalanceAccount>
              tableId="trial-balance-table"
              data={accounts}
              columns={columns}
              autoHeight={true}
              minHeight={300}
              rowHeight={48}
              enableColumnResize={true}
              enableColumnReorder={true}
              enableSorting={false}
              onRowClick={handleRowClick}
              emptyMessage={isRTL ? 'لا توجد أرصدة' : 'No balances found'}
            />

            {/* Totals Footer */}
            {totals && (
              <div
                className="px-4 py-3 border-t flex items-center justify-between"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-secondary)' }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {isRTL ? 'الإجمالي' : 'Totals'}
                </span>
                <div className="flex items-center gap-8">
                  <div className="text-sm">
                    <span style={{ color: 'var(--color-text-muted)' }}>{isRTL ? 'مدين: ' : 'Debit: '}</span>
                    <span className="font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                      {formatAmount(totals.totalDebit)}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span style={{ color: 'var(--color-text-muted)' }}>{isRTL ? 'دائن: ' : 'Credit: '}</span>
                    <span className="font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                      {formatAmount(totals.totalCredit)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
