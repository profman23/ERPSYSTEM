import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Plus, Search, Eye, Edit, Shield, Loader2, User, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUsers, useBranches, useBusinessLines, useTenants } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';
import { useScopePath } from '@/hooks/useScopePath';
import { UserTypeSelector } from '@/components/users/UserTypeSelector';

const scopeColors: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  tenant: 'success',
  business_line: 'info',
  branch: 'default',
  mixed: 'warning',
};

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  active: 'success',
  inactive: 'default',
  suspended: 'error',
  pending: 'warning',
};

export default function UsersListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const { getUsersCreatePath, getUserRolesPath, getPath } = useScopePath();
  
  const tenantIdFromParams = searchParams.get('tenantId');
  const businessLineIdFromParams = searchParams.get('businessLineId');
  const branchIdFromParams = searchParams.get('branchId');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserTypeSelector, setShowUserTypeSelector] = useState(false);
  
  const isSystemUser = currentUser?.accessScope === 'system';
  const [selectedTenantId, setSelectedTenantId] = useState(tenantIdFromParams || currentUser?.tenantId || '');
  const [selectedBusinessLineId, setSelectedBusinessLineId] = useState(businessLineIdFromParams || '');
  const [selectedBranchId, setSelectedBranchId] = useState(branchIdFromParams || '');
  
  const { data: tenants } = useTenants();
  const { data: businessLines } = useBusinessLines(selectedTenantId || undefined);
  const { data: branches } = useBranches(selectedBusinessLineId || undefined);
  
  const userFilters = useMemo(() => {
    const filters: { tenantId?: string; businessLineId?: string; branchId?: string } = {};
    if (selectedTenantId) filters.tenantId = selectedTenantId;
    if (selectedBusinessLineId) filters.businessLineId = selectedBusinessLineId;
    if (selectedBranchId) filters.branchId = selectedBranchId;
    const fallbackTenantId = selectedTenantId || currentUser?.tenantId || undefined;
    return Object.keys(filters).length > 0 ? filters : { tenantId: fallbackTenantId };
  }, [selectedTenantId, selectedBusinessLineId, selectedBranchId, currentUser?.tenantId]);
  
  const { data: users, isLoading, error } = useUsers(userFilters);

  useEffect(() => {
    if (selectedTenantId !== tenantIdFromParams) {
      setSelectedBusinessLineId('');
      setSelectedBranchId('');
    }
  }, [selectedTenantId]);

  useEffect(() => {
    if (selectedBusinessLineId !== businessLineIdFromParams) {
      setSelectedBranchId('');
    }
  }, [selectedBusinessLineId]);

  const tenantOptions = useMemo(() => {
    if (!tenants) return [];
    return tenants.map(t => ({ value: t.id, label: `${t.name} (${t.code})` }));
  }, [tenants]);

  const businessLineOptions = useMemo(() => {
    if (!businessLines) return [];
    return businessLines.map(bl => ({ value: bl.id, label: `${bl.name} (${bl.code})` }));
  }, [businessLines]);

  const branchOptions = useMemo(() => {
    if (!branches) return [];
    return branches.map(b => ({ value: b.id, label: `${b.name} (${b.code})` }));
  }, [branches]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(query) ||
        u.name?.toLowerCase().includes(query) ||
        u.code?.toLowerCase().includes(query) ||
        u.firstName?.toLowerCase().includes(query) ||
        u.lastName?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

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
    params.delete('branchId');
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
    params.delete('branchId');
    setSearchParams(params);
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBranchId = e.target.value;
    setSelectedBranchId(newBranchId);
    const params = new URLSearchParams(searchParams);
    if (newBranchId) {
      params.set('branchId', newBranchId);
    } else {
      params.delete('branchId');
    }
    setSearchParams(params);
  };

  const getUserDisplayName = (u: any) => {
    if (u.name) return u.name;
    if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
    if (u.firstName) return u.firstName;
    return u.email.split('@')[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            Users
          </h1>
          <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Manage user accounts and access permissions
          </p>
        </div>
        {isSystemUser ? (
          <Button 
            className="bg-[#2563EB] hover:bg-[#1E40AF]"
            onClick={() => setShowUserTypeSelector(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        ) : (
          <Link to={getUsersCreatePath(selectedBranchId ? `branchId=${selectedBranchId}` : undefined)}>
            <Button className="bg-[#2563EB] hover:bg-[#1E40AF]">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
                <Input
                  placeholder="Search users by name, email, or code..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              {currentUser?.accessScope === 'system' && tenantOptions.length > 0 && (
                <div className="w-56">
                  <Select
                    value={selectedTenantId}
                    onChange={handleTenantChange}
                  >
                    <option value="">All Tenants</option>
                    {tenantOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </div>
              )}
              {businessLineOptions.length > 0 && (
                <div className="w-56">
                  <Select
                    value={selectedBusinessLineId}
                    onChange={handleBusinessLineChange}
                  >
                    <option value="">All Business Lines</option>
                    {businessLineOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </div>
              )}
              {branchOptions.length > 0 && (
                <div className="w-56">
                  <Select
                    value={selectedBranchId}
                    onChange={handleBranchChange}
                  >
                    <option value="">All Branches</option>
                    {branchOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
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
              <h3 className="text-lg font-semibold mb-2 text-red-600">Error Loading Users</h3>
              <p className="text-gray-600 mb-4">
                {(error as any)?.message || 'Failed to load users. Please try again.'}
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
              <Users className="w-16 h-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                {searchQuery ? 'No Matching Users' : 'No Users Yet'}
              </h3>
              <p className="mb-6">
                {searchQuery ? 'Try adjusting your search' : 'Create your first user to get started'}
              </p>
              {!searchQuery && (
                <Link to={getUsersCreatePath()}>
                  <Button className="bg-[#2563EB] hover:bg-[#1E40AF]">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={getUserDisplayName(u)} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-purple-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{getUserDisplayName(u)}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.code ? (
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{u.code}</code>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={scopeColors[u.accessScope] || 'default'}>
                        {u.accessScope || 'branch'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.phone || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      {u.roleCount ? (
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {u.roleCount} role{u.roleCount !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400">No roles</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusColors[u.status] || 'default'}>
                        {u.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(getPath(`users/${u.id}`))}
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(getPath(`users/${u.id}/edit`))}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(getUserRolesPath(u.id))}
                          title="Manage Roles"
                        >
                          <Shield className="w-4 h-4" />
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

      {isSystemUser && (
        <UserTypeSelector 
          open={showUserTypeSelector} 
          onOpenChange={setShowUserTypeSelector} 
        />
      )}
    </div>
  );
}
