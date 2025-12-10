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

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'active':
      return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--color-text-success)', borderColor: 'var(--badge-success-border)' };
    case 'inactive':
      return { backgroundColor: 'var(--sys-button)', color: 'var(--sys-text-muted)', borderColor: 'var(--sys-border)' };
    case 'suspended':
      return { backgroundColor: 'var(--badge-danger-bg)', color: 'var(--color-text-danger)', borderColor: 'var(--badge-danger-border)' };
    case 'pending':
      return { backgroundColor: 'var(--badge-warning-bg)', color: 'var(--color-text-warning)', borderColor: 'var(--badge-warning-border)' };
    default:
      return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--color-text-success)', borderColor: 'var(--badge-success-border)' };
  }
};

const getPlanStyle = (plan: string) => {
  switch (plan) {
    case 'trial':
      return { backgroundColor: 'var(--sys-button)', color: 'var(--sys-text-muted)', borderColor: 'var(--sys-border)' };
    case 'standard':
      return { backgroundColor: 'var(--badge-info-bg)', color: 'var(--color-text-info)', borderColor: 'var(--badge-info-border)' };
    case 'professional':
      return { backgroundColor: 'color-mix(in srgb, var(--sys-accent) 20%, transparent)', color: 'var(--sys-accent)', borderColor: 'color-mix(in srgb, var(--sys-accent) 30%, transparent)' };
    case 'enterprise':
      return { backgroundColor: 'var(--badge-warning-bg)', color: 'var(--color-text-warning)', borderColor: 'var(--badge-warning-border)' };
    default:
      return { backgroundColor: 'var(--badge-info-bg)', color: 'var(--color-text-info)', borderColor: 'var(--badge-info-border)' };
  }
};

export default function SystemTenantsListPage() {
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
          <h1 className="text-3xl font-bold" style={{ color: 'var(--sys-text)' }}>
            Tenants
          </h1>
          <p className="mt-2" style={{ color: 'var(--sys-text-secondary)' }}>
            Manage organizations in the platform
          </p>
        </div>
        <Link to="/system/tenants/create">
          <Button 
            style={{ 
              background: 'linear-gradient(135deg, var(--sys-accent), var(--sys-accent-hover))', 
              color: 'var(--color-text-on-accent)' 
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Tenant
          </Button>
        </Link>
      </div>

      <Card className="border" style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                style={{ color: 'var(--sys-text-muted)' }} 
              />
              <Input
                placeholder="Search tenants by name, code, or email..."
                className="pl-10"
                style={{ 
                  backgroundColor: 'var(--sys-bg)', 
                  borderColor: 'var(--sys-border)', 
                  color: 'var(--sys-text)' 
                }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border" style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}>
        <CardHeader>
          <CardTitle style={{ color: 'var(--sys-text)' }}>Tenants List</CardTitle>
          <CardDescription style={{ color: 'var(--sys-text-secondary)' }}>
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
                onClick: () => navigate('/system/tenants/create'),
                icon: Plus,
              } : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: 'var(--sys-border)' }}>
                    <TableHead style={{ color: 'var(--sys-text-secondary)' }}>Organization</TableHead>
                    <TableHead style={{ color: 'var(--sys-text-secondary)' }}>Code</TableHead>
                    <TableHead style={{ color: 'var(--sys-text-secondary)' }}>Contact</TableHead>
                    <TableHead style={{ color: 'var(--sys-text-secondary)' }}>Plan</TableHead>
                    <TableHead className="text-center" style={{ color: 'var(--sys-text-secondary)' }}>Status</TableHead>
                    <TableHead style={{ color: 'var(--sys-text-secondary)' }}>Created</TableHead>
                    <TableHead className="text-right" style={{ color: 'var(--sys-text-secondary)' }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow 
                      key={tenant.id} 
                      className="transition-colors"
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sys-surface-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      style={{ borderColor: 'var(--sys-border)' }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
                            style={{ 
                              backgroundColor: tenant.primaryColor || 'var(--sys-accent)',
                              color: 'var(--color-text-on-accent)'
                            }}
                          >
                            {tenant.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: 'var(--sys-text)' }}>{tenant.name}</p>
                            <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>{tenant.country || 'Global'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code 
                          className="text-sm px-2 py-1 rounded"
                          style={{ backgroundColor: 'var(--sys-bg)', color: 'var(--sys-text-secondary)' }}
                        >
                          {tenant.code}
                        </code>
                      </TableCell>
                      <TableCell style={{ color: 'var(--sys-text-secondary)' }}>
                        {tenant.contactEmail || <span style={{ color: 'var(--sys-text-muted)' }}>-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className="border"
                          style={getPlanStyle(tenant.subscriptionPlan)}
                        >
                          {tenant.subscriptionPlan || 'standard'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className="border"
                          style={getStatusStyle(tenant.status)}
                        >
                          {tenant.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ color: 'var(--sys-text-muted)' }}>
                        {tenant.createdAt ? formatDate(tenant.createdAt) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/system/tenants/${tenant.id}`)}
                            title="View"
                            style={{ color: 'var(--sys-text-secondary)' }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/system/tenants/${tenant.id}/edit`)}
                            title="Edit"
                            style={{ color: 'var(--sys-text-secondary)' }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
