import { useState, useMemo, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Users, Plus, Search, Shield, Building2, Loader2, Filter, ChevronDown, ChevronRight, Pencil, Ban, CheckCircle2, Type, Mail, Phone, Activity, Settings } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { usePermissions } from '@/hooks/usePermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

const SCREEN_CODE = 'SYSTEM_USER_LIST';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAllUsers, useTenants } from '@/hooks/useHierarchy';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { AdvancedDataTable } from '@/components/ui/AdvancedDataTable';
import { FilterGroup, FilterConfig } from '@/components/ui/FilterGroup';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { apiClient } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';


interface UserRecord {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  code?: string;
  phone?: string;
  avatarUrl?: string;
  accessScope?: string;
  status?: string;
  isActive?: boolean;
  roleCount?: number;
  tenantId?: string;
  tenantName?: string;
  tenantCode?: string;
  dpfRoleId?: string;
  dpfRoleName?: string;
  dpfRoleCode?: string;
}

const getStatusStyle = (isActive: boolean) => {
  if (isActive) {
    return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' };
  }
  return { backgroundColor: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', borderColor: 'var(--badge-danger-border)' };
};

export default function SystemUsersListPage() {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = Object.values(filterValues).filter(v => v !== undefined && v !== '' && v !== null).length;
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const { canAccessScreen, canModifyScreen, loading: permissionsLoading } = usePermissions();
  const canAccess = canAccessScreen(SCREEN_CODE);
  const canEdit = canModifyScreen(SCREEN_CODE);

  const { data: users, isLoading, error } = useAllUsers();
  const { data: tenants } = useTenants();

  const tenantOptions = useMemo(() => {
    if (!tenants) return [];
    return tenants.map(t => ({ value: t.id, label: `${t.name} (${t.code})` }));
  }, [tenants]);

  const filterConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'tenant',
      label: t('users.tenant'),
      type: 'select',
      options: tenantOptions,
      placeholder: t('users.allTenants'),
    },
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
  ], [tenantOptions, t]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    let result = users;

    if (filterValues.tenant) {
      result = result.filter(u => u.tenantId === filterValues.tenant);
    }

    if (filterValues.status) {
      const isActive = filterValues.status === 'active';
      result = result.filter(u => u.isActive === isActive);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.name?.toLowerCase().includes(query) ||
          u.firstName?.toLowerCase().includes(query) ||
          u.lastName?.toLowerCase().includes(query) ||
          u.tenantCode?.toLowerCase().includes(query) ||
          u.phone?.toLowerCase().includes(query)
      );
    }

    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let aVal = '';
        let bVal = '';

        if (sortColumn === 'name') {
          aVal = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email;
          bVal = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email;
        } else {
          aVal = String((a as unknown as Record<string, unknown>)[sortColumn] || '');
          bVal = String((b as unknown as Record<string, unknown>)[sortColumn] || '');
        }

        const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [users, searchQuery, filterValues, sortColumn, sortDirection]);

  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  }, []);

  const handleEditUser = useCallback((user: UserRecord) => {
    const type = user.accessScope === 'system' ? 'system' : 'tenant_admin';
    navigate(`/system/administration/users/${user.id}/edit?type=${type}`);
  }, [navigate]);

  const handleToggleStatus = useCallback(async (user: UserRecord) => {
    setTogglingUserId(user.id);
    try {
      await apiClient.put(`/system/users/${user.id}`, { isActive: !user.isActive });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch {
      // silently fail - user will see the state didn't change
    } finally {
      setTogglingUserId(null);
    }
  }, [queryClient]);

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (!canAccess) {
    return <Navigate to="/system/dashboard" replace />;
  }

  const userColumns: ColumnDef<UserRecord>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: () => (<span className="flex items-center gap-1.5"><Type className="w-3.5 h-3.5" />{t('common.name')}</span>),
      size: 200,
      minSize: 150,
      maxSize: 300,
      cell: ({ row }) => {
        const user = row.original;
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email.split('@')[0];
        return (
          <span className="text-sm" style={{ color: 'var(--color-text)' }}>{fullName}</span>
        );
      },
    },
    {
      id: 'email',
      accessorKey: 'email',
      header: () => (<span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{t('users.email')}</span>),
      size: 240,
      minSize: 180,
      maxSize: 350,
      cell: ({ getValue }) => (
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{getValue() as string}</span>
      ),
    },
    {
      id: 'phone',
      accessorKey: 'phone',
      header: () => (<span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{t('users.phone')}</span>),
      size: 150,
      minSize: 120,
      maxSize: 200,
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined;
        return value ? (
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{value}</span>
        ) : (
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>-</span>
        );
      },
    },
    {
      id: 'tenantCode',
      accessorKey: 'tenantCode',
      header: () => (<span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{t('users.tenant')}</span>),
      size: 160,
      minSize: 120,
      maxSize: 220,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <span className="text-sm font-mono" style={{ color: 'var(--color-text-secondary)' }}>
            {user.tenantCode || 'SYSTEM'}
          </span>
        );
      },
    },
    {
      id: 'status',
      accessorKey: 'isActive',
      header: () => (<span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />{t('common.status')}</span>),
      size: 100,
      minSize: 80,
      maxSize: 130,
      cell: ({ row }) => {
        const isActive = row.original.isActive !== false;
        return (
          <Badge className="border text-xs" style={getStatusStyle(isActive)}>
            {isActive ? t('common.active') : t('common.inactive')}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: () => (<span className="flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" />{t('common.actions')}</span>),
      size: 100,
      minSize: 80,
      maxSize: 120,
      enableResizing: false,
      cell: ({ row }) => {
        const user = row.original;
        const isActive = user.isActive !== false;
        const isToggling = togglingUserId === user.id;

        return (
          <div className="flex items-center gap-1">
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleEditUser(user); }}
                  className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                  title={t('common.edit')}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleToggleStatus(user); }}
                  disabled={isToggling}
                  className="w-8 h-8 rounded-md flex items-center justify-center transition-colors disabled:opacity-50"
                  style={{ color: isActive ? 'var(--color-danger)' : 'var(--color-success)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title={isActive ? t('users.disable') : t('users.enable')}
                >
                  {isToggling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isActive ? (
                    <Ban className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-[var(--color-accent)]" />
            <h1 className="text-3xl font-bold text-[var(--color-text)]">{t('users.platformUsers')}</h1>
          </div>
          {canEdit && (
            <Button onClick={() => setShowTypeModal(true)} className="btn-primary">
              <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('users.addUser')}
            </Button>
          )}
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      <Card className="card-panel border">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <Input
                  placeholder={t('users.searchUsers')}
                  className="pl-10 input-panel"
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

      <Card className="card-panel border">
        <CardContent className="pt-6">
          {isLoading ? (
            <TableSkeleton rows={6} columns={6} showHeader />
          ) : error ? (
            <ErrorState
              title={t('users.errorLoadingUsers')}
              message={(error as Error)?.message || t('users.failedToLoadUsers')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={searchQuery ? t('users.noMatchingUsers') : t('users.noUsersYet')}
              description={searchQuery ? t('users.tryAdjustingSearch') : t('users.createFirstUser')}
              action={!searchQuery && canEdit ? {
                label: t('users.addUser'),
                onClick: () => setShowTypeModal(true),
                icon: Plus,
              } : undefined}
            />
          ) : (
            <AdvancedDataTable<UserRecord>
              tableId="system-users-table"
              data={filteredUsers as UserRecord[]}
              columns={userColumns}
              autoHeight={true}
              minHeight={400}
              rowHeight={48}
              enableColumnResize={true}
              enableColumnReorder={true}
              enableSorting={true}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              emptyMessage={t('users.noUsersFound')}
            />
          )}
        </CardContent>
      </Card>

      {/* User Type Selection Modal */}
      <Dialog open={showTypeModal} onOpenChange={setShowTypeModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('users.selectUserType')}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-1">
            <button
              type="button"
              onClick={() => {
                setShowTypeModal(false);
                navigate('/system/administration/users/create?type=system');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors"
              style={{ color: 'var(--color-text)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Shield className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
              <span className="flex-1 text-sm font-medium">{t('users.systemUser')}</span>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTypeModal(false);
                navigate('/system/administration/users/create?type=tenant_admin');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors"
              style={{ color: 'var(--color-text)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Building2 className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
              <span className="flex-1 text-sm font-medium">{t('users.tenantAdmin')}</span>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
