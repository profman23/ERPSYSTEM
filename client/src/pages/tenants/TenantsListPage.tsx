import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Plus, Search, Eye, Edit, Type, Hash, CreditCard, Activity, Briefcase, GitBranch, Users, Calendar, Settings } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTenants } from '@/hooks/useHierarchy';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { AdvancedDataTable, ActionButtonGroup, ActionButton } from '@/components/ui/AdvancedDataTable';
import { TableSkeleton } from '@/components/ui/Skeleton';

interface TenantRecord {
  id: string;
  name: string;
  code: string;
  contactEmail?: string;
  country?: string;
  status: string;
  subscriptionPlan: string;
  primaryColor?: string;
  createdAt: string;
  businessLineCount?: number;
  totalBranches?: number;
  totalUsers?: number;
}

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

export default function TenantsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: tenants, isLoading, error } = useTenants();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    if (!searchQuery) return tenants;
    const query = searchQuery.toLowerCase();
    return tenants.filter(
      (tenant) =>
        tenant.name.toLowerCase().includes(query) ||
        tenant.code.toLowerCase().includes(query) ||
        tenant.contactEmail?.toLowerCase().includes(query)
    );
  }, [tenants, searchQuery]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleRowClick = useCallback((tenant: TenantRecord) => {
    navigate(`/tenants/${tenant.id}`);
  }, [navigate]);

  const getActionButtons = useCallback((tenant: TenantRecord): ActionButton[] => [
    {
      id: 'view',
      label: t('common.view'),
      icon: Eye,
      onClick: () => navigate(`/tenants/${tenant.id}`),
      variant: 'ghost',
    },
    {
      id: 'edit',
      label: t('common.edit'),
      icon: Edit,
      onClick: () => navigate(`/tenants/${tenant.id}/edit`),
      variant: 'ghost',
    },
  ], [navigate]);

  const tenantColumns: ColumnDef<TenantRecord>[] = useMemo(() => [
    {
      id: 'name',
      accessorKey: 'name',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Type} emoji="🔤" className="w-3.5 h-3.5" />
          {t('common.name')}
        </span>
      ),
      size: 280,
      minSize: 200,
      maxSize: 400,
      cell: ({ row }) => {
        const tenant = row.original;
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                backgroundColor: tenant.primaryColor || 'var(--color-accent)',
                color: 'var(--color-text-on-accent)',
              }}
            >
              {tenant.name.charAt(0).toUpperCase()}
            </div>
            <p>{tenant.name}</p>
          </div>
        );
      },
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
      size: 140,
      minSize: 100,
      maxSize: 200,
      cell: ({ getValue }) => (
        <span className="font-mono">
          {String(getValue() || '')}
        </span>
      ),
    },
    {
      id: 'subscriptionPlan',
      accessorKey: 'subscriptionPlan',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={CreditCard} emoji="💳" className="w-3.5 h-3.5" />
          {t('tenants.plan')}
        </span>
      ),
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
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Activity} emoji="📈" className="w-3.5 h-3.5" />
          {t('common.status')}
        </span>
      ),
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
      id: 'businessLineCount',
      accessorKey: 'businessLineCount',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Briefcase} emoji="💼" className="w-3.5 h-3.5" />
          {t('tenants.businessLines')}
        </span>
      ),
      size: 110,
      minSize: 90,
      maxSize: 150,
      cell: ({ getValue }) => (
        <div className="text-center">{getValue() != null ? String(getValue()) : '-'}</div>
      ),
    },
    {
      id: 'totalBranches',
      accessorKey: 'totalBranches',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={GitBranch} emoji="🌿" className="w-3.5 h-3.5" />
          {t('tenants.branches')}
        </span>
      ),
      size: 100,
      minSize: 80,
      maxSize: 140,
      cell: ({ getValue }) => (
        <div className="text-center">{getValue() != null ? String(getValue()) : '-'}</div>
      ),
    },
    {
      id: 'totalUsers',
      accessorKey: 'totalUsers',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Users} emoji="👥" className="w-3.5 h-3.5" />
          {t('tenants.users')}
        </span>
      ),
      size: 100,
      minSize: 80,
      maxSize: 140,
      cell: ({ getValue }) => (
        <div className="text-center">{getValue() != null ? String(getValue()) : '-'}</div>
      ),
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Calendar} emoji="📅" className="w-3.5 h-3.5" />
          {t('tenants.created')}
        </span>
      ),
      size: 130,
      minSize: 100,
      maxSize: 180,
      cell: ({ getValue }) => {
        const value = getValue();
        return (
          <span style={{ color: 'var(--color-text-muted)' }}>
            {value ? formatDate(String(value)) : '-'}
          </span>
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
      size: 150,
      minSize: 130,
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
  ], [getActionButtons]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StyledIcon icon={Building2} emoji="🏢" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              {t('tenants.title')}
            </h1>
          </div>
          <Link to="/tenants/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t('tenants.addTenant')}
            </Button>
          </Link>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <Input
                placeholder={t('tenants.searchTenants')}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
              title={t('tenants.errorLoadingTenants')}
              message={(error as any)?.message || t('tenants.failedToLoadTenants')}
              retryAction={() => window.location.reload()}
              variant="page"
            />
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-6">
            <EmptyState
              icon={Building2}
              title={searchQuery ? t('tenants.noMatchingTenants') : t('tenants.noTenantsYet')}
              description={searchQuery ? t('tenants.tryAdjustingSearch') : t('tenants.getStartedCreating')}
              action={!searchQuery ? {
                label: t('tenants.addTenant'),
                onClick: () => navigate('/tenants/create'),
                icon: Plus,
              } : undefined}
            />
            </div>
          ) : (
            <AdvancedDataTable<TenantRecord>
              tableId="tenants-list-table"
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
      </div>
    </div>
  );
}
