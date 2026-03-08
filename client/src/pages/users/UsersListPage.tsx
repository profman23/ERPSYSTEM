import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Search, Loader2, Filter, ChevronDown, Pencil, Ban, CheckCircle2, Type, Mail, Phone, Building2, Activity, Settings, Shield } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { AdvancedDataTable } from '@/components/ui/AdvancedDataTable';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/Pagination';
import { useUsers, useBranches, useBusinessLines, useTenants, useTenantQuota } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';
import { useScopePath } from '@/hooks/useScopePath';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { apiClient } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useScreenPermission } from '@/hooks/useScreenPermission';

interface UserRecord {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  code?: string;
  phone?: string;
  accessScope?: string;
  status?: string;
  isActive?: boolean;
  roleCount?: number;
  tenantId?: string;
  tenantName?: string;
  dpfRoleName?: string | null;
  dpfRoleCode?: string | null;
  role?: string;
}

const getStatusStyle = (isActive: boolean) => {
  if (isActive) {
    return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' };
  }
  return { backgroundColor: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', borderColor: 'var(--badge-danger-border)' };
};

const SCREEN_CODE = 'USERS';

export default function UsersListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const { getUsersCreatePath, getPath } = useScopePath();
  const { canAccess, canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);

  const tenantIdFromParams = searchParams.get('tenantId');
  const businessLineIdFromParams = searchParams.get('businessLineId');
  const branchIdFromParams = searchParams.get('branchId');

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isSystemUser = currentUser?.accessScope === 'system';
  const [selectedTenantId, setSelectedTenantId] = useState(tenantIdFromParams || currentUser?.tenantId || '');
  const [selectedBusinessLineId, setSelectedBusinessLineId] = useState(businessLineIdFromParams || '');
  const [selectedBranchId, setSelectedBranchId] = useState(branchIdFromParams || '');

  const { data: tenants } = useTenants(isSystemUser);
  const { data: businessLines } = useBusinessLines(selectedTenantId || undefined);
  const { data: branches } = useBranches(selectedBusinessLineId || undefined);
  const { data: quota } = useTenantQuota(selectedTenantId || currentUser?.tenantId || undefined);

  // Fail-safe: when quota API fails (undefined), disable Add button to prevent exceeding limits
  const isAtUserLimit = quota ? quota.users.used >= quota.users.limit : !isSystemUser;

  // Debounce search — 300ms per CLAUDE.md
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const userFilters = useMemo(() => {
    const filters: { tenantId?: string; businessLineId?: string; branchId?: string; page?: number; limit?: number; search?: string } = {};
    if (selectedTenantId) filters.tenantId = selectedTenantId;
    if (selectedBusinessLineId) filters.businessLineId = selectedBusinessLineId;
    if (selectedBranchId) filters.branchId = selectedBranchId;
    filters.page = page;
    filters.limit = pageSize;
    if (debouncedSearch) filters.search = debouncedSearch;
    const fallbackTenantId = selectedTenantId || currentUser?.tenantId || undefined;
    if (!filters.tenantId && fallbackTenantId) filters.tenantId = fallbackTenantId;
    return filters;
  }, [selectedTenantId, selectedBusinessLineId, selectedBranchId, currentUser?.tenantId, page, pageSize, debouncedSearch]);

  const { data: usersResponse, isLoading, error } = useUsers(userFilters);
  const users = usersResponse?.data ?? [];
  const pagination = usersResponse?.pagination;
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  useEffect(() => {
    if (selectedTenantId !== tenantIdFromParams) {
      setSelectedBusinessLineId('');
      setSelectedBranchId('');
    }
  }, [selectedTenantId]);

  useEffect(() => {
    if (selectedBusinessLineId !== businessLineIdFromParams) {
      setSelectedBranchId('');
    }
  }, [selectedBusinessLineId]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedTenantId, selectedBusinessLineId, selectedBranchId]);

  const tenantOptions = useMemo(() => {
    if (!tenants) return [];
    return tenants.map(t => ({ value: t.id, label: `${t.name} (${t.code})` }));
  }, [tenants]);

  const businessLineOptions = useMemo(() => {
    if (!businessLines) return [];
    return businessLines.map(bl => ({ value: bl.id, label: `${bl.name} (${bl.code})` }));
  }, [businessLines]);

  const branchOptions = useMemo(() => {
    if (!branches) return [];
    return branches.map(b => ({ value: b.id, label: `${b.name} (${b.code})` }));
  }, [branches]);

  const handleTenantChange = (newTenantId: string) => {
    setSelectedTenantId(newTenantId);
    const params = new URLSearchParams(searchParams);
    if (newTenantId) {
      params.set('tenantId', newTenantId);
    } else {
      params.delete('tenantId');
    }
    params.delete('businessLineId');
    params.delete('branchId');
    setSearchParams(params);
  };

  const handleBusinessLineChange = (newBLId: string) => {
    setSelectedBusinessLineId(newBLId);
    const params = new URLSearchParams(searchParams);
    if (newBLId) {
      params.set('businessLineId', newBLId);
    } else {
      params.delete('businessLineId');
    }
    params.delete('branchId');
    setSearchParams(params);
  };

  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranchId(newBranchId);
    const params = new URLSearchParams(searchParams);
    if (newBranchId) {
      params.set('branchId', newBranchId);
    } else {
      params.delete('branchId');
    }
    setSearchParams(params);
  };

  const handleEditUser = useCallback((user: UserRecord) => {
    navigate(getPath(`administration/users/${user.id}/edit`));
  }, [navigate, getPath]);

  const handleToggleStatus = useCallback(async (user: UserRecord) => {
    setTogglingUserId(user.id);
    try {
      await apiClient.patch(`/tenant/users/${user.id}/status`, { isActive: !user.isActive });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    } catch {
      // silently fail - user will see the state didn't change
    } finally {
      setTogglingUserId(null);
    }
  }, [queryClient]);

  const activeFilterCount = [selectedTenantId, selectedBusinessLineId, selectedBranchId].filter(Boolean).length;

  const userColumns: ColumnDef<UserRecord>[] = useMemo(() => {
    const cols: ColumnDef<UserRecord>[] = [
      {
        id: 'name',
        accessorKey: 'name',
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={Type} emoji="🔤" className="w-3.5 h-3.5" />
            {t('users.name')}
          </span>
        ),
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
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={Mail} emoji="📧" className="w-3.5 h-3.5" />
            {t('users.email')}
          </span>
        ),
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
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={Phone} emoji="📱" className="w-3.5 h-3.5" />
            {t('users.phone')}
          </span>
        ),
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
        id: 'role',
        accessorKey: 'dpfRoleName',
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={Shield} emoji="🛡️" className="w-3.5 h-3.5" />
            {t('users.role')}
          </span>
        ),
        size: 160,
        minSize: 120,
        maxSize: 240,
        cell: ({ row }) => {
          const roleName = row.original.dpfRoleName || row.original.role;
          return (
            <span className="text-sm" style={{ color: roleName ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
              {roleName || '-'}
            </span>
          );
        },
      },
    ];

    // Tenant column — only for system users
    if (isSystemUser) {
      cols.push({
        id: 'tenantName',
        accessorKey: 'tenantName',
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={Building2} emoji="🏢" className="w-3.5 h-3.5" />
            {t('users.tenant')}
          </span>
        ),
        size: 180,
        minSize: 120,
        maxSize: 280,
        cell: ({ row }) => {
          const user = row.original;
          return (
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {user.tenantName || 'System'}
            </span>
          );
        },
      });
    }

    cols.push(
      {
        id: 'status',
        accessorKey: 'isActive',
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={Activity} emoji="📈" className="w-3.5 h-3.5" />
            {t('users.status')}
          </span>
        ),
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
        header: () => (
          <span className="flex items-center gap-1.5">
            <StyledIcon icon={Settings} emoji="⚙️" className="w-3.5 h-3.5" />
            {t('users.actions')}
          </span>
        ),
        size: 100,
        minSize: 80,
        maxSize: 120,
        enableResizing: false,
        cell: ({ row }) => {
          const user = row.original;
          const isActive = user.isActive !== false;
          const isToggling = togglingUserId === user.id;

          if (!canModify) return null;

          return (
            <div className="flex items-center gap-1">
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
            </div>
          );
        },
      },
    );

    return cols;
  }, [togglingUserId, handleEditUser, handleToggleStatus, canModify, isSystemUser]);

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canAccess) {
    return <Navigate to={getPath('dashboard')} replace />;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StyledIcon icon={Users} emoji="👥" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {t('users.title')}
            </h1>
            {quota && (
              <span
                className="text-sm px-3 py-1 rounded-full border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {quota.users.used} / {quota.users.limit >= 999999 ? '\u221E' : quota.users.limit}
              </span>
            )}
          </div>
          {canModify && (isAtUserLimit ? (
            <Button disabled title={t('users.createUser')}>
              <Plus className="w-4 h-4 mr-2" />
              {t('users.createUser')}
            </Button>
          ) : (
            <Link to={getUsersCreatePath(selectedBranchId ? `branchId=${selectedBranchId}` : undefined)}>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('users.createUser')}
              </Button>
            </Link>
          ))}
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                <Input
                  placeholder={t('users.searchUsers')}
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
                  {isSystemUser && tenantOptions.length > 0 && (
                    <div className="w-56">
                      <SimpleSelect
                        value={selectedTenantId}
                        onValueChange={handleTenantChange}
                        options={[{ value: '', label: t('users.allTenants') }, ...tenantOptions]}
                        placeholder={t('users.allTenants')}
                      />
                    </div>
                  )}
                  {businessLineOptions.length > 0 && (
                    <div className="w-56">
                      <SimpleSelect
                        value={selectedBusinessLineId}
                        onValueChange={handleBusinessLineChange}
                        options={[{ value: '', label: t('users.allBusinessLines') }, ...businessLineOptions]}
                        placeholder={t('users.allBusinessLines')}
                      />
                    </div>
                  )}
                  {branchOptions.length > 0 && (
                    <div className="w-56">
                      <SimpleSelect
                        value={selectedBranchId}
                        onValueChange={handleBranchChange}
                        options={[{ value: '', label: t('users.allBranches') }, ...branchOptions]}
                        placeholder={t('users.allBranches')}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={6} columns={6} showHeader />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title={t('users.errorLoadingUsers')}
              message={(error as Error)?.message || t('users.failedToLoadUsers')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          </div>
        ) : users.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title={debouncedSearch ? t('users.noMatchingUsers') : t('users.noUsersYet')}
              description={debouncedSearch ? t('users.tryAdjustingSearch') : t('users.createFirstUser')}
              action={!debouncedSearch ? {
                label: t('users.addUser'),
                onClick: () => navigate(getUsersCreatePath()),
                icon: Plus,
              } : undefined}
            />
          </div>
        ) : (
          <>
            <AdvancedDataTable<UserRecord>
              tableId="app-users-list-table"
              data={users as UserRecord[]}
              columns={userColumns}
              autoHeight={true}
              minHeight={400}
              rowHeight={48}
              enableColumnResize={true}
              enableColumnReorder={true}
              enableSorting={false}
              emptyMessage={t('users.noUsersFound')}
            />

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 0 && (
              <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                  pageSizeOptions={[10, 50, 100]}
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
