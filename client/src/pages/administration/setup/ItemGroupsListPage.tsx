/**
 * Item Groups List Page
 *
 * Route: /app/administration/setup/item-groups
 * AdvancedDataTable with search, collapsible type filter, and CRUD actions.
 * Follows TaxCodesListPage pattern.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus, Pencil, Ban, CheckCircle2, Layers, Search, Filter, ChevronDown,
  Hash, Type, Activity, Settings, Loader2,
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
import {
  useItemGroupsList,
  useUpdateItemGroup,
  type ItemGroup,
  type ItemGroupListParams,
} from '@/hooks/useItemGroups';

const SCREEN_CODE = 'ITEM_GROUPS';

const TYPE_OPTIONS_EN = [
  { value: '', label: 'All Types' },
  { value: 'MEDICINE', label: 'Medicine' },
  { value: 'SURGICAL_SUPPLY', label: 'Surgical Supply' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'CONSUMABLE', label: 'Consumable' },
  { value: 'SERVICE', label: 'Service' },
];

const TYPE_OPTIONS_AR = [
  { value: '', label: 'جميع الأنواع' },
  { value: 'MEDICINE', label: 'أدوية' },
  { value: 'SURGICAL_SUPPLY', label: 'مستلزمات جراحية' },
  { value: 'EQUIPMENT', label: 'أجهزة ومعدات' },
  { value: 'CONSUMABLE', label: 'مواد استهلاكية' },
  { value: 'SERVICE', label: 'خدمات' },
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

const getTypeStyle = () => ({
  backgroundColor: 'var(--badge-info-bg)',
  color: 'var(--badge-info-text)',
  borderColor: 'var(--badge-info-border)',
});

const TYPE_LABELS_EN: Record<string, string> = {
  MEDICINE: 'Medicine',
  SURGICAL_SUPPLY: 'Surgical Supply',
  EQUIPMENT: 'Equipment',
  CONSUMABLE: 'Consumable',
  SERVICE: 'Service',
};

const TYPE_LABELS_AR: Record<string, string> = {
  MEDICINE: 'أدوية',
  SURGICAL_SUPPLY: 'مستلزمات جراحية',
  EQUIPMENT: 'أجهزة ومعدات',
  CONSUMABLE: 'مواد استهلاكية',
  SERVICE: 'خدمات',
};

export default function ItemGroupsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { canAccess, canModify, isLoading: permLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [params, setParams] = useState<ItemGroupListParams>({
    page: 1,
    limit: 20,
  });

  const { data, isLoading, error } = useItemGroupsList({
    ...params,
    search: searchQuery || undefined,
    itemGroupType: selectedType || undefined,
    isActive: selectedStatus || undefined,
  });
  const updateMutation = useUpdateItemGroup();

  const itemGroups = data?.data || [];

  const handleEdit = useCallback((row: ItemGroup) => {
    navigate(getPath(`administration/setup/item-groups/${row.id}/edit`));
  }, [navigate, getPath]);

  const handleToggleActive = useCallback(async (row: ItemGroup) => {
    setTogglingId(row.id);
    try {
      await updateMutation.mutateAsync({
        id: row.id,
        isActive: !row.isActive,
      });
      showToast('success', row.isActive
        ? (isRTL ? 'تم تعطيل مجموعة الأصناف' : 'Item group deactivated')
        : (isRTL ? 'تم تفعيل مجموعة الأصناف' : 'Item group activated'));
    } catch {
      showToast('error', t('common.error'));
    } finally {
      setTogglingId(null);
    }
  }, [updateMutation, showToast, t, isRTL]);

  const typeOptions = isRTL ? TYPE_OPTIONS_AR : TYPE_OPTIONS_EN;
  const statusOptions = isRTL ? STATUS_OPTIONS_AR : STATUS_OPTIONS_EN;
  const typeLabels = isRTL ? TYPE_LABELS_AR : TYPE_LABELS_EN;

  const activeFilterCount = [selectedType, selectedStatus].filter(Boolean).length;

  const columns = useMemo<ColumnDef<ItemGroup, unknown>[]>(() => [
    {
      id: 'code',
      accessorKey: 'code',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" />
          {t('common.code', 'Code')}
        </span>
      ),
      size: 130,
      minSize: 100,
      maxSize: 180,
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
          {t('common.name', 'Name')}
        </span>
      ),
      size: 220,
      minSize: 160,
      maxSize: 350,
      cell: ({ row }) => (
        <span>
          {isRTL && row.original.nameAr ? row.original.nameAr : row.original.name}
        </span>
      ),
    },
    {
      id: 'itemGroupType',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Layers} emoji="📦" className="w-3.5 h-3.5" />
          {isRTL ? 'النوع' : 'Type'}
        </span>
      ),
      size: 160,
      minSize: 130,
      maxSize: 220,
      cell: ({ row }) => (
        <Badge className="border" style={getTypeStyle()}>
          {typeLabels[row.original.itemGroupType] || row.original.itemGroupType}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Activity} emoji="📈" className="w-3.5 h-3.5" />
          {t('common.status', 'Status')}
        </span>
      ),
      size: 110,
      minSize: 90,
      maxSize: 150,
      cell: ({ row }) => (
        <Badge className="border" style={getStatusStyle(row.original.isActive)}>
          {row.original.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Settings} emoji="⚙️" className="w-3.5 h-3.5" />
          {t('common.actions', 'Actions')}
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
              title={t('common.edit', 'Edit')}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleToggleActive(row.original); }}
              disabled={togglingId === row.original.id}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors disabled:opacity-50"
              style={{ color: row.original.isActive ? 'var(--color-danger)' : 'var(--color-success)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={row.original.isActive ? t('common.deactivate', 'Deactivate') : t('common.activate', 'Activate')}
            >
              {togglingId === row.original.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : row.original.isActive ? (
                <Ban className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </button>
          </div>
        );
      },
    },
  ], [t, isRTL, canModify, handleEdit, handleToggleActive, togglingId, typeLabels]);

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
            <StyledIcon icon={Layers} emoji="📦" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {isRTL ? 'مجموعات الأصناف' : 'Item Groups'}
            </h1>
          </div>
          {canModify && (
            <Button onClick={() => navigate(getPath('administration/setup/item-groups/create'))}>
              <Plus className="w-4 h-4 mr-2" />
              {isRTL ? 'مجموعة جديدة' : 'New Item Group'}
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
                  placeholder={isRTL ? 'بحث عن مجموعة أصناف...' : 'Search item groups...'}
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
                <span className="hidden sm:inline">{t('common.filters', 'Filters')}</span>
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
                      value={selectedType}
                      onValueChange={(v: string) => {
                        setSelectedType(v);
                        setParams((prev) => ({ ...prev, page: 1 }));
                      }}
                      options={typeOptions}
                      placeholder={isRTL ? 'نوع المجموعة' : 'Item Group Type'}
                    />
                  </div>
                  <div className="w-56">
                    <SimpleSelect
                      value={selectedStatus}
                      onValueChange={(v: string) => {
                        setSelectedStatus(v);
                        setParams((prev) => ({ ...prev, page: 1 }));
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
              title={isRTL ? 'خطأ في تحميل مجموعات الأصناف' : 'Error loading item groups'}
              message={(error as Error)?.message || (isRTL ? 'فشل تحميل مجموعات الأصناف' : 'Failed to load item groups')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          </div>
        ) : itemGroups.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Layers}
              title={searchQuery || selectedType || selectedStatus
                ? (isRTL ? 'لا توجد نتائج مطابقة' : 'No matching item groups')
                : (isRTL ? 'لا توجد مجموعات أصناف' : 'No item groups')}
              description={searchQuery || selectedType || selectedStatus
                ? (isRTL ? 'جرب تعديل البحث أو الفلاتر' : 'Try adjusting your search or filters')
                : (isRTL ? 'أنشئ أول مجموعة أصناف' : 'Create your first item group')}
              action={!searchQuery && !selectedType && !selectedStatus && canModify ? {
                label: isRTL ? 'مجموعة جديدة' : 'New Item Group',
                onClick: () => navigate(getPath('administration/setup/item-groups/create')),
                icon: Plus,
              } : undefined}
            />
          </div>
        ) : (
          <AdvancedDataTable<ItemGroup>
            tableId="item-groups-list-table"
            data={itemGroups}
            columns={columns}
            autoHeight={true}
            minHeight={400}
            rowHeight={48}
            enableColumnResize={true}
            enableColumnReorder={true}
            enableSorting={false}
            emptyMessage={isRTL ? 'لا توجد مجموعات أصناف' : 'No item groups'}
          />
        )}
      </div>
    </div>
  );
}
