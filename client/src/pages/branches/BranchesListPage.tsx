import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Plus, Search, Eye, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useBranches, useDeleteBranch, useBusinessLines, useTenants } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';

export default function BranchesListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  const tenantIdFromParams = searchParams.get('tenantId');
  const businessLineIdFromParams = searchParams.get('businessLineId');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState(tenantIdFromParams || user?.tenantId || '');
  const [selectedBusinessLineId, setSelectedBusinessLineId] = useState(businessLineIdFromParams || '');
  
  const { data: tenants } = useTenants();
  const { data: businessLines, isLoading: loadingBusinessLines } = useBusinessLines(selectedTenantId || undefined);
  const { data: branches, isLoading, error } = useBranches(selectedBusinessLineId || undefined);
  const deleteMutation = useDeleteBranch();

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
        branch.country?.toLowerCase().includes(query)
    );
  }, [branches, searchQuery]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error: any) {
      setDeleteError(error?.response?.data?.error || error?.message || 'Failed to delete branch');
    }
  };

  const handleTenantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTenantId = e.target.value;
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

  const handleBusinessLineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBLId = e.target.value;
    setSelectedBusinessLineId(newBLId);
    const params = new URLSearchParams(searchParams);
    if (newBLId) {
      params.set('businessLineId', newBLId);
    } else {
      params.delete('businessLineId');
    }
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            Branches
          </h1>
          <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Manage physical locations and service points
          </p>
        </div>
        <Link to={`/branches/create${selectedBusinessLineId ? `?businessLineId=${selectedBusinessLineId}` : ''}`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Branch
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                <Input
                  placeholder="Search branches by name, code, or location..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              {user?.accessScope === 'system' && tenantOptions.length > 0 && (
                <div className="w-56">
                  <Select
                    value={selectedTenantId}
                    onChange={handleTenantChange}
                  >
                    <option value="">Select Tenant</option>
                    {tenantOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </div>
              )}
              <div className="w-56">
                <Select
                  value={selectedBusinessLineId}
                  onChange={handleBusinessLineChange}
                  disabled={loadingBusinessLines}
                >
                  <option value="">{loadingBusinessLines ? 'Loading...' : 'Select Business Line'}</option>
                  {businessLineOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branches</CardTitle>
          <CardDescription>
            {filteredBranches.length} branch{filteredBranches.length !== 1 ? 'es' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
              <span className="ml-3" style={{ color: 'var(--color-text-secondary)' }}>Loading...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div 
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-danger) 15%, transparent)' }}
              >
                <AlertCircle className="w-8 h-8" style={{ color: 'var(--color-danger)' }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-danger)' }}>Error Loading Branches</h3>
              <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                {(error as any)?.message || 'Failed to load branches. Please try again.'}
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : !selectedBusinessLineId ? (
            <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
              <MapPin className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                Select a Business Line
              </h3>
              <p className="mb-6">
                Please select a business line from the dropdown above to view branches
              </p>
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
              <MapPin className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                {searchQuery ? 'No Matching Branches' : 'No Branches Yet'}
              </h3>
              <p className="mb-6">
                {searchQuery ? 'Try adjusting your search' : 'Create your first branch to get started'}
              </p>
              {!searchQuery && (
                <Link to="/branches/create">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Branch
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBranches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)' }}
                        >
                          <MapPin className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                        </div>
                        <div>
                          <p className="font-medium">{branch.name}</p>
                          {branch.address && (
                            <p className="text-xs truncate max-w-[200px]" style={{ color: 'var(--color-text-secondary)' }}>{branch.address}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-surface-hover)' }}>{branch.code}</code>
                    </TableCell>
                    <TableCell>
                      {[branch.city, branch.state, branch.country].filter(Boolean).join(', ') || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {branch.email && <p>{branch.email}</p>}
                        {branch.phone && <p style={{ color: 'var(--color-text-secondary)' }}>{branch.phone}</p>}
                        {!branch.email && !branch.phone && <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{branch.userCount ?? '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={branch.isActive ? 'success' : 'default'}>
                        {branch.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/branches/${branch.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/branches/${branch.id}/edit`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(branch.id)}
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
            <DialogTitle>Delete Branch</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this branch? This action cannot be undone
              and will also delete all associated users.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div 
              className="p-3 rounded-lg text-sm"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                borderColor: 'var(--color-danger)',
                color: 'var(--color-danger)'
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
