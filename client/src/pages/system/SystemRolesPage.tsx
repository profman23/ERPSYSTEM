/**
 * System Roles Management Page
 * Allows SYSTEM users to create/edit/manage platform-wide system roles
 * Uses AdvancedDataTable matching the tenant RolesPage pattern
 */

import { useState, useMemo, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Shield, Plus, Lock, Users, Search, Loader2, Edit, Filter, ChevronDown, Type, Tag, Activity, Settings, UserPlus } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { FilterGroup, FilterConfig } from '@/components/ui/FilterGroup';
import { AdvancedDataTable, ActionButtonGroup, ActionButton } from '@/components/ui/AdvancedDataTable';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  useSystemRoles,
} from '@/hooks/useSystemRoles';
import type { RoleListItem } from '@types/dpf';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

// Screen code for permission checking (SAP B1 Style)
const SCREEN_CODE = 'SYSTEM_ROLE_LIST';

const getStatusStyle = (isActive: string) => {
  if (isActive === 'true') {
    return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' };
  }
  return { backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' };
};

// Default system roles (displayed even before API loads)
const DEFAULT_SYSTEM_ROLES: RoleListItem[] = [
  {
    id: 'SYSTEM_ADMIN',
    roleCode: 'SYSTEM_ADMIN',
    roleName: 'System Administrator',
    description: 'Full platform access with all permissions. Can manage all tenants, users, and system configurations.',
    isProtected: 'true',
    isDefault: 'true',
    isActive: 'true',
    usersCount: 1,
    permissionsCount: 0,
    permissions: ['*'],
  },
  {
    id: 'SYSTEM_SUPPORT',
    roleCode: 'SYSTEM_SUPPORT',
    roleName: 'System Support',
    description: 'Read-only access to platform resources for support and troubleshooting purposes.',
    isProtected: 'true',
    isDefault: 'false',
    isActive: 'true',
    usersCount: 0,
    permissionsCount: 3,
    permissions: ['system.view', 'tenants.view', 'users.view'],
  },
  {
    id: 'BILLING_SUPPORT',
    roleCode: 'BILLING_SUPPORT',
    roleName: 'Billing Support',
    description: 'Access to billing, subscriptions, and payment information across all tenants.',
    isProtected: 'true',
    isDefault: 'false',
    isActive: 'true',
    usersCount: 0,
    permissionsCount: 3,
    permissions: ['billing.view', 'billing.update', 'subscriptions.view'],
  },
] as unknown as RoleListItem[];

export default function SystemRolesPage() {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  // Permission checks (SAP B1 Style)
  const { canAccessScreen, canModifyScreen, loading: permissionsLoading } = usePermissions();
  const canAccess = canAccessScreen(SCREEN_CODE);
  const canEdit = canModifyScreen(SCREEN_CODE);

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = Object.values(filterValues).filter(v => v !== undefined && v !== '' && v !== null).length;
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  // Filter configuration
  const filterConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: t('common.status'),
      type: 'select',
      options: [
        { value: 'active', label: t('common.active') },
        { value: 'inactive', label: t('common.inactive') },
      ],
      placeholder: t('tenants.allStatuses'),
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

  // API Hooks
  const { data: rolesData, isLoading: isLoadingRoles, error } = useSystemRoles({
    search: searchQuery || undefined,
    limit: 50,
  });

  // Combine API roles with defaults (if API fails or is empty)
  const displayRoles = rolesData?.data && rolesData.data.length > 0
    ? rolesData.data
    : DEFAULT_SYSTEM_ROLES;

  // Filter, search, and sort
  const filteredRoles = useMemo(() => {
    let result = [...displayRoles];

    // Apply status filter
    if (filterValues.status === 'active') {
      result = result.filter(r => r.isActive === 'true');
    } else if (filterValues.status === 'inactive') {
      result = result.filter(r => r.isActive !== 'true');
    }

    // Apply type filter
    if (filterValues.type === 'protected') {
      result = result.filter(role => role.isProtected === 'true');
    } else if (filterValues.type === 'custom') {
      result = result.filter(role => role.isProtected !== 'true');
    }

    // Apply search (client-side supplement for defaults)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (role) =>
          role.roleName.toLowerCase().includes(query) ||
          role.roleCode.toLowerCase().includes(query)
      );
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
  }, [displayRoles, filterValues, searchQuery, sortColumn, sortDirection]);

  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  }, []);

  // Handle create role — navigate to create page
  const handleOpenCreatePage = () => {
    navigate('/system/administration/roles/create');
  };

  // Handle edit role — navigate to edit page
  const handleEdit = useCallback((role: RoleListItem) => {
    navigate(`/system/administration/roles/${role.id}/edit`);
  }, [navigate]);

  const handleRowClick = useCallback((role: RoleListItem) => {
    if (canEdit) {
      navigate(`/system/administration/roles/${role.id}/edit`);
    }
  }, [navigate, canEdit]);

  // Build action buttons for a role
  const getActionButtons = useCallback((role: RoleListItem): ActionButton[] => {
    const actions: ActionButton[] = [];

    actions.push({
      id: 'edit',
      label: !canEdit || role.isProtected === 'true' ? t('common.view') : t('common.edit'),
      icon: Edit,
      onClick: (e) => {
        e.stopPropagation();
        handleEdit(role);
      },
    });

    if (canEdit) {
      actions.push({
        id: 'assign',
        label: t('roles.assignUser'),
        icon: UserPlus,
        onClick: (e) => {
          e.stopPropagation();
          navigate(`/system/administration/users/create?roleId=${role.id}`);
        },
      });
    }

    return actions;
  }, [canEdit, handleEdit, navigate, t]);

  // Column definitions
  const roleColumns: ColumnDef<RoleListItem>[] = useMemo(() => [
    {
      id: 'roleName',
      accessorKey: 'roleName',
      header: () => (<span className="flex items-center gap-1.5"><Type className="w-3.5 h-3.5" />{t('roles.roleName')}</span>),
      size: 250,
      minSize: 180,
      maxSize: 400,
      cell: ({ row }) => {
        const role = row.original;
        return (
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 flex-shrink-0 text-[var(--color-accent)]" />
            <div>
              <p className="text-[var(--color-text)]">{role.roleName}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'usersCount',
      accessorKey: 'usersCount',
      header: () => (<span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{t('roles.usersCount')}</span>),
      size: 100,
      minSize: 80,
      maxSize: 130,
      cell: ({ getValue }) => {
        const count = (getValue() as number) || 0;
        return (
          <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
            <Users className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            {count} user{count !== 1 ? 's' : ''}
          </span>
        );
      },
    },
    {
      id: 'isProtected',
      accessorKey: 'isProtected',
      header: () => (<span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />{t('common.type')}</span>),
      size: 120,
      minSize: 90,
      maxSize: 160,
      cell: ({ getValue }) => {
        const isProtected = getValue() as string;
        return isProtected === 'true' ? (
          <Badge className="border" style={{ backgroundColor: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', borderColor: 'var(--badge-warning-border)' }}>
            <Lock className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
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
      header: () => (<span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />{t('common.status')}</span>),
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
      header: () => (<span className="flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" />{t('common.actions')}</span>),
      size: 160,
      minSize: 120,
      maxSize: 200,
      enableResizing: false,
      cell: ({ row }) => {
        const role = row.original;
        return (
          <ActionButtonGroup
            actions={getActionButtons(role)}
            size="md"
          />
        );
      },
    },
  ], [getActionButtons, t, isRTL]);

  // Show loading while checking permissions
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  // Redirect if no access (Level 0)
  if (!canAccess) {
    return <Navigate to="/system/dashboard" replace />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-[var(--color-accent)]" />
            <h1 className="text-3xl font-bold text-[var(--color-text)]">
              {t('roles.systemRoles')}
            </h1>
          </div>
          {canEdit && (
            <Button onClick={handleOpenCreatePage} className="btn-primary">
              <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('roles.createSystemRole')}
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
      <Card className="card-panel border">
        <CardContent className="pt-6">
          {isLoadingRoles ? (
            <TableSkeleton rows={6} columns={5} showHeader />
          ) : error ? (
            <ErrorState
              title={t('roles.errorLoadingRoles')}
              message={(error as Error)?.message || t('roles.failedToLoadRoles')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          ) : filteredRoles.length === 0 ? (
            <EmptyState
              icon={Shield}
              title={searchQuery ? t('roles.noMatchingRoles') : t('roles.noSystemRolesYet')}
              description={searchQuery ? t('roles.tryAdjustingSearch') : t('roles.createFirstRole')}
              action={!searchQuery && canEdit ? {
                label: t('roles.createSystemRole'),
                onClick: handleOpenCreatePage,
                icon: Plus,
              } : undefined}
            />
          ) : (
            <AdvancedDataTable<RoleListItem>
              tableId="system-roles-table"
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
              emptyMessage={t('roles.noSystemRolesFound')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
