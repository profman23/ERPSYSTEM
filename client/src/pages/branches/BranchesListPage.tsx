import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Plus, Search, Loader2, Pencil, Filter, ChevronDown, Type, Hash, Users, Activity, Settings, Contact } from 'lucide-react';
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
import { useBranches, useAllBranches, useBusinessLines, useTenants, useTenantQuota } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScreenPermission } from '@/hooks/useScreenPermission';

interface BranchRecord {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  district?: string;
  buildingNumber?: string;
  vatRegistrationNumber?: string;
  commercialRegistrationNumber?: string;
  email?: string;
  phone?: string;
  userCount?: number;
  isActive: boolean;
}

const getStatusStyle = (isActive: boolean) => {
  return isActive
    ? { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' }
    : { backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' };
};

const SCREEN_CODE = 'BRANCHES';

export default function BranchesListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { canAccess, canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);
  
  const tenantIdFromParams = searchParams.get('tenantId');
  const businessLineIdFromParams = searchParams.get('businessLineId');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState(tenantIdFromParams || user?.tenantId || '');
  const [selectedBusinessLineId, setSelectedBusinessLineId] = useState(businessLineIdFromParams || '');
  
  const isSystemUser = user?.accessScope === 'system';
  const effectiveTenantId = isSystemUser ? selectedTenantId : user?.tenantId;
  const { data: tenants } = useTenants(isSystemUser);
  const { data: businessLines, isLoading: loadingBusinessLines } = useBusinessLines(selectedTenantId || undefined);
  // Load branches filtered by business line if selected, otherwise load ALL branches for the tenant
  const { data: blBranches, isLoading: loadingBlBranches, error: blError } = useBranches(selectedBusinessLineId || undefined);
  const { data: allBranches, isLoading: loadingAllBranches, error: allError } = useAllBranches(
    !selectedBusinessLineId ? (effectiveTenantId || undefined) : undefined
  );
  const branches = selectedBusinessLineId ? blBranches : allBranches;
  const isLoading = selectedBusinessLineId ? loadingBlBranches : loadingAllBranches;
  const error = selectedBusinessLineId ? blError : allError;
  const { data: quota } = useTenantQuota(effectiveTenantId || undefined);
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  // Fail-safe: when quota API fails (undefined), disable Add button to prevent exceeding limits
  const isAtBranchLimit = quota ? quota.branches.used >= quota.branches.limit : !isSystemUser;

  useEffect(() => {
    if (selectedTenantId !== tenantIdFromParams) {
      setSelectedBusinessLineId('');
    }
  }, [selectedTenantId]);

  const tenantOptions = useMemo(() => {
    if (!tenants) return [];
    return tenants.map(t => ({ value: t.id, label: `${t.name} (${t.code})` }));
  }, [tenants]);

  const businessLineOptions = useMemo(() => {
    if (!businessLines) return [];
    return businessLines.map(bl => ({ value: bl.id, label: `${bl.name} (${bl.code})` }));
  }, [businessLines]);

  const filteredBranches = useMemo(() => {
    if (!branches) return [];
    if (!searchQuery) return branches;
    const query = searchQuery.toLowerCase();
    return branches.filter(
      (branch) =>
        branch.name.toLowerCase().includes(query) ||
        branch.code.toLowerCase().includes(query) ||
        branch.city?.toLowerCase().includes(query) ||
        branch.country?.toLowerCase().includes(query) ||
        branch.district?.toLowerCase().includes(query) ||
        branch.vatRegistrationNumber?.toLowerCase().includes(query)
    );
  }, [branches, searchQuery]);

  const handleEditBranch = useCallback((branch: BranchRecord) => {
    navigate(`/app/administration/branches/${branch.id}/edit`);
  }, [navigate]);

  const branchColumns = useMemo<ColumnDef<BranchRecord, unknown>[]>(() => [
    {
      id: 'name',
      accessorKey: 'name',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Type} emoji="🔤" className="w-3.5 h-3.5" />
          {t('common.name')}
        </span>
      ),
      size: 250,
      minSize: 180,
      maxSize: 350,
      cell: ({ row }) => (
        <span>{row.original.name}</span>
      ),
    },
    {
      id: 'code',
      accessorKey: 'code',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" />
          {t('common.code')}
        </span>
      ),
      size: 130,
      minSize: 100,
      maxSize: 180,
      cell: ({ row }) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>{row.original.code}</span>
      ),
    },
    {
      id: 'location',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={MapPin} emoji="📍" className="w-3.5 h-3.5" />
          {t('branches.location')}
        </span>
      ),
      size: 200,
      minSize: 150,
      maxSize: 300,
      cell: ({ row }) => (
        <span>
          {[row.original.city, row.original.country].filter(Boolean).join(', ') || '-'}
        </span>
      ),
    },
    {
      id: 'contact',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Contact} emoji="📇" className="w-3.5 h-3.5" />
          {t('branches.contact')}
        </span>
      ),
      size: 180,
      minSize: 130,
      maxSize: 250,
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.email && <p>{row.original.email}</p>}
          {row.original.phone && <p style={{ color: 'var(--color-text-secondary)' }}>{row.original.phone}</p>}
          {!row.original.email && !row.original.phone && (
            <span style={{ color: 'var(--color-text-muted)' }}>-</span>
          )}
        </div>
      ),
    },
    {
      id: 'userCount',
      accessorKey: 'userCount',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Users} emoji="👥" className="w-3.5 h-3.5" />
          {t('branches.users')}
        </span>
      ),
      size: 100,
      minSize: 80,
      maxSize: 130,
      cell: ({ row }) => (
        <div className="text-center">{row.original.userCount ?? '-'}</div>
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
      size: 100,
      minSize: 80,
      maxSize: 120,
      enableResizing: false,
      cell: ({ row }) => {
        const branch = row.original;
        if (!canModify) return null;
        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleEditBranch(branch); }}
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
  ], [handleEditBranch, canModify]);

  const handleTenantChange = (newTenantId: string) => {
    setSelectedTenantId(newTenantId);
    const params = new URLSearchParams(searchParams);
    if (newTenantId) {
      params.set('tenantId', newTenantId);
    } else {
      params.delete('tenantId');
    }
    params.delete('businessLineId');
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
    setSearchParams(params);
  };

  if (permissionsLoading) {
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
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <StyledIcon icon={MapPin} emoji="📍" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
                {t('branches.title')}
              </h1>
              {quota && (
                <span
                  className="text-sm px-3 py-1 rounded-full border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  {quota.branches.used} / {quota.branches.limit >= 999999 ? '∞' : quota.branches.limit}
                </span>
              )}
            </div>
          </div>
          {canModify && (isAtBranchLimit ? (
            <Button disabled title={t('branches.createBranch')}>
              <Plus className="w-4 h-4 mr-2" />
              {t('branches.createBranch')}
            </Button>
          ) : (
            <Link to={`/branches/create${selectedBusinessLineId ? `?businessLineId=${selectedBusinessLineId}` : ''}`}>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('branches.createBranch')}
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
                  placeholder={t('branches.searchBranches')}
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
                {(selectedTenantId || selectedBusinessLineId) && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: 'var(--badge-info-bg)', color: 'var(--badge-info-text)' }}
                  >
                    {[selectedTenantId, selectedBusinessLineId].filter(Boolean).length}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {filtersOpen && (
              <div className="animate-in slide-in-from-top-1 duration-200">
                <div className="flex gap-4 flex-wrap">
                  {user?.accessScope === 'system' && tenantOptions.length > 0 && (
                    <div className="w-56">
                      <SimpleSelect
                        value={selectedTenantId}
                        onValueChange={handleTenantChange}
                        options={tenantOptions}
                        placeholder={t('branches.selectTenant')}
                      />
                    </div>
                  )}
                  <div className="w-56">
                    <SimpleSelect
                      value={selectedBusinessLineId}
                      onValueChange={handleBusinessLineChange}
                      options={businessLineOptions}
                      disabled={loadingBusinessLines}
                      placeholder={loadingBusinessLines ? t('branches.loadingBusinessLines') : t('branches.selectBusinessLine')}
                    />
                  </div>
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
            <TableSkeleton rows={6} columns={5} showHeader />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title={t('branches.errorLoadingBranches')}
              message={(error as any)?.message || t('branches.failedToLoadBranches')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={MapPin}
              title={searchQuery ? t('branches.noMatchingBranches') : t('branches.noBranchesYet')}
              description={searchQuery ? t('branches.tryAdjustingSearch') : t('branches.createFirstBranch')}
              action={!searchQuery ? {
                label: t('branches.addBranch'),
                onClick: () => navigate('/branches/create'),
                icon: Plus,
              } : undefined}
            />
          </div>
        ) : (
          <AdvancedDataTable<BranchRecord>
            tableId="branches-list-table"
            data={filteredBranches as BranchRecord[]}
            columns={branchColumns}
            autoHeight={true}
            minHeight={400}
            rowHeight={48}
            enableColumnResize={true}
            enableColumnReorder={true}
            enableSorting={false}
            emptyMessage={t('branches.noBranchesFound')}
          />
        )}
      </div>

    </div>
  );
}
