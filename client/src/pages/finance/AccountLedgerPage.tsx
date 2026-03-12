/**
 * Account Ledger Page
 *
 * Route: /app/finance/account-ledger?accountId=...&dateFrom=...&dateTo=...
 * Displays detailed transaction history for a single account.
 * Running balance computed server-side.
 */

import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BookText, Loader2, Filter, ChevronDown, ArrowLeft,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdvancedDataTable } from '@/components/ui/AdvancedDataTable';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/Pagination';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { useScopePath } from '@/hooks/useScopePath';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useAccountLedger,
  type AccountLedgerEntry,
} from '@/hooks/useGLReports';

const SCREEN_CODE = 'ACCOUNT_LEDGER';

export default function AccountLedgerPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { canAccess, isLoading: permLoading } = useScreenPermission(SCREEN_CODE);
  const [searchParams, setSearchParams] = useSearchParams();

  const accountId = searchParams.get('accountId') || '';
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const { data, isLoading, error } = useAccountLedger({
    accountId,
    dateFrom,
    dateTo,
    page,
    limit: pageSize,
  });

  const entries = data?.entries || [];
  const pagination = data?.pagination;
  const account = data?.account;
  const summary = data?.summary;

  const formatAmount = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleJEClick = (row: AccountLedgerEntry) => {
    navigate(getPath(`finance/journal-entries/${row.jeId}`));
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

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (accountId) params.set('accountId', accountId);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    setSearchParams(params);
    setPage(1);
  };

  const columns = useMemo<ColumnDef<AccountLedgerEntry, unknown>[]>(() => [
    {
      id: 'date',
      accessorKey: 'date',
      header: () => isRTL ? 'التاريخ' : 'Date',
      size: 120,
      minSize: 100,
      maxSize: 150,
      cell: ({ row }) => (
        <span style={{ color: 'var(--color-text-muted)' }}>{row.original.date}</span>
      ),
    },
    {
      id: 'jeCode',
      accessorKey: 'jeCode',
      header: () => isRTL ? 'رقم القيد' : 'JE Code',
      size: 140,
      minSize: 110,
      maxSize: 180,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleJEClick(row.original); }}
          className="font-mono underline transition-colors"
          style={{ color: 'var(--color-accent)' }}
        >
          {row.original.jeCode}
        </button>
      ),
    },
    {
      id: 'remarks',
      header: () => isRTL ? 'ملاحظات' : 'Remarks',
      size: 220,
      minSize: 140,
      maxSize: 350,
      cell: ({ row }) => {
        const text = row.original.remarks;
        const lineText = row.original.lineRemarks;
        const displayText = lineText || text;
        return (
          <span className="truncate block" style={{ color: displayText ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
            {displayText || '-'}
          </span>
        );
      },
    },
    {
      id: 'debit',
      accessorKey: 'debit',
      header: () => isRTL ? 'مدين' : 'Debit',
      size: 140,
      minSize: 100,
      maxSize: 180,
      cell: ({ row }) => {
        const num = parseFloat(row.original.debit);
        return (
          <span className="font-mono" style={{ color: num > 0 ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
            {num > 0 ? formatAmount(row.original.debit) : '-'}
          </span>
        );
      },
    },
    {
      id: 'credit',
      accessorKey: 'credit',
      header: () => isRTL ? 'دائن' : 'Credit',
      size: 140,
      minSize: 100,
      maxSize: 180,
      cell: ({ row }) => {
        const num = parseFloat(row.original.credit);
        return (
          <span className="font-mono" style={{ color: num > 0 ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
            {num > 0 ? formatAmount(row.original.credit) : '-'}
          </span>
        );
      },
    },
    {
      id: 'runningBalance',
      accessorKey: 'runningBalance',
      header: () => isRTL ? 'الرصيد' : 'Balance',
      size: 150,
      minSize: 110,
      maxSize: 200,
      cell: ({ row }) => {
        const num = parseFloat(row.original.runningBalance);
        const color = num < 0 ? 'var(--color-text-danger)' : 'var(--color-text)';
        return (
          <span className="font-mono" style={{ color }}>{formatAmount(row.original.runningBalance)}</span>
        );
      },
    },
    {
      id: 'sourceType',
      accessorKey: 'sourceType',
      header: () => isRTL ? 'المصدر' : 'Source',
      size: 100,
      minSize: 80,
      maxSize: 130,
      cell: ({ row }) => {
        const st = row.original.sourceType;
        const label = st === 'MANUAL' ? (isRTL ? 'يدوي' : 'Manual')
          : st === 'REVERSAL' ? (isRTL ? 'عكس' : 'Reversal')
          : st;
        return (
          <Badge
            className="border"
            style={{ backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' }}
          >
            {label}
          </Badge>
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

  if (!accountId) {
    return <Navigate to={getPath('finance/trial-balance')} replace />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(getPath('finance/trial-balance'))}
            className="p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <StyledIcon icon={BookText} emoji="📒" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isRTL ? 'دفتر الأستاذ' : 'Account Ledger'}
          </h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Account Info Card */}
      {account && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{isRTL ? 'الرمز' : 'Code'}</span>
                <div className="font-mono text-sm" style={{ color: 'var(--color-text)' }}>{account.code}</div>
              </div>
              <div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{isRTL ? 'الاسم' : 'Name'}</span>
                <div className="text-sm" style={{ color: 'var(--color-text)' }}>
                  {isRTL && account.nameAr ? account.nameAr : account.name}
                </div>
              </div>
              <div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{isRTL ? 'النوع' : 'Type'}</span>
                <div>
                  <Badge
                    className="border"
                    style={{ backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' }}
                  >
                    {accountTypeLabel(account.accountType)}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{isRTL ? 'الطبيعة' : 'Normal Balance'}</span>
                <div className="text-sm" style={{ color: 'var(--color-text)' }}>
                  {account.normalBalance === 'DEBIT' ? (isRTL ? 'مدين' : 'Debit') : (isRTL ? 'دائن' : 'Credit')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <div className="flex gap-4 flex-wrap items-end">
                  <div className="w-44">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                      {isRTL ? 'من تاريخ' : 'Date From'}
                    </label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="w-44">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                      {isRTL ? 'إلى تاريخ' : 'Date To'}
                    </label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <Button size="sm" onClick={handleApplyFilters}>
                    {isRTL ? 'تطبيق' : 'Apply'}
                  </Button>
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
            <TableSkeleton rows={8} columns={7} showHeader />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title={isRTL ? 'خطأ في تحميل دفتر الأستاذ' : 'Error loading account ledger'}
              message={(error as Error)?.message || (isRTL ? 'فشل التحميل' : 'Failed to load')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={BookText}
              title={isRTL ? 'لا توجد حركات' : 'No transactions found'}
              description={isRTL ? 'لا توجد حركات لهذا الحساب في الفترة المحددة' : 'No transactions for this account in the selected period'}
            />
          </div>
        ) : (
          <>
            <AdvancedDataTable<AccountLedgerEntry>
              tableId="account-ledger-table"
              data={entries}
              columns={columns}
              autoHeight={true}
              minHeight={300}
              rowHeight={48}
              enableColumnResize={true}
              enableColumnReorder={true}
              enableSorting={false}
              onRowClick={handleJEClick}
              emptyMessage={isRTL ? 'لا توجد حركات' : 'No transactions found'}
            />

            {/* Summary Footer */}
            {summary && (
              <div
                className="px-4 py-3 border-t flex items-center justify-between"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-secondary)' }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {isRTL ? 'الإجمالي' : 'Summary'}
                </span>
                <div className="flex items-center gap-8">
                  <div className="text-sm">
                    <span style={{ color: 'var(--color-text-muted)' }}>{isRTL ? 'مدين: ' : 'Debit: '}</span>
                    <span className="font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                      {formatAmount(summary.totalDebit)}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span style={{ color: 'var(--color-text-muted)' }}>{isRTL ? 'دائن: ' : 'Credit: '}</span>
                    <span className="font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                      {formatAmount(summary.totalCredit)}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span style={{ color: 'var(--color-text-muted)' }}>{isRTL ? 'الرصيد: ' : 'Balance: '}</span>
                    <span className="font-mono font-medium" style={{
                      color: parseFloat(summary.closingBalance) < 0 ? 'var(--color-text-danger)' : 'var(--color-text)',
                    }}>
                      {formatAmount(summary.closingBalance)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                  showPageSize
                  showTotal
                  totalItems={pagination.total}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
