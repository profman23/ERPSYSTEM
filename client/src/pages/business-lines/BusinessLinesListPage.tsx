import { useState, useMemo, useCallback } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GitBranch, Plus, Search, Loader2, Pencil, Filter, ChevronDown, Briefcase, Type, Hash, Tag, Contact, Activity, Settings } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { useBusinessLines, useTenants, useTenantQuota } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { AdvancedDataTable } from '@/components/ui/AdvancedDataTable';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useScreenPermission } from '@/hooks/useScreenPermission';

interface BusinessLineRecord {
  id: string;
  name: string;
  code: string;
  businessLineType: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  branchCount?: number;
  isActive: boolean;
}

const typeLabels: Record<string, string> = {
  veterinary_clinic: 'Veterinary Clinic',
  pet_store: 'Pet Store',
  grooming: 'Grooming',
  boarding: 'Boarding',
  general: 'General',
};

const getStatusStyle = (isActive: boolean) => {
  return isActive
    ? { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' }
    : { backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' };
};

const SCREEN_CODE = 'BUSINESS_LINES';

export default function BusinessLinesListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { canAccess, canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);

  const tenantIdFromParams = searchParams.get('tenantId');
  const tenantId = tenantIdFromParams || user?.tenantId || undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isSystemUser = user?.accessScope === 'system';
  const { data: tenants } = useTenants(isSystemUser);
  const { data: businessLines, isLoading, error } = useBusinessLines(tenantId);
  const { data: quota } = useTenantQuota(tenantId);
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  // Fail-safe: when quota API fails (undefined), disable Add button to prevent exceeding limits
  const isAtBusinessLineLimit = quota ? quota.businessLines.used >= quota.businessLines.limit : !isSystemUser;

  const tenantOptions = useMemo(() => {
    if (!tenants) return [];
    return tenants.map(t => ({ value: t.id, label: `${t.name} (${t.code})` }));
  }, [tenants]);

  const filteredBusinessLines = useMemo(() => {
    if (!businessLines) return [];
    if (!searchQuery) return businessLines;
    const query = searchQuery.toLowerCase();
    return businessLines.filter(
      (bl) =>
        bl.name.toLowerCase().includes(query) ||
        bl.code.toLowerCase().includes(query) ||
        bl.businessLineType?.toLowerCase().includes(query)
    );
  }, [businessLines, searchQuery]);

  const handleRowClick = useCallback((bl: BusinessLineRecord) => {
    if (canModify) {
      navigate(`/app/administration/business-lines/${bl.id}/edit`);
    }
  }, [navigate, canModify]);

  const handleEditBL = useCallback((bl: BusinessLineRecord) => {
    navigate(`/app/administration/business-lines/${bl.id}/edit`);
  }, [navigate]);

  const blColumns: ColumnDef<BusinessLineRecord>[] = useMemo(() => [
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
        <p>{row.original.name}</p>
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
      cell: ({ getValue }) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {String(getValue() || '')}
        </span>
      ),
    },
    {
      id: 'businessLineType',
      accessorKey: 'businessLineType',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Tag} emoji="🏷️" className="w-3.5 h-3.5" />
          {t('common.type')}
        </span>
      ),
      size: 160,
      minSize: 120,
      maxSize: 220,
      cell: ({ getValue }) => {
        const value = String(getValue() || '');
        return <span>{typeLabels[value] || value}</span>;
      },
    },
    {
      id: 'contact',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Contact} emoji="📇" className="w-3.5 h-3.5" />
          Contact
        </span>
      ),
      size: 180,
      minSize: 130,
      maxSize: 250,
      cell: ({ row }) => {
        const bl = row.original;
        return (
          <div className="text-sm">
            {bl.contactEmail && <p>{bl.contactEmail}</p>}
            {bl.contactPhone && <p style={{ color: 'var(--color-text-muted)' }}>{bl.contactPhone}</p>}
            {!bl.contactEmail && !bl.contactPhone && <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
          </div>
        );
      },
    },
    {
      id: 'branchCount',
      accessorKey: 'branchCount',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={GitBranch} emoji="🌿" className="w-3.5 h-3.5" />
          Branches
        </span>
      ),
      size: 100,
      minSize: 80,
      maxSize: 130,
      cell: ({ getValue }) => (
        <div className="text-center">{getValue() != null ? String(getValue()) : '-'}</div>
      ),
    },
    {
      id: 'isActive',
      accessorKey: 'isActive',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Activity} emoji="📈" className="w-3.5 h-3.5" />
          {t('common.status')}
        </span>
      ),
      size: 110,
      minSize: 90,
      maxSize: 150,
      cell: ({ getValue }) => {
        const isActive = Boolean(getValue());
        return (
          <Badge className="border" style={getStatusStyle(isActive)}>
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
          {t('common.actions')}
        </span>
      ),
      size: 100,
      minSize: 80,
      maxSize: 120,
      enableResizing: false,
      cell: ({ row }) => {
        const bl = row.original;
        if (!canModify) return null;
        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleEditBL(bl); }}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ], [handleEditBL, canModify]);

  const handleTenantChange = (newTenantId: string) => {
    if (newTenantId) {
      setSearchParams({ tenantId: newTenantId });
    } else {
      setSearchParams({});
    }
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
              <StyledIcon icon={Briefcase} emoji="💼" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
                {t('businessLines.title')}
              </h1>
              {quota && (
                <span
                  className="text-sm px-3 py-1 rounded-full border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  {quota.businessLines.used} / {quota.businessLines.limit >= 999999 ? '\u221E' : quota.businessLines.limit}
                </span>
              )}
            </div>
          </div>
          {canModify && (isAtBusinessLineLimit ? (
            <Button disabled title={t('businessLines.createBusinessLine')}>
              <Plus className="w-4 h-4 mr-2" />
              {t('businessLines.createBusinessLine')}
            </Button>
          ) : (
            <Link to={`/business-lines/create${tenantId ? `?tenantId=${tenantId}` : ''}`}>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('businessLines.createBusinessLine')}
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
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <Input
                  placeholder={t('businessLines.searchBusinessLines')}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {user?.accessScope === 'system' && tenantOptions.length > 0 && (
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
                  {tenantId && (
                    <span
                      className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: 'var(--badge-info-bg)', color: 'var(--badge-info-text)' }}
                    >
                      1
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {filtersOpen && user?.accessScope === 'system' && tenantOptions.length > 0 && (
              <div className="animate-in slide-in-from-top-1 duration-200">
                <div className="w-64">
                  <SimpleSelect
                    value={tenantId || ''}
                    onValueChange={handleTenantChange}
                    options={[{ value: '', label: 'All Tenants' }, ...tenantOptions]}
                    placeholder="All Tenants"
                  />
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
              title="Error Loading Business Lines"
              message={(error as any)?.message || 'Failed to load business lines. Please try again.'}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          </div>
        ) : filteredBusinessLines.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={GitBranch}
              title={searchQuery ? 'No Matching Business Lines' : 'No Business Lines Yet'}
              description={searchQuery ? 'Try adjusting your search' : 'Create your first business line to get started'}
              action={!searchQuery ? {
                label: 'Add Business Line',
                onClick: () => navigate(`/business-lines/create${tenantId ? `?tenantId=${tenantId}` : ''}`),
                icon: Plus,
              } : undefined}
            />
          </div>
        ) : (
          <AdvancedDataTable<BusinessLineRecord>
            tableId="business-lines-list-table"
            data={filteredBusinessLines as BusinessLineRecord[]}
            columns={blColumns}
            autoHeight={true}
            minHeight={400}
            rowHeight={48}
            onRowClick={handleRowClick}
            enableColumnResize={true}
            enableColumnReorder={true}
            enableSorting={false}
            emptyMessage="No business lines found"
          />
        )}
      </div>
    </div>
  );
}
