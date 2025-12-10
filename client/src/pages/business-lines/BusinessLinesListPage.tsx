import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GitBranch, Plus, Search, Eye, Edit, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useBusinessLines, useDeleteBusinessLine, useTenants } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

const typeLabels: Record<string, string> = {
  veterinary_clinic: 'Veterinary Clinic',
  pet_store: 'Pet Store',
  grooming: 'Grooming',
  boarding: 'Boarding',
  general: 'General',
};

export default function BusinessLinesListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  const tenantIdFromParams = searchParams.get('tenantId');
  const tenantId = tenantIdFromParams || user?.tenantId || undefined;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  const { data: tenants } = useTenants();
  const { data: businessLines, isLoading, error } = useBusinessLines(tenantId);
  const deleteMutation = useDeleteBusinessLine();

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

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error: any) {
      setDeleteError(error?.response?.data?.error || error?.message || 'Failed to delete business line');
    }
  };

  const handleTenantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTenantId = e.target.value;
    if (newTenantId) {
      setSearchParams({ tenantId: newTenantId });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            Business Lines
          </h1>
          <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Manage business lines and their branches
          </p>
        </div>
        <Link to={`/business-lines/create${tenantId ? `?tenantId=${tenantId}` : ''}`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Business Line
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
                placeholder="Search business lines..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {user?.accessScope === 'system' && tenantOptions.length > 0 && (
              <div className="w-64">
                <Select
                  value={tenantId || ''}
                  onChange={handleTenantChange}
                >
                  <option value="">All Tenants</option>
                  {tenantOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Lines</CardTitle>
          <CardDescription>
            {filteredBusinessLines.length} business line{filteredBusinessLines.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState size="lg" message="Loading business lines..." fullPage />
          ) : error ? (
            <ErrorState
              title="Error Loading Business Lines"
              message={(error as any)?.message || 'Failed to load business lines. Please try again.'}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          ) : filteredBusinessLines.length === 0 ? (
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-center">Branches</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBusinessLines.map((bl) => (
                  <TableRow key={bl.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'var(--badge-info-bg)' }}
                        >
                          <GitBranch className="w-4 h-4" style={{ color: 'var(--color-info)' }} />
                        </div>
                        <div>
                          <p className="font-medium">{bl.name}</p>
                          {bl.description && (
                            <p 
                              className="text-xs truncate max-w-[200px]"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              {bl.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code 
                        className="text-sm px-2 py-1 rounded"
                        style={{ backgroundColor: 'var(--color-surface-hover)' }}
                      >
                        {bl.code}
                      </code>
                    </TableCell>
                    <TableCell>{typeLabels[bl.businessLineType] || bl.businessLineType}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {bl.contactEmail && <p>{bl.contactEmail}</p>}
                        {bl.contactPhone && <p style={{ color: 'var(--color-text-muted)' }}>{bl.contactPhone}</p>}
                        {!bl.contactEmail && !bl.contactPhone && <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{bl.branchCount ?? '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={bl.isActive ? 'success' : 'default'}>
                        {bl.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/business-lines/${bl.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/business-lines/${bl.id}/edit`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(bl.id)}
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <Trash2 className="w-4 h-4" />
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

      <Dialog open={!!deleteId} onOpenChange={() => { setDeleteId(null); setDeleteError(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Business Line</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this business line? This action cannot be undone
              and will also delete all associated branches and users.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div 
              className="p-3 rounded-lg border text-sm"
              style={{ 
                backgroundColor: 'var(--alert-danger-bg)', 
                borderColor: 'var(--alert-danger-border)',
                color: 'var(--alert-danger-text)'
              }}
            >
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteId(null); setDeleteError(null); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
