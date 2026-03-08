/**
 * ClientsListPage — Client (pet owner) list matching UsersListPage pattern exactly
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  UserCircle, Plus, Search, Loader2,
  Pencil, Ban, CheckCircle2, Type, Mail, Phone,
  Activity, Settings, Hash,
} from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AdvancedDataTable } from '@/components/ui/AdvancedDataTable';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/Pagination';
import { useClientsList, type Client } from '@/hooks/useClients';
import { useScopePath } from '@/hooks/useScopePath';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { apiClient } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useScreenPermission } from '@/hooks/useScreenPermission';

const getStatusStyle = (isActive: boolean) => {
  if (isActive) {
    return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' };
  }
  return { backgroundColor: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)', borderColor: 'var(--badge-danger-border)' };
};

const SCREEN_CODE = 'CLIENT_LIST';

export default function ClientsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getPath } = useScopePath();
  const { canAccess, canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [togglingClientId, setTogglingClientId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search — 300ms per CLAUDE.md
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clientFilters = useMemo(() => {
    const filters: { page?: number; limit?: number; search?: string } = {};
    filters.page = page;
    filters.limit = pageSize;
    if (debouncedSearch) filters.search = debouncedSearch;
    return filters;
  }, [page, pageSize, debouncedSearch]);

  const { data: clientsResponse, isLoading, error } = useClientsList(clientFilters);
  const clients = clientsResponse?.data ?? [];
  const pagination = clientsResponse?.pagination;
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  const handleToggleStatus = useCallback(async (client: Client) => {
    setTogglingClientId(client.id);
    try {
      await apiClient.put(`/tenant/clients/${client.id}`, { isActive: !client.isActive });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch {
      // silently fail
    } finally {
      setTogglingClientId(null);
    }
  }, [queryClient]);

  const clientColumns: ColumnDef<Client>[] = useMemo(() => [
    {
      id: 'code',
      accessorKey: 'code',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Hash} emoji="#️⃣" className="w-3.5 h-3.5" />
          Code
        </span>
      ),
      size: 130,
      minSize: 100,
      maxSize: 180,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {getValue() as string}
        </span>
      ),
    },
    {
      id: 'name',
      accessorKey: 'firstName',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Type} emoji="🔤" className="w-3.5 h-3.5" />
          Name
        </span>
      ),
      size: 200,
      minSize: 150,
      maxSize: 300,
      cell: ({ row }) => (
        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          {row.original.firstName} {row.original.lastName}
        </span>
      ),
    },
    {
      id: 'email',
      accessorKey: 'email',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Mail} emoji="📧" className="w-3.5 h-3.5" />
          Email
        </span>
      ),
      size: 240,
      minSize: 180,
      maxSize: 350,
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
      id: 'phone',
      accessorKey: 'phone',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Phone} emoji="📱" className="w-3.5 h-3.5" />
          Phone
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
      id: 'status',
      accessorKey: 'isActive',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Activity} emoji="📈" className="w-3.5 h-3.5" />
          Status
        </span>
      ),
      size: 100,
      minSize: 80,
      maxSize: 130,
      cell: ({ row }) => {
        const isActive = row.original.isActive !== false;
        return (
          <Badge className="border text-xs" style={getStatusStyle(isActive)}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: () => (
        <span className="flex items-center gap-1.5">
          <StyledIcon icon={Settings} emoji="⚙️" className="w-3.5 h-3.5" />
          Actions
        </span>
      ),
      size: 100,
      minSize: 80,
      maxSize: 120,
      enableResizing: false,
      cell: ({ row }) => {
        const client = row.original;
        const isActive = client.isActive !== false;
        const isToggling = togglingClientId === client.id;

        if (!canModify) return null;

        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/app/clients/${client.id}/edit`); }}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleToggleStatus(client); }}
              disabled={isToggling}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors disabled:opacity-50"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                e.currentTarget.style.color = isActive ? 'var(--badge-danger-text)' : 'var(--badge-success-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
              title={isActive ? 'Deactivate' : 'Activate'}
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
  ], [togglingClientId, handleToggleStatus, canModify, navigate]);

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
            <StyledIcon icon={UserCircle} emoji="👤" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              Clients
            </h1>
          </div>
          {canModify && (
            <Link to="/app/clients/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </Link>
          )}
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <Input
                placeholder="Search clients by name, email, phone, or code..."
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
            <TableSkeleton rows={6} columns={6} showHeader />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title="Error Loading Clients"
              message={(error as Error)?.message || 'Failed to load clients. Please try again.'}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          </div>
        ) : clients.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={UserCircle}
              title={debouncedSearch ? 'No Matching Clients' : 'No Clients Yet'}
              description={debouncedSearch ? 'Try adjusting your search' : 'Create your first client to get started'}
              action={!debouncedSearch ? {
                label: 'Add Client',
                onClick: () => navigate('/app/clients/create'),
                icon: Plus,
              } : undefined}
            />
          </div>
        ) : (
          <>
            <AdvancedDataTable<Client>
              tableId="app-clients-list-table"
              data={clients}
              columns={clientColumns}
              autoHeight={true}
              minHeight={400}
              rowHeight={48}
              enableColumnResize={true}
              enableColumnReorder={true}
              enableSorting={false}
              emptyMessage="No clients found"
            />

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
