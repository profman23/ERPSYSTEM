/**
 * Posting Periods List Page
 *
 * Route: /app/administration/setup/posting-periods
 * Shows all fiscal years with search, filters, pagination.
 * "New Period" button to create a new fiscal year.
 * Click row → sub-periods page.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Pencil, Calendar, Search, Filter, ChevronDown,
  Activity, Settings, Plus, Loader2, FileText, Hash, Clock, Layers,
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
  usePostingPeriodsList,
  type PostingPeriod,
} from '@/hooks/usePostingPeriods';

const SCREEN_CODE = 'POSTING_PERIODS';

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

export default function PostingPeriodsListPage() {
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error } = usePostingPeriodsList({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    isActive: selectedStatus || undefined,
  });

  const periods = data?.data || [];
  const pagination = data?.pagination;

  const statusOptions = isRTL ? STATUS_OPTIONS_AR : STATUS_OPTIONS_EN;
  const activeFilterCount = [selectedStatus].filter(Boolean).length;

  const handleView = useCallback((row: PostingPeriod) => {
    navigate(getPath(`administration/setup/posting-periods/${row.id}/sub-periods`));
  }, [navigate, getPath]);

  const columns = useMemo<ColumnDef<PostingPeriod, unknown>[]>(() => [
    {
      id: 'code',
      accessorKey: 'code',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Calendar} emoji="📅" className="w-3.5 h-3.5" />
          {isRTL ? 'الرمز' : 'Code'}
        </span>
      ),
      size: 120,
      minSize: 100,
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
          {isRTL ? 'الاسم' : 'Name'}
        </span>
      ),
      size: 200,
      minSize: 150,
      maxSize: 300,
      cell: ({ row }) => (
        <span>{isRTL && row.original.nameAr ? row.original.nameAr : row.original.name}</span>
      ),
    },
    {
      id: 'fiscalYear',
      accessorKey: 'fiscalYear',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" />
          {isRTL ? 'السنة المالية' : 'Fiscal Year'}
        </span>
      ),
      size: 120,
      minSize: 100,
      maxSize: 160,
      cell: ({ row }) => (
        <span className="font-mono">{row.original.fiscalYear}</span>
      ),
    },
    {
      id: 'startDate',
      accessorKey: 'startDate',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Calendar} emoji="📅" className="w-3.5 h-3.5" />
          {isRTL ? 'من' : 'Start Date'}
        </span>
      ),
      size: 130,
      minSize: 100,
      maxSize: 180,
      cell: ({ row }) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>{row.original.startDate}</span>
      ),
    },
    {
      id: 'endDate',
      accessorKey: 'endDate',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Clock} emoji="🕐" className="w-3.5 h-3.5" />
          {isRTL ? 'إلى' : 'End Date'}
        </span>
      ),
      size: 130,
      minSize: 100,
      maxSize: 180,
      cell: ({ row }) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>{row.original.endDate}</span>
      ),
    },
    {
      id: 'periods',
      accessorKey: 'numberOfPeriods',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Layers} emoji="📚" className="w-3.5 h-3.5" />
          {isRTL ? 'الفترات' : 'Periods'}
        </span>
      ),
      size: 90,
      minSize: 70,
      maxSize: 120,
      cell: ({ row }) => (
        <span className="font-mono">{row.original.numberOfPeriods}</span>
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
        <Badge
          className="border"
          style={row.original.isActive
            ? { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' }
            : { backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' }
          }
        >
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
              onClick={(e) => { e.stopPropagation(); handleView(row.original); }}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              title={isRTL ? 'عرض الفترات الفرعية' : 'View Sub-Periods'}
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ], [t, isRTL, canModify, handleView]);

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
            <StyledIcon icon={Calendar} emoji="📅" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {isRTL ? 'فترات الترحيل' : 'Posting Periods'}
            </h1>
          </div>
          {canModify && (
            <Button onClick={() => navigate(getPath('administration/setup/posting-periods/create'))}>
              <Plus className="w-4 h-4 me-2" />
              {isRTL ? 'فترة جديدة' : 'New Period'}
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
                  placeholder={isRTL ? 'بحث في فترات الترحيل...' : 'Search posting periods...'}
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
                      value={selectedStatus}
                      onValueChange={(v: string) => { setSelectedStatus(v); setPage(1); }}
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
            <TableSkeleton rows={5} columns={7} showHeader />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title={isRTL ? 'خطأ في تحميل فترات الترحيل' : 'Error loading posting periods'}
              message={(error as Error)?.message || (isRTL ? 'فشل التحميل' : 'Failed to load')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          </div>
        ) : periods.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Calendar}
              title={searchQuery || selectedStatus
                ? (isRTL ? 'لا توجد نتائج مطابقة' : 'No matching periods')
                : (isRTL ? 'لا توجد فترات ترحيل' : 'No posting periods found')}
              description={searchQuery || selectedStatus
                ? (isRTL ? 'جرب تعديل البحث أو الفلاتر' : 'Try adjusting your search or filters')
                : (isRTL ? 'أنشئ فترة ترحيل جديدة للبدء' : 'Create a new posting period to get started')}
            />
          </div>
        ) : (
          <>
            <AdvancedDataTable<PostingPeriod>
              tableId="posting-periods-list-table"
              data={periods}
              columns={columns}
              autoHeight={true}
              minHeight={300}
              rowHeight={48}
              enableColumnResize={true}
              enableColumnReorder={true}
              enableSorting={false}
              onRowClick={handleView}
              emptyMessage={isRTL ? 'لا توجد فترات ترحيل' : 'No posting periods found'}
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
