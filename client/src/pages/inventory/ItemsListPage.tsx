/**
 * Items List Page — Item Master Data
 *
 * Route: /app/inventory/items
 * AdvancedDataTable with search, filters (type, group, status), image thumbnail,
 * and toggle active/inactive.
 * Follows ItemGroupsListPage pattern.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus, Pencil, Ban, CheckCircle2, Search, Filter, ChevronDown,
  Hash, Type, Activity, Settings, Loader2, PackageSearch, Layers, Package,
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
  useItemsList,
  useToggleItemActive,
  type Item,
  type ItemListParams,
} from '@/hooks/useItems';
import {
  useItemGroupsList,
  type ItemGroup,
} from '@/hooks/useItemGroups';

const SCREEN_CODE = 'ITEM_MASTER';

const TYPE_OPTIONS_EN = [
  { value: '', label: 'All Types' },
  { value: 'ITEM', label: 'Item' },
  { value: 'SERVICE', label: 'Service' },
];

const TYPE_OPTIONS_AR = [
  { value: '', label: 'جميع الأنواع' },
  { value: 'ITEM', label: 'صنف' },
  { value: 'SERVICE', label: 'خدمة' },
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

export default function ItemsListPage() {
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
  const [selectedGroup, setSelectedGroup] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [params, setParams] = useState<ItemListParams>({
    page: 1,
    limit: 20,
  });

  const { data, isLoading, error } = useItemsList({
    ...params,
    search: searchQuery || undefined,
    itemType: selectedType || undefined,
    isActive: selectedStatus || undefined,
    itemGroupId: selectedGroup || undefined,
  });
  const toggleMutation = useToggleItemActive();

  // Load item groups for filter dropdown
  const { data: groupsData } = useItemGroupsList({ isActive: 'true', limit: 100 });

  const items = data?.data || [];

  // Build item group lookup for display
  const groupMap = useMemo(() => {
    const map = new Map<string, ItemGroup>();
    if (groupsData?.data) {
      for (const g of groupsData.data) {
        map.set(g.id, g);
      }
    }
    return map;
  }, [groupsData]);

  const groupFilterOptions = useMemo(() => {
    const base = [{ value: '', label: isRTL ? 'جميع المجموعات' : 'All Groups' }];
    if (groupsData?.data) {
      for (const g of groupsData.data) {
        base.push({ value: g.id, label: `${g.code} - ${isRTL && g.nameAr ? g.nameAr : g.name}` });
      }
    }
    return base;
  }, [groupsData, isRTL]);

  const handleEdit = useCallback((row: Item) => {
    navigate(getPath(`inventory/items/${row.id}/edit`));
  }, [navigate, getPath]);

  const handleToggleActive = useCallback(async (row: Item) => {
    setTogglingId(row.id);
    try {
      await toggleMutation.mutateAsync({
        id: row.id,
        isActive: !row.isActive,
        version: row.version,
      });
      showToast('success', row.isActive
        ? (isRTL ? 'تم تعطيل الصنف' : 'Item deactivated')
        : (isRTL ? 'تم تفعيل الصنف' : 'Item activated'));
    } catch {
      showToast('error', t('common.operationFailed'));
    } finally {
      setTogglingId(null);
    }
  }, [toggleMutation, showToast, t, isRTL]);

  const typeOptions = isRTL ? TYPE_OPTIONS_AR : TYPE_OPTIONS_EN;
  const statusOptions = isRTL ? STATUS_OPTIONS_AR : STATUS_OPTIONS_EN;

  const activeFilterCount = [selectedType, selectedStatus, selectedGroup].filter(Boolean).length;

  const columns = useMemo<ColumnDef<Item, unknown>[]>(() => [
    {
      id: 'image',
      header: '',
      size: 50,
      minSize: 50,
      maxSize: 50,
      enableResizing: false,
      cell: ({ row }) => (
        <div className="w-8 h-8 rounded overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-hover)' }}>
          {row.original.imageUrl ? (
            <img
              src={row.original.imageUrl.startsWith('http') ? row.original.imageUrl : `${window.location.origin}${row.original.imageUrl}`}
              alt=""
              className="w-8 h-8 object-cover"
            />
          ) : (
            <Package className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          )}
        </div>
      ),
    },
    {
      id: 'code',
      accessorKey: 'code',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" />
          {t('common.code', 'Code')}
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
      id: 'itemType',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={PackageSearch} emoji="📋" className="w-3.5 h-3.5" />
          {t('common.type', 'Type')}
        </span>
      ),
      size: 100,
      minSize: 80,
      maxSize: 140,
      cell: ({ row }) => (
        <Badge className="border" style={getTypeStyle()}>
          {row.original.itemType === 'ITEM'
            ? (isRTL ? 'صنف' : 'Item')
            : (isRTL ? 'خدمة' : 'Service')}
        </Badge>
      ),
    },
    {
      id: 'itemGroup',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Layers} emoji="📦" className="w-3.5 h-3.5" />
          {isRTL ? 'المجموعة' : 'Group'}
        </span>
      ),
      size: 140,
      minSize: 110,
      maxSize: 200,
      cell: ({ row }) => {
        const group = row.original.itemGroupId ? groupMap.get(row.original.itemGroupId) : null;
        if (!group) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
        return <span>{isRTL && group.nameAr ? group.nameAr : group.name}</span>;
      },
    },
    {
      id: 'status',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Activity} emoji="📈" className="w-3.5 h-3.5" />
          {t('common.status', 'Status')}
        </span>
      ),
      size: 100,
      minSize: 90,
      maxSize: 130,
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
  ], [t, isRTL, canModify, handleEdit, handleToggleActive, togglingId, groupMap]);

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
            <StyledIcon icon={PackageSearch} emoji="📋" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {isRTL ? 'بيانات الأصناف' : 'Item Master'}
            </h1>
          </div>
          {canModify && (
            <Button onClick={() => navigate(getPath('inventory/items/create'))}>
              <Plus className="w-4 h-4 mr-2" />
              {isRTL ? 'صنف جديد' : 'New Item'}
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
                  placeholder={isRTL ? 'بحث بالكود، الاسم، الباركود...' : 'Search by code, name, barcode...'}
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
                      placeholder={isRTL ? 'نوع الصنف' : 'Item Type'}
                    />
                  </div>
                  <div className="w-56">
                    <SimpleSelect
                      value={selectedGroup}
                      onValueChange={(v: string) => {
                        setSelectedGroup(v);
                        setParams((prev) => ({ ...prev, page: 1 }));
                      }}
                      options={groupFilterOptions}
                      placeholder={isRTL ? 'المجموعة' : 'Item Group'}
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
            <TableSkeleton rows={6} columns={7} showHeader />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title={isRTL ? 'خطأ في تحميل الأصناف' : 'Error loading items'}
              message={(error as Error)?.message || (isRTL ? 'فشل تحميل الأصناف' : 'Failed to load items')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={PackageSearch}
              title={searchQuery || selectedType || selectedStatus || selectedGroup
                ? (isRTL ? 'لا توجد نتائج مطابقة' : 'No matching items')
                : (isRTL ? 'لا توجد أصناف' : 'No items')}
              description={searchQuery || selectedType || selectedStatus || selectedGroup
                ? (isRTL ? 'جرب تعديل البحث أو الفلاتر' : 'Try adjusting your search or filters')
                : (isRTL ? 'أنشئ أول صنف' : 'Create your first item')}
              action={!searchQuery && !selectedType && !selectedStatus && !selectedGroup && canModify ? {
                label: isRTL ? 'صنف جديد' : 'New Item',
                onClick: () => navigate(getPath('inventory/items/create')),
                icon: Plus,
              } : undefined}
            />
          </div>
        ) : (
          <AdvancedDataTable<Item>
            tableId="items-list-table"
            data={items}
            columns={columns}
            autoHeight={true}
            minHeight={400}
            rowHeight={48}
            enableColumnResize={true}
            enableColumnReorder={true}
            enableSorting={false}
            emptyMessage={isRTL ? 'لا توجد أصناف' : 'No items'}
          />
        )}
      </div>
    </div>
  );
}
