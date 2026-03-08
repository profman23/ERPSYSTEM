/**
 * Journal Entries List Page
 *
 * Route: /app/finance/journal-entries
 * Shows all journal entries with search, filters, pagination.
 * "New Entry" button → create page.
 * Click row → detail page.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BookOpen, Search, Filter, ChevronDown,
  Activity, Settings, Plus, Loader2, Eye, Calendar,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SimpleSelect } from '@/components/ui/select-advanced';
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
  useJournalEntriesList,
  type JournalEntry,
} from '@/hooks/useJournalEntries';

const SCREEN_CODE = 'JOURNAL_ENTRIES';

const STATUS_OPTIONS_EN = [
  { value: '', label: 'All Status' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'REVERSED', label: 'Reversed' },
];

const STATUS_OPTIONS_AR = [
  { value: '', label: 'جميع الحالات' },
  { value: 'POSTED', label: 'مرحّل' },
  { value: 'REVERSED', label: 'معكوس' },
];

const SOURCE_TYPE_OPTIONS_EN = [
  { value: '', label: 'All Sources' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'REVERSAL', label: 'Reversal' },
  { value: 'SALES_INVOICE', label: 'Sales Invoice' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'CREDIT_NOTE', label: 'Credit Note' },
];

const SOURCE_TYPE_OPTIONS_AR = [
  { value: '', label: 'جميع المصادر' },
  { value: 'MANUAL', label: 'يدوي' },
  { value: 'REVERSAL', label: 'عكس' },
  { value: 'SALES_INVOICE', label: 'فاتورة مبيعات' },
  { value: 'PURCHASE_ORDER', label: 'أمر شراء' },
  { value: 'PAYMENT', label: 'دفعة' },
  { value: 'CREDIT_NOTE', label: 'إشعار دائن' },
];

export default function JournalEntriesListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { canAccess, canModify, isLoading: permLoading } = useScreenPermission(SCREEN_CODE);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSourceType, setSelectedSourceType] = useState('');
  const [postingDateFrom, setPostingDateFrom] = useState('');
  const [postingDateTo, setPostingDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error } = useJournalEntriesList({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: (selectedStatus as 'POSTED' | 'REVERSED') || undefined,
    sourceType: selectedSourceType || undefined,
    postingDateFrom: postingDateFrom || undefined,
    postingDateTo: postingDateTo || undefined,
  });

  const entries = data?.data || [];
  const pagination = data?.pagination;

  const statusOptions = isRTL ? STATUS_OPTIONS_AR : STATUS_OPTIONS_EN;
  const sourceTypeOptions = isRTL ? SOURCE_TYPE_OPTIONS_AR : SOURCE_TYPE_OPTIONS_EN;
  const activeFilterCount = [selectedStatus, selectedSourceType, postingDateFrom, postingDateTo].filter(Boolean).length;

  const handleView = useCallback((row: JournalEntry) => {
    navigate(getPath(`finance/journal-entries/${row.id}`));
  }, [navigate, getPath]);

  const formatAmount = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString(isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const columns = useMemo<ColumnDef<JournalEntry, unknown>[]>(() => [
    {
      id: 'code',
      accessorKey: 'code',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={BookOpen} emoji="📖" className="w-3.5 h-3.5" />
          {isRTL ? 'الرمز' : 'Code'}
        </span>
      ),
      size: 140,
      minSize: 110,
      maxSize: 180,
      cell: ({ row }) => (
        <span className="font-mono">{row.original.code}</span>
      ),
    },
    {
      id: 'postingDate',
      accessorKey: 'postingDate',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Calendar} emoji="📅" className="w-3.5 h-3.5" />
          {isRTL ? 'تاريخ الترحيل' : 'Posting Date'}
        </span>
      ),
      size: 130,
      minSize: 110,
      maxSize: 170,
      cell: ({ row }) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>{row.original.postingDate}</span>
      ),
    },
    {
      id: 'documentDate',
      accessorKey: 'documentDate',
      header: () => (
        <span className="flex items-center gap-1.5">
          {isRTL ? 'تاريخ المستند' : 'Doc Date'}
        </span>
      ),
      size: 130,
      minSize: 110,
      maxSize: 170,
      cell: ({ row }) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>{row.original.documentDate}</span>
      ),
    },
    {
      id: 'remarks',
      accessorKey: 'remarks',
      header: () => (
        <span className="flex items-center gap-1.5">
          {isRTL ? 'ملاحظات' : 'Remarks'}
        </span>
      ),
      size: 200,
      minSize: 140,
      maxSize: 350,
      cell: ({ row }) => {
        const text = isRTL && row.original.remarksAr ? row.original.remarksAr : row.original.remarks;
        return (
          <span className="truncate block" style={{ color: text ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
            {text || (isRTL ? 'بدون ملاحظات' : 'No remarks')}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Activity} emoji="📈" className="w-3.5 h-3.5" />
          {t('common.status')}
        </span>
      ),
      size: 110,
      minSize: 90,
      maxSize: 140,
      cell: ({ row }) => {
        const isPosted = row.original.status === 'POSTED';
        return (
          <Badge
            className="border"
            style={isPosted
              ? { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' }
              : { backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' }
            }
          >
            {isPosted
              ? (isRTL ? 'مرحّل' : 'Posted')
              : (isRTL ? 'معكوس' : 'Reversed')
            }
          </Badge>
        );
      },
    },
    {
      id: 'totalDebit',
      accessorKey: 'totalDebit',
      header: () => (
        <span className="flex items-center gap-1.5">
          {isRTL ? 'إجمالي المدين' : 'Total Debit'}
        </span>
      ),
      size: 130,
      minSize: 100,
      maxSize: 170,
      cell: ({ row }) => (
        <span className="font-mono">{formatAmount(row.original.totalDebit)}</span>
      ),
    },
    {
      id: 'totalCredit',
      accessorKey: 'totalCredit',
      header: () => (
        <span className="flex items-center gap-1.5">
          {isRTL ? 'إجمالي الدائن' : 'Total Credit'}
        </span>
      ),
      size: 130,
      minSize: 100,
      maxSize: 170,
      cell: ({ row }) => (
        <span className="font-mono">{formatAmount(row.original.totalCredit)}</span>
      ),
    },
    {
      id: 'sourceType',
      accessorKey: 'sourceType',
      header: () => (
        <span className="flex items-center gap-1.5">
          {isRTL ? 'المصدر' : 'Source'}
        </span>
      ),
      size: 110,
      minSize: 90,
      maxSize: 150,
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
    {
      id: 'actions',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Settings} emoji="⚙️" className="w-3.5 h-3.5" />
          {t('common.actions')}
        </span>
      ),
      size: 70,
      minSize: 60,
      maxSize: 90,
      enableResizing: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleView(row.original); }}
            className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
            title={isRTL ? 'عرض' : 'View'}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], [t, isRTL, handleView]);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StyledIcon icon={BookOpen} emoji="📖" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {isRTL ? 'قيود اليومية' : 'Journal Entries'}
            </h1>
          </div>
          {canModify && (
            <Button onClick={() => navigate(getPath('finance/journal-entries/create'))}>
              <Plus className="w-4 h-4 me-2" />
              {isRTL ? 'قيد جديد' : 'New Entry'}
            </Button>
          )}
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Search + Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                <Input
                  placeholder={isRTL ? 'بحث في قيود اليومية...' : 'Search journal entries...'}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
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
                <span className="hidden sm:inline">{t('common.filters')}</span>
                {activeFilterCount > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: 'var(--badge-info-bg)', color: 'var(--badge-info-text)' }}
                  >
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {filtersOpen && (
              <div className="animate-in slide-in-from-top-1 duration-200">
                <div className="flex gap-4 flex-wrap">
                  <div className="w-48">
                    <SimpleSelect
                      value={selectedStatus}
                      onValueChange={(v: string) => { setSelectedStatus(v); setPage(1); }}
                      options={statusOptions}
                      placeholder={isRTL ? 'الحالة' : 'Status'}
                    />
                  </div>
                  <div className="w-48">
                    <SimpleSelect
                      value={selectedSourceType}
                      onValueChange={(v: string) => { setSelectedSourceType(v); setPage(1); }}
                      options={sourceTypeOptions}
                      placeholder={isRTL ? 'المصدر' : 'Source Type'}
                    />
                  </div>
                  <div className="w-44">
                    <Input
                      type="date"
                      value={postingDateFrom}
                      onChange={(e) => { setPostingDateFrom(e.target.value); setPage(1); }}
                      placeholder={isRTL ? 'من تاريخ' : 'From date'}
                      className="h-10"
                    />
                  </div>
                  <div className="w-44">
                    <Input
                      type="date"
                      value={postingDateTo}
                      onChange={(e) => { setPostingDateTo(e.target.value); setPage(1); }}
                      placeholder={isRTL ? 'إلى تاريخ' : 'To date'}
                      className="h-10"
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
            <TableSkeleton rows={5} columns={8} showHeader />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title={isRTL ? 'خطأ في تحميل قيود اليومية' : 'Error loading journal entries'}
              message={(error as Error)?.message || (isRTL ? 'فشل التحميل' : 'Failed to load')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={BookOpen}
              title={searchQuery || selectedStatus || selectedSourceType || postingDateFrom || postingDateTo
                ? (isRTL ? 'لا توجد نتائج مطابقة' : 'No matching entries')
                : (isRTL ? 'لا توجد قيود يومية' : 'No journal entries found')}
              description={searchQuery || selectedStatus || selectedSourceType || postingDateFrom || postingDateTo
                ? (isRTL ? 'جرب تعديل البحث أو الفلاتر' : 'Try adjusting your search or filters')
                : (isRTL ? 'أنشئ قيد يومية جديد للبدء' : 'Create a new journal entry to get started')}
            />
          </div>
        ) : (
          <>
            <AdvancedDataTable<JournalEntry>
              tableId="journal-entries-list-table"
              data={entries}
              columns={columns}
              autoHeight={true}
              minHeight={300}
              rowHeight={48}
              enableColumnResize={true}
              enableColumnReorder={true}
              enableSorting={false}
              onRowClick={handleView}
              emptyMessage={isRTL ? 'لا توجد قيود يومية' : 'No journal entries found'}
            />

            {pagination && pagination.totalPages > 0 && (
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
