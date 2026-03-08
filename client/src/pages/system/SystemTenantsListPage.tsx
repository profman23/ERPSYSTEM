import { useState, useMemo, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Building2, Plus, Search, Eye, Edit, Filter, ChevronDown, Type, Hash, Mail, CreditCard, Activity, Calendar, Settings, Loader2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTenants } from '@/hooks/useHierarchy';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

import { AdvancedDataTable, ActionButtonGroup, ActionButton } from '@/components/ui/AdvancedDataTable';
import { FilterGroup, FilterConfig } from '@/components/ui/FilterGroup';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

interface TenantRecord {
  id: string;
  name: string;
  code: string;
  contactEmail?: string;
  country?: string;
  status?: string;
  subscriptionPlan?: string;
  primaryColor?: string;
  createdAt?: string;
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'active':
      return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' };
    case 'inactive':
      return { backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' };
    case 'suspended':
      return { backgroundColor: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', borderColor: 'var(--badge-danger-border)' };
    case 'pending':
      return { backgroundColor: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', borderColor: 'var(--badge-warning-border)' };
    default:
      return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' };
  }
};

const getPlanStyle = (plan: string) => {
  switch (plan) {
    case 'trial':
      return { backgroundColor: 'var(--badge-default-bg)', color: 'var(--badge-default-text)', borderColor: 'var(--badge-default-border)' };
    case 'standard':
      return { backgroundColor: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', borderColor: 'var(--badge-info-border)' };
    case 'professional':
      return { backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)', borderColor: 'var(--color-accent)' };
    case 'enterprise':
      return { backgroundColor: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', borderColor: 'var(--badge-warning-border)' };
    default:
      return { backgroundColor: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', borderColor: 'var(--badge-info-border)' };
  }
};

const SCREEN_CODE = 'SYSTEM_TENANT_LIST';

export default function SystemTenantsListPage() {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const { canAccess, canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = Object.values(filterValues).filter(v => v !== undefined && v !== '' && v !== null).length;
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { data: tenants, isLoading, error } = useTenants();

  // Filter configuration
  const filterConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: t('common.status'),
      type: 'select',
      options: [
        { value: 'active', label: t('common.active') },
        { value: 'inactive', label: t('common.inactive') },
        { value: 'suspended', label: t('common.suspended') },
        { value: 'pending', label: t('common.pending') },
      ],
      placeholder: t('tenants.allStatuses'),
    },
    {
      key: 'plan',
      label: t('tenants.plan'),
      type: 'select',
      options: [
        { value: 'trial', label: t('tenants.trial') },
        { value: 'standard', label: t('tenants.standard') },
        { value: 'professional', label: t('tenants.professional') },
        { value: 'enterprise', label: t('tenants.enterprise') },
      ],
      placeholder: t('tenants.allPlans'),
    },
  ], [t]);

  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    let result = tenants;

    // Apply status filter
    if (filterValues.status) {
      result = result.filter(t => t.status === filterValues.status);
    }

    // Apply plan filter
    if (filterValues.plan) {
      result = result.filter(t => t.subscriptionPlan === filterValues.plan);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (tenant) =>
          tenant.name.toLowerCase().includes(query) ||
          tenant.code.toLowerCase().includes(query) ||
          tenant.contactEmail?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [tenants, searchQuery, filterValues]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleRowClick = useCallback((tenant: TenantRecord) => {
    navigate(`/system/tenants/${tenant.id}/edit`);
  }, [navigate]);

  // Generate action buttons for a tenant
  const getActionButtons = useCallback((tenant: TenantRecord): ActionButton[] => {
    const actions: ActionButton[] = [];

    if (canModify) {
      actions.push({
        id: 'edit',
        label: t('common.edit'),
        icon: Edit,
        onClick: () => navigate(`/system/tenants/${tenant.id}/edit`),
        variant: 'ghost',
      });
    } else {
      // Read-only users: view button opens edit form in read mode
      actions.push({
        id: 'view',
        label: t('common.view'),
        icon: Eye,
        onClick: () => navigate(`/system/tenants/${tenant.id}/edit`),
        variant: 'ghost',
      });
    }

    return actions;
  }, [navigate, canModify, t]);

  // Define columns using @tanstack/react-table ColumnDef format
  const tenantColumns: ColumnDef<TenantRecord>[] = useMemo(() => [
    {
      id: 'name',
      accessorKey: 'name',
      header: () => (<span className="flex items-center gap-1.5"><Type className="w-3.5 h-3.5" />{t('tenants.organization')}</span>),
      size: 280,
      minSize: 200,
      maxSize: 400,
      cell: ({ row }) => {
        const tenant = row.original;
        return (
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-[var(--color-text-on-accent)]"
              style={{ backgroundColor: tenant.primaryColor || 'var(--color-accent)' }}
            >
              {tenant.name.charAt(0)}
            </div>
            <div>
              <p className="text-[var(--color-text)]">{tenant.name}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'code',
      accessorKey: 'code',
      header: () => (<span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />{t('common.code')}</span>),
      size: 150,
      minSize: 100,
      maxSize: 200,
      cell: ({ getValue }) => (
        <span className="font-mono text-[var(--color-text-secondary)]">
          {String(getValue() || '')}
        </span>
      ),
    },
    {
      id: 'contactEmail',
      accessorKey: 'contactEmail',
      header: () => (<span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{t('tenants.contact')}</span>),
      size: 220,
      minSize: 150,
      maxSize: 300,
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? (
          <span className="text-[var(--color-text-secondary)]">{String(value)}</span>
        ) : (
          <span className="text-[var(--color-text-muted)]">-</span>
        );
      },
    },
    {
      id: 'subscriptionPlan',
      accessorKey: 'subscriptionPlan',
      header: () => (<span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" />{t('tenants.plan')}</span>),
      size: 130,
      minSize: 100,
      maxSize: 180,
      cell: ({ getValue }) => (
        <Badge className="border" style={getPlanStyle(String(getValue() || 'standard'))}>
          {String(getValue() || 'standard')}
        </Badge>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: () => (<span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />{t('common.status')}</span>),
      size: 110,
      minSize: 90,
      maxSize: 150,
      cell: ({ getValue }) => (
        <Badge className="border" style={getStatusStyle(String(getValue() || 'active'))}>
          {String(getValue() || 'active')}
        </Badge>
      ),
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: () => (<span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{t('tenants.created')}</span>),
      size: 130,
      minSize: 100,
      maxSize: 180,
      cell: ({ getValue }) => {
        const value = getValue();
        return (
          <span className="text-[var(--color-text-muted)]">
            {value ? formatDate(String(value)) : '-'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: () => (<span className="flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" />{t('common.actions')}</span>),
      size: 160,
      minSize: 140,
      maxSize: 200,
      enableResizing: false,
      cell: ({ row }) => (
        <ActionButtonGroup
          actions={getActionButtons(row.original)}
          size="md"
          maxVisibleMobile={2}
        />
      ),
    },
  ], [getActionButtons, canModify, t]);

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canAccess) {
    return <Navigate to="/system/dashboard" replace />;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-[var(--color-accent)]" />
            <h1 className="text-3xl font-bold text-[var(--color-text)]">
              {t('tenants.title')}
            </h1>
          </div>
          {canModify && (
            <Button
              onClick={() => navigate('/system/tenants/create')}
              className="btn-primary"
            >
              <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('tenants.addTenant')}
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
                  placeholder={t('tenants.searchTenants')}
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
            <TableSkeleton rows={6} columns={5} showHeader />
          ) : error ? (
            <ErrorState
              title={t('tenants.errorLoadingTenants')}
              message={(error as any)?.message || t('tenants.failedToLoadTenants')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          ) : filteredTenants.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={searchQuery ? t('tenants.noMatchingTenants') : t('tenants.noTenantsYet')}
              description={searchQuery ? t('tenants.tryAdjustingSearch') : t('tenants.getStartedCreating')}
              action={!searchQuery ? {
                label: t('tenants.addTenant'),
                onClick: () => navigate('/system/tenants/create'),
                icon: Plus,
              } : undefined}
            />
          ) : (
            <AdvancedDataTable<TenantRecord>
              tableId="system-tenants-table"
              data={filteredTenants as TenantRecord[]}
              columns={tenantColumns}
              autoHeight={true}
              minHeight={400}
              rowHeight={48}
              onRowClick={handleRowClick}
              enableColumnResize={true}
              enableColumnReorder={true}
              enableSorting={false}
              emptyMessage={t('tenants.noTenantsFound')}
            />
          )}
        </CardContent>
      </Card>

    </div>
  );
}
