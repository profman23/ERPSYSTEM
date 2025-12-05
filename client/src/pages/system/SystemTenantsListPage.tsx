import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, Eye, Edit, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTenants } from '@/hooks/useHierarchy';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const planColors: Record<string, string> = {
  trial: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  standard: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  professional: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  enterprise: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
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
              background: 'linear-gradient(135deg, var(--sys-accent), #7C3AED)', 
              color: 'var(--sys-text)' 
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--sys-accent)' }} />
              <span className="ml-3" style={{ color: 'var(--sys-text-secondary)' }}>Loading tenants...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div 
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-red-400">Error Loading Tenants</h3>
              <p className="mb-4" style={{ color: 'var(--sys-text-muted)' }}>
                {(error as any)?.message || 'Failed to load tenants. Please try again.'}
              </p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                style={{ 
                  backgroundColor: 'var(--sys-button)', 
                  borderColor: 'var(--sys-border)', 
                  color: 'var(--sys-text)' 
                }}
              >
                Retry
              </Button>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--sys-text-muted)' }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--sys-text)' }}>
                {searchQuery ? 'No Matching Tenants' : 'No Tenants Yet'}
              </h3>
              <p className="mb-6" style={{ color: 'var(--sys-text-secondary)' }}>
                {searchQuery ? 'Try adjusting your search query' : 'Get started by creating your first tenant'}
              </p>
              {!searchQuery && (
                <Link to="/system/tenants/create">
                  <Button 
                    style={{ 
                      background: 'linear-gradient(135deg, var(--sys-accent), #7C3AED)', 
                      color: 'var(--sys-text)' 
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tenant
                  </Button>
                </Link>
              )}
            </div>
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
                      className="hover:bg-white/5"
                      style={{ borderColor: 'var(--sys-border)' }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: tenant.primaryColor || 'var(--sys-accent)' }}
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
                        <Badge className={`${planColors[tenant.subscriptionPlan] || planColors.standard} border`}>
                          {tenant.subscriptionPlan || 'standard'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${statusColors[tenant.status] || statusColors.active} border`}>
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
