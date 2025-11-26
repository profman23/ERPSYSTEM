import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GitBranch, Plus, Search, Eye, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useBusinessLines, useDeleteBusinessLine, useTenants } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';

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
          <Button className="bg-[#2563EB] hover:bg-[#1E40AF]">
            <Plus className="w-4 h-4 mr-2" />
            Add Business Line
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
              <span className="ml-3" style={{ color: 'var(--color-text-secondary)' }}>Loading...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-red-600">Error Loading Business Lines</h3>
              <p className="text-gray-600 mb-4">
                {(error as any)?.message || 'Failed to load business lines. Please try again.'}
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : filteredBusinessLines.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
              <GitBranch className="w-16 h-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                {searchQuery ? 'No Matching Business Lines' : 'No Business Lines Yet'}
              </h3>
              <p className="mb-6">
                {searchQuery ? 'Try adjusting your search' : 'Create your first business line to get started'}
              </p>
              {!searchQuery && (
                <Link to={`/business-lines/create${tenantId ? `?tenantId=${tenantId}` : ''}`}>
                  <Button className="bg-[#2563EB] hover:bg-[#1E40AF]">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Business Line
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
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <GitBranch className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{bl.name}</p>
                          {bl.description && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{bl.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">{bl.code}</code>
                    </TableCell>
                    <TableCell>{typeLabels[bl.businessLineType] || bl.businessLineType}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {bl.contactEmail && <p>{bl.contactEmail}</p>}
                        {bl.contactPhone && <p className="text-gray-500">{bl.contactPhone}</p>}
                        {!bl.contactEmail && !bl.contactPhone && <span className="text-gray-400">-</span>}
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
                          className="text-red-600 hover:text-red-700"
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
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteId(null); setDeleteError(null); }}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
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
