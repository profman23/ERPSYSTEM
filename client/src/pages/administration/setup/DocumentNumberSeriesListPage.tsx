/**
 * Document Number Series List Page
 *
 * Route: /app/administration/setup/document-number-series
 * AdvancedDataTable with search, collapsible filters (branch, document type, status).
 * No "Create" button — series are auto-seeded on branch creation.
 * Follows TaxCodesListPage pattern.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Pencil, Hash, Search, Filter, ChevronDown,
  Activity, Settings, FileText, MapPin, Loader2,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { useAllBranchesNoFilter } from '@/hooks/useHierarchy';
import {
  useDocumentNumberSeriesList,
  type DocumentNumberSeries,
} from '@/hooks/useDocumentNumberSeries';

const SCREEN_CODE = 'DOCUMENT_NUMBER_SERIES';

const DOC_TYPE_OPTIONS_EN = [
  { value: '', label: 'All Types' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { value: 'GOODS_RECEIPT_PO', label: 'Goods Receipt PO' },
  { value: 'SALES_INVOICE', label: 'Sales Invoice' },
  { value: 'CREDIT_NOTE', label: 'Credit Note' },
  { value: 'DELIVERY_NOTE', label: 'Delivery Note' },
  { value: 'PAYMENT_RECEIPT', label: 'Payment Receipt' },
  { value: 'JOURNAL_ENTRY', label: 'Journal Entry' },
];

const DOC_TYPE_OPTIONS_AR = [
  { value: '', label: 'جميع الأنواع' },
  { value: 'PURCHASE_ORDER', label: 'طلب شراء' },
  { value: 'GOODS_RECEIPT_PO', label: 'استلام بضاعة' },
  { value: 'SALES_INVOICE', label: 'فاتورة مبيعات' },
  { value: 'CREDIT_NOTE', label: 'إشعار دائن' },
  { value: 'DELIVERY_NOTE', label: 'إذن تسليم' },
  { value: 'PAYMENT_RECEIPT', label: 'إيصال دفع' },
  { value: 'JOURNAL_ENTRY', label: 'قيد يومية' },
];

const STATUS_OPTIONS_EN = [
  { value: '', label: 'All Status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const STATUS_OPTIONS_AR = [
  { value: '', label: 'جميع الحالات' },
  { value: 'true', label: 'نشط' },
  { value: 'false', label: 'غير نشط' },
];

const getStatusStyle = (isActive: boolean) => {
  return isActive
    ? { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' }
    : { backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' };
};

const DOC_TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  PURCHASE_ORDER:   { en: 'Purchase Order',    ar: 'طلب شراء' },
  GOODS_RECEIPT_PO: { en: 'Goods Receipt PO',  ar: 'استلام بضاعة' },
  SALES_INVOICE:    { en: 'Sales Invoice',      ar: 'فاتورة مبيعات' },
  CREDIT_NOTE:      { en: 'Credit Note',        ar: 'إشعار دائن' },
  DELIVERY_NOTE:    { en: 'Delivery Note',      ar: 'إذن تسليم' },
  PAYMENT_RECEIPT:  { en: 'Payment Receipt',    ar: 'إيصال دفع' },
  JOURNAL_ENTRY:    { en: 'Journal Entry',      ar: 'قيد يومية' },
};


export default function DocumentNumberSeriesListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { canAccess, canModify, isLoading: permLoading } = useScreenPermission(SCREEN_CODE);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: branchesData } = useAllBranchesNoFilter();
  const branchOptions = useMemo(() => {
    const opts = [{ value: '', label: isRTL ? 'جميع الفروع' : 'All Branches' }];
    if (branchesData) {
      branchesData
        .filter((b) => b.isActive)
        .forEach((b) => opts.push({ value: b.id, label: `${b.code} - ${b.name}` }));
    }
    return opts;
  }, [branchesData, isRTL]);

  const { data, isLoading, error } = useDocumentNumberSeriesList({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    documentType: selectedDocType || undefined,
    branchId: selectedBranch || undefined,
    isActive: selectedStatus || undefined,
  });

  const series = data?.data || [];
  const pagination = data?.pagination;

  // Build a branchId → branch name lookup
  const branchNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (branchesData) {
      branchesData.forEach((b) => map.set(b.id, `${b.code} - ${b.name}`));
    }
    return map;
  }, [branchesData]);

  const handleEdit = useCallback((row: DocumentNumberSeries) => {
    navigate(getPath(`administration/setup/document-number-series/${row.id}/edit`));
  }, [navigate, getPath]);

  const docTypeOptions = isRTL ? DOC_TYPE_OPTIONS_AR : DOC_TYPE_OPTIONS_EN;
  const statusOptions = isRTL ? STATUS_OPTIONS_AR : STATUS_OPTIONS_EN;

  const activeFilterCount = [selectedDocType, selectedBranch, selectedStatus].filter(Boolean).length;

  const columns = useMemo<ColumnDef<DocumentNumberSeries, unknown>[]>(() => [
    {
      id: 'documentType',
      accessorKey: 'documentType',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={FileText} emoji="📋" className="w-3.5 h-3.5" />
          {isRTL ? 'نوع المستند' : 'Document Type'}
        </span>
      ),
      size: 180,
      minSize: 140,
      maxSize: 250,
      cell: ({ row }) => {
        const label = DOC_TYPE_LABELS[row.original.documentType];
        return (
          <Badge className="border" style={{
            backgroundColor: 'var(--badge-info-bg)',
            color: 'var(--badge-info-text)',
            borderColor: 'var(--badge-info-border)',
          }}>
            {label ? (isRTL ? label.ar : label.en) : row.original.documentType}
          </Badge>
        );
      },
    },
    {
      id: 'branch',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={MapPin} emoji="📍" className="w-3.5 h-3.5" />
          {isRTL ? 'الفرع' : 'Branch'}
        </span>
      ),
      size: 200,
      minSize: 150,
      maxSize: 280,
      cell: ({ row }) => (
        <span>
          {branchNameMap.get(row.original.branchId) || row.original.branchId}
        </span>
      ),
    },
    {
      id: 'prefix',
      accessorKey: 'prefix',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" />
          {isRTL ? 'البادئة' : 'Prefix'}
        </span>
      ),
      size: 100,
      minSize: 80,
      maxSize: 140,
      cell: ({ row }) => (
        <span className="font-mono" style={{ color: row.original.prefix ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
          {row.original.prefix || '—'}
        </span>
      ),
    },
    {
      id: 'nextNumber',
      accessorKey: 'nextNumber',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Hash} emoji="🔢" className="w-3.5 h-3.5" />
          {isRTL ? 'الرقم التالي' : 'Next Number'}
        </span>
      ),
      size: 150,
      minSize: 120,
      maxSize: 200,
      cell: ({ row }) => (
        <span className="font-mono">
          {String(row.original.nextNumber).padStart(row.original.padding, '0')}
        </span>
      ),
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
      maxSize: 150,
      cell: ({ row }) => (
        <Badge className="border" style={getStatusStyle(row.original.isActive)}>
          {row.original.isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Settings} emoji="⚙️" className="w-3.5 h-3.5" />
          {t('common.actions')}
        </span>
      ),
      size: 80,
      minSize: 60,
      maxSize: 100,
      enableResizing: false,
      cell: ({ row }) => {
        if (!canModify) return null;
        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleEdit(row.original); }}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              title={t('common.edit')}
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ], [t, isRTL, canModify, handleEdit, branchNameMap]);

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
      {/* Page Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StyledIcon icon={Hash} emoji="#️⃣" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {isRTL ? 'سلسلة أرقام المستندات' : 'Document Number Series'}
            </h1>
          </div>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Search + Filters Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                <Input
                  placeholder={isRTL ? 'بحث في سلسلة الأرقام...' : 'Search number series...'}
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
                  <div className="w-56">
                    <SimpleSelect
                      value={selectedBranch}
                      onValueChange={(v: string) => {
                        setSelectedBranch(v);
                        setPage(1);
                      }}
                      options={branchOptions}
                      placeholder={isRTL ? 'الفرع' : 'Branch'}
                    />
                  </div>
                  <div className="w-56">
                    <SimpleSelect
                      value={selectedDocType}
                      onValueChange={(v: string) => {
                        setSelectedDocType(v);
                        setPage(1);
                      }}
                      options={docTypeOptions}
                      placeholder={isRTL ? 'نوع المستند' : 'Document Type'}
                    />
                  </div>
                  <div className="w-56">
                    <SimpleSelect
                      value={selectedStatus}
                      onValueChange={(v: string) => {
                        setSelectedStatus(v);
                        setPage(1);
                      }}
                      options={statusOptions}
                      placeholder={isRTL ? 'الحالة' : 'Status'}
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
            <TableSkeleton rows={6} columns={5} showHeader />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title={isRTL ? 'خطأ في تحميل سلسلة الأرقام' : 'Error loading number series'}
              message={(error as Error)?.message || (isRTL ? 'فشل التحميل' : 'Failed to load')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          </div>
        ) : series.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Hash}
              title={searchQuery || selectedDocType || selectedBranch || selectedStatus
                ? (isRTL ? 'لا توجد نتائج مطابقة' : 'No matching series')
                : (isRTL ? 'لا توجد سلسلة أرقام' : 'No number series found')}
              description={searchQuery || selectedDocType || selectedBranch || selectedStatus
                ? (isRTL ? 'جرب تعديل البحث أو الفلاتر' : 'Try adjusting your search or filters')
                : (isRTL ? 'يتم إنشاء السلاسل تلقائياً عند إنشاء فرع جديد' : 'Series are auto-created when a new branch is created')}
            />
          </div>
        ) : (
          <>
            <AdvancedDataTable<DocumentNumberSeries>
              tableId="doc-number-series-list-table"
              data={series}
              columns={columns}
              autoHeight={true}
              minHeight={400}
              rowHeight={48}
              enableColumnResize={true}
              enableColumnReorder={true}
              enableSorting={false}
              emptyMessage={isRTL ? 'لا توجد سلسلة أرقام' : 'No number series found'}
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
