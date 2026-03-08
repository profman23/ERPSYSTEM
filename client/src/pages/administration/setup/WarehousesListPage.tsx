/**
 * Warehouses List Page
 *
 * Route: /app/administration/setup/warehouses
 * AdvancedDataTable with search, collapsible filters (branch, type), and CRUD actions.
 * Follows TaxCodesListPage pattern.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus, Pencil, Ban, CheckCircle2, Search, Filter, ChevronDown,
  Hash, Type, Activity, Settings, Warehouse, MapPin, GitBranch, Loader2,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useToast } from '@/components/ui/toast';
import { useAllBranchesNoFilter } from '@/hooks/useHierarchy';
import {
  useWarehousesList,
  useToggleWarehouseStatus,
  type Warehouse as WarehouseType,
  type WarehouseListParams,
} from '@/hooks/useWarehouses';

const SCREEN_CODE = 'WAREHOUSES';

const getStatusStyle = (isActive: boolean) => {
  return isActive
    ? { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' }
    : { backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' };
};

const getDefaultBadgeStyle = () => ({
  backgroundColor: 'var(--badge-info-bg)',
  color: 'var(--badge-info-text)',
  borderColor: 'var(--badge-info-border)',
});

export default function WarehousesListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { canAccess, canModify, isLoading: permLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [params, setParams] = useState<WarehouseListParams>({ page: 1, limit: 20 });

  const { data: branchesData } = useAllBranchesNoFilter();
  const toggleMutation = useToggleWarehouseStatus();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data, isLoading, error } = useWarehousesList({
    ...params,
    search: searchQuery || undefined,
    branchId: selectedBranchId || undefined,
    warehouseType: selectedType || undefined,
  });

  const warehouses = data?.data || [];

  // Build branch name lookup
  const branchNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (branchesData) {
      for (const b of branchesData) {
        map.set(b.id, b.name);
      }
    }
    return map;
  }, [branchesData]);

  const branchOptions = useMemo(() => {
    const opts = [{ value: '', label: isRTL ? 'جميع الفروع' : 'All Branches' }];
    if (branchesData) {
      for (const b of branchesData) {
        opts.push({ value: b.id, label: `${b.name} (${b.code})` });
      }
    }
    return opts;
  }, [branchesData, isRTL]);

  const typeOptions = useMemo(() => [
    { value: '', label: isRTL ? 'جميع الأنواع' : 'All Types' },
    { value: 'STANDARD', label: t('warehouses.typeStandard') },
    { value: 'COLD_STORAGE', label: t('warehouses.typeColdStorage') },
    { value: 'DROP_SHIP', label: t('warehouses.typeDropShip') },
  ], [isRTL, t]);

  const handleEdit = useCallback((row: WarehouseType) => {
    navigate(getPath(`administration/setup/warehouses/${row.id}/edit`));
  }, [navigate, getPath]);

  const handleToggleStatus = useCallback(async (row: WarehouseType) => {
    setTogglingId(row.id);
    try {
      await toggleMutation.mutateAsync(row.id);
      showToast('success', row.isActive
        ? t('warehouses.warehouseDeactivated')
        : t('warehouses.warehouseActivated'));
    } catch (err: unknown) {
      const message = (err as Error)?.message || t('common.error');
      showToast('error', message);
    } finally {
      setTogglingId(null);
    }
  }, [toggleMutation, showToast, t]);

  const activeFilterCount = [selectedBranchId, selectedType].filter(Boolean).length;

  const warehouseTypeLabel = useCallback((type: string) => {
    const labels: Record<string, string> = {
      STANDARD: t('warehouses.typeStandard'),
      COLD_STORAGE: t('warehouses.typeColdStorage'),
      DROP_SHIP: t('warehouses.typeDropShip'),
    };
    return labels[type] || type;
  }, [t]);

  const columns = useMemo<ColumnDef<WarehouseType, unknown>[]>(() => [
    {
      id: 'code',
      accessorKey: 'code',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" />
          {t('warehouses.code')}
        </span>
      ),
      size: 160,
      minSize: 120,
      maxSize: 220,
      cell: ({ row }) => (
        <span className="font-mono">{row.original.code}</span>
      ),
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Type} emoji="🔤" className="w-3.5 h-3.5" />
          {t('warehouses.name')}
        </span>
      ),
      size: 220,
      minSize: 160,
      maxSize: 350,
      cell: ({ row }) => <span>{row.original.name}</span>,
    },
    {
      id: 'branch',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={GitBranch} emoji="🏢" className="w-3.5 h-3.5" />
          {t('warehouses.branch')}
        </span>
      ),
      size: 180,
      minSize: 140,
      maxSize: 260,
      cell: ({ row }) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {branchNameMap.get(row.original.branchId) || '—'}
        </span>
      ),
    },
    {
      id: 'warehouseType',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Warehouse} emoji="🏭" className="w-3.5 h-3.5" />
          {t('warehouses.warehouseType')}
        </span>
      ),
      size: 150,
      minSize: 120,
      maxSize: 200,
      cell: ({ row }) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {warehouseTypeLabel(row.original.warehouseType)}
        </span>
      ),
    },
    {
      id: 'isDefault',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={MapPin} emoji="📍" className="w-3.5 h-3.5" />
          {t('warehouses.isDefault')}
        </span>
      ),
      size: 110,
      minSize: 90,
      maxSize: 140,
      cell: ({ row }) => row.original.isDefault ? (
        <Badge className="border" style={getDefaultBadgeStyle()}>
          {isRTL ? 'افتراضي' : 'Default'}
        </Badge>
      ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>,
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
      size: 100,
      minSize: 80,
      maxSize: 120,
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
            {!row.original.isDefault && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleToggleStatus(row.original); }}
                disabled={togglingId === row.original.id}
                className="w-8 h-8 rounded-md flex items-center justify-center transition-colors disabled:opacity-50"
                style={{ color: row.original.isActive ? 'var(--color-danger)' : 'var(--color-success)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                title={row.original.isActive ? t('common.deactivate') : t('common.activate')}
              >
                {togglingId === row.original.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : row.original.isActive ? (
                  <Ban className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        );
      },
    },
  ], [t, isRTL, canModify, handleEdit, handleToggleStatus, togglingId, branchNameMap, warehouseTypeLabel]);

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
            <StyledIcon icon={Warehouse} emoji="🏭" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {t('warehouses.title')}
            </h1>
          </div>
          {canModify && (
            <Button onClick={() => navigate(getPath('administration/setup/warehouses/create'))}>
              <Plus className="w-4 h-4 mr-2" />
              {t('warehouses.createWarehouse')}
            </Button>
          )}
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
                  placeholder={t('warehouses.searchWarehouses')}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setParams((prev) => ({ ...prev, page: 1 }));
                  }}
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
                      value={selectedBranchId}
                      onValueChange={(v: string) => {
                        setSelectedBranchId(v);
                        setParams((prev) => ({ ...prev, page: 1 }));
                      }}
                      options={branchOptions}
                      placeholder={t('warehouses.branch')}
                    />
                  </div>
                  <div className="w-56">
                    <SimpleSelect
                      value={selectedType}
                      onValueChange={(v: string) => {
                        setSelectedType(v);
                        setParams((prev) => ({ ...prev, page: 1 }));
                      }}
                      options={typeOptions}
                      placeholder={t('warehouses.warehouseType')}
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
            <TableSkeleton rows={6} columns={7} showHeader />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title={isRTL ? 'خطأ في تحميل المستودعات' : 'Error loading warehouses'}
              message={(error as Error)?.message || (isRTL ? 'فشل تحميل المستودعات' : 'Failed to load warehouses')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          </div>
        ) : warehouses.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Warehouse}
              title={searchQuery || selectedBranchId || selectedType
                ? t('warehouses.noMatchingWarehouses')
                : t('warehouses.noWarehouses')}
              description={searchQuery || selectedBranchId || selectedType
                ? (isRTL ? 'جرب تعديل البحث أو الفلاتر' : 'Try adjusting your search or filters')
                : t('warehouses.createFirstWarehouse')}
              action={!searchQuery && !selectedBranchId && !selectedType && canModify ? {
                label: t('warehouses.createWarehouse'),
                onClick: () => navigate(getPath('administration/setup/warehouses/create')),
                icon: Plus,
              } : undefined}
            />
          </div>
        ) : (
          <AdvancedDataTable<WarehouseType>
            tableId="warehouses-list-table"
            data={warehouses}
            columns={columns}
            autoHeight
            minHeight={400}
            rowHeight={48}
            enableColumnResize
            enableColumnReorder
            enableSorting={false}
            emptyMessage={t('warehouses.noWarehouses')}
          />
        )}
      </div>
    </div>
  );
}
