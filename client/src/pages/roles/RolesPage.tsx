/**
 * Roles Management Page — SAP B1 Style
 * List all tenant roles with AdvancedDataTable, search, and filters
 */

import { useState, useMemo, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Search, Shield, Loader2, Users, Lock, Filter, ChevronDown, UserPlus, Type, Tag, Activity, Settings } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { ColumnDef } from '@tanstack/react-table';
import { useRoles } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useScopePath } from '@/hooks/useScopePath';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { AdvancedDataTable } from '@/components/ui/AdvancedDataTable';
import { FilterGroup, FilterConfig } from '@/components/ui/FilterGroup';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import type { RoleListItem } from '@types/dpf';

const SCREEN_CODE = 'ROLES';

const getStatusStyle = (isActive: string) => {
  if (isActive === 'true') {
    return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' };
  }
  return { backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' };
};

export default function RolesPage() {
  const navigate = useNavigate();
  const { getPath } = useScopePath();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = Object.values(filterValues).filter(v => v !== undefined && v !== '' && v !== null).length;
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { canAccess, canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);
  const { data, isLoading, error } = useRoles({ page: 1, limit: 100, search });
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  const canCreate = canModify;
  const canEdit = canModify;
  const canView = canAccess;

  // Filter configuration
  const filterConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: t('roles.status'),
      type: 'select',
      options: [
        { value: 'active', label: t('common.active') },
        { value: 'inactive', label: t('common.inactive') },
      ],
      placeholder: t('roles.allStatuses'),
    },
    {
      key: 'type',
      label: t('common.type'),
      type: 'select',
      options: [
        { value: 'protected', label: t('roles.protected') },
        { value: 'custom', label: t('roles.custom') },
      ],
      placeholder: t('roles.allTypes'),
    },
  ], [t]);

  // Filter and sort data
  const filteredRoles = useMemo(() => {
    if (!data?.data) return [];
    let result = [...data.data];

    // Apply status filter
    if (filterValues.status === 'active') {
      result = result.filter(r => r.isActive === 'true');
    } else if (filterValues.status === 'inactive') {
      result = result.filter(r => r.isActive !== 'true');
    }

    // Apply type filter
    if (filterValues.type === 'protected') {
      result = result.filter(r => r.isProtected === 'true');
    } else if (filterValues.type === 'custom') {
      result = result.filter(r => r.isProtected !== 'true');
    }

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = String((a as unknown as Record<string, unknown>)[sortColumn] || '');
        const bVal = String((b as unknown as Record<string, unknown>)[sortColumn] || '');
        const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [data, filterValues, sortColumn, sortDirection]);

  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  }, []);

  const handleCreate = () => {
    navigate(getPath('administration/roles/create'));
  };

  const handleEdit = useCallback((role: RoleListItem) => {
    navigate(getPath(`administration/roles/${role.id}/edit`));
  }, [navigate, getPath]);

  const handleRowClick = useCallback((role: RoleListItem) => {
    if (canEdit) {
      navigate(getPath(`administration/roles/${role.id}/edit`));
    }
  }, [navigate, getPath, canEdit]);

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canView) {
    return <Navigate to={getPath('dashboard')} replace />;
  }

  // Column definitions
  const roleColumns: ColumnDef<RoleListItem>[] = [
    {
      id: 'roleName',
      accessorKey: 'roleName',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Type} emoji="🔤" className="w-3.5 h-3.5" />
          {t('roles.roleName')}
        </span>
      ),
      size: 250,
      minSize: 180,
      maxSize: 400,
      cell: ({ row }) => {
        const role = row.original;
        return (
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 flex-shrink-0 text-[var(--color-accent)]" />
            <p className="text-[var(--color-text)]">{role.roleName}</p>
          </div>
        );
      },
    },
    {
      id: 'usersCount',
      accessorKey: 'usersCount',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Users} emoji="👥" className="w-3.5 h-3.5" />
          {t('roles.usersCount')}
        </span>
      ),
      size: 100,
      minSize: 80,
      maxSize: 130,
      cell: ({ getValue }) => {
        const count = getValue() as number;
        return (
          <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
            <Users className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            {count} {count !== 1 ? t('roles.userPlural') : t('roles.user')}
          </span>
        );
      },
    },
    {
      id: 'isProtected',
      accessorKey: 'isProtected',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Tag} emoji="🏷️" className="w-3.5 h-3.5" />
          {t('common.type')}
        </span>
      ),
      size: 120,
      minSize: 90,
      maxSize: 160,
      cell: ({ getValue }) => {
        const isProtected = getValue() as string;
        return isProtected === 'true' ? (
          <Badge className="border" style={{ backgroundColor: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', borderColor: 'var(--badge-warning-border)' }}>
            <Lock className="w-3 h-3 mr-1" />
            {t('roles.protected')}
          </Badge>
        ) : (
          <Badge className="border" style={{ backgroundColor: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', borderColor: 'var(--badge-info-border)' }}>
            {t('roles.custom')}
          </Badge>
        );
      },
    },
    {
      id: 'isActive',
      accessorKey: 'isActive',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Activity} emoji="📈" className="w-3.5 h-3.5" />
          {t('roles.status')}
        </span>
      ),
      size: 100,
      minSize: 80,
      maxSize: 130,
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return (
          <Badge className="border" style={getStatusStyle(value)}>
            {value === 'true' ? t('common.active') : t('common.inactive')}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Settings} emoji="⚙️" className="w-3.5 h-3.5" />
          {t('roles.actions')}
        </span>
      ),
      size: 120,
      minSize: 100,
      maxSize: 150,
      enableResizing: false,
      cell: ({ row }) => {
        const role = row.original;
        return (
          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleEdit(role); }}
                className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                title={t('common.edit')}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(getPath(`administration/users/create?roleId=${role.id}`)); }}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              title={t('roles.assignUser')}
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StyledIcon icon={Shield} emoji="🛡️" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            <h1 className="text-3xl font-bold text-[var(--color-text)]">{t('roles.title')}</h1>
          </div>
          {canCreate && (
            <Button onClick={handleCreate} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              {t('roles.createRole')}
            </Button>
          )}
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <Card className="card-panel border">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <Input
                  placeholder={t('roles.searchRoles')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 input-panel"
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
                <FilterGroup
                  filters={filterConfig}
                  values={filterValues}
                  onChange={setFilterValues}
                  layout="horizontal"
                  showActiveCount={false}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
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
              title={t('roles.errorLoadingRoles')}
              message={(error as Error)?.message || t('roles.failedToLoadRoles')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Shield}
              title={search ? t('roles.noMatchingRoles') : t('roles.noRolesYet')}
              description={search ? t('roles.tryAdjustingSearch') : t('roles.createFirstRole')}
              action={!search && canCreate ? {
                label: t('roles.createRole'),
                onClick: handleCreate,
                icon: Plus,
              } : undefined}
            />
          </div>
        ) : (
          <AdvancedDataTable<RoleListItem>
            tableId="tenant-roles-table"
            data={filteredRoles}
            columns={roleColumns}
            autoHeight={true}
            minHeight={400}
            rowHeight={48}
            onRowClick={handleRowClick}
            enableColumnResize={true}
            enableColumnReorder={true}
            enableSorting={true}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            emptyMessage={t('roles.noRolesFound')}
          />
        )}
      </div>

    </div>
  );
}
