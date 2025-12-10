import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, Eye, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTenants } from '@/hooks/useHierarchy';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

const planColors: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  trial: 'default',
  standard: 'info',
  professional: 'success',
  enterprise: 'warning',
};

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  active: 'success',
  inactive: 'default',
  suspended: 'error',
  pending: 'warning',
};

export default function TenantsListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: tenants, isLoading, error } = useTenants();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            Tenants
          </h1>
          <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Manage organizations in the system
          </p>
        </div>
        <Link to="/tenants/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Tenant
          </Button>
        </Link>
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
                placeholder="Search tenants by name, code, or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenants List</CardTitle>
          <CardDescription>
            {filteredTenants.length} organization{filteredTenants.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState size="lg" message="Loading tenants..." fullPage />
          ) : error ? (
            <ErrorState
              title="Error Loading Tenants"
              message={(error as any)?.message || 'Failed to load tenants. Please try again.'}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          ) : filteredTenants.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={searchQuery ? 'No Matching Tenants' : 'No Tenants Yet'}
              description={searchQuery ? 'Try adjusting your search query' : 'Get started by creating your first tenant'}
              action={!searchQuery ? {
                label: 'Add Tenant',
                onClick: () => navigate('/tenants/create'),
                icon: Plus,
              } : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Business Lines</TableHead>
                  <TableHead className="text-center">Branches</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ 
                            backgroundColor: tenant.primaryColor || 'var(--color-accent)',
                            color: 'var(--color-text-on-accent)'
                          }}
                        >
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          {tenant.contactEmail && (
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tenant.contactEmail}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code 
                        className="text-sm px-2 py-1 rounded"
                        style={{ backgroundColor: 'var(--color-surface-hover)' }}
                      >
                        {tenant.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={planColors[tenant.subscriptionPlan] || 'default'}>
                        {tenant.subscriptionPlan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[tenant.status] || 'default'}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{tenant.businessLineCount ?? '-'}</TableCell>
                    <TableCell className="text-center">{tenant.totalBranches ?? '-'}</TableCell>
                    <TableCell className="text-center">{tenant.totalUsers ?? '-'}</TableCell>
                    <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/tenants/${tenant.id}`)}
                          title="View Hierarchy"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/tenants/${tenant.id}/edit`)}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
