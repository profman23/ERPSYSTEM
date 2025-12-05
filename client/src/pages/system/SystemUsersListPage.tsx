import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Eye, Edit, Shield, Loader2, User, AlertCircle, Building2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAllUsers, useTenants } from '@/hooks/useHierarchy';

type UserTypeSelection = 'system' | 'tenant_admin' | null;

const scopeColors: Record<string, string> = {
  system: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  tenant: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  business_line: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  branch: 'bg-green-500/20 text-green-400 border-green-500/30',
  mixed: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const userTypes = [
  {
    id: 'system' as const,
    icon: Shield,
    title: 'System User',
    description: 'Platform-level user with system-wide access. No tenant or branch assignment required.',
    details: [
      'Full platform access',
      'Can manage all tenants',
      'No branch restriction',
    ],
    color: 'from-purple-600 to-purple-700',
    borderColor: 'border-purple-500/50',
    hoverBg: 'hover:bg-purple-500/10',
  },
  {
    id: 'tenant_admin' as const,
    icon: Building2,
    title: 'Tenant Admin',
    description: 'Organization administrator with full access to their tenant. Assigned to a specific tenant.',
    details: [
      'Full tenant access',
      'Can manage all branches',
      'Auto-granted permissions',
    ],
    color: 'from-blue-600 to-blue-700',
    borderColor: 'border-blue-500/50',
    hoverBg: 'hover:bg-blue-500/10',
  },
];

export default function SystemUsersListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [showUserTypeSelector, setShowUserTypeSelector] = useState(false);
  const [selectedType, setSelectedType] = useState<UserTypeSelection>(null);

  const { data: users, isLoading, error } = useAllUsers();
  const { data: tenants } = useTenants();

  const tenantOptions = useMemo(() => {
    if (!tenants) return [];
    return tenants.map(t => ({ value: t.id, label: `${t.name} (${t.code})` }));
  }, [tenants]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    let result = users;
    
    if (selectedTenantId) {
      result = result.filter(u => u.tenantId === selectedTenantId);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.name?.toLowerCase().includes(query) ||
          u.code?.toLowerCase().includes(query) ||
          u.firstName?.toLowerCase().includes(query) ||
          u.lastName?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [users, searchQuery, selectedTenantId]);

  const getUserDisplayName = (u: any) => {
    if (u.name) return u.name;
    if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
    if (u.firstName) return u.firstName;
    return u.email.split('@')[0];
  };

  const handleContinue = () => {
    if (!selectedType) return;
    setShowUserTypeSelector(false);
    navigate(`/system/users/create?type=${selectedType}`);
    setSelectedType(null);
  };

  const handleCancel = () => {
    setSelectedType(null);
    setShowUserTypeSelector(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Platform Users</h1>
          <p className="mt-2 text-gray-400">
            Manage system users, tenant admins, and all platform accounts
          </p>
        </div>
        <Button 
          className="bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => setShowUserTypeSelector(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card className="bg-[#1E293B] border-[#334155]">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search users by name, email, or code..."
                  className="pl-10 bg-[#0F172A] border-[#334155] text-white placeholder:text-gray-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              {tenantOptions.length > 0 && (
                <div className="w-56">
                  <Select
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    className="bg-[#0F172A] border-[#334155] text-white"
                  >
                    <option value="">All Tenants</option>
                    {tenantOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#1E293B] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white">Users</CardTitle>
          <CardDescription className="text-gray-400">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              <span className="ml-3 text-gray-400">Loading...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-red-400">Error Loading Users</h3>
              <p className="text-gray-400 mb-4">
                {(error as any)?.message || 'Failed to load users. Please try again.'}
              </p>
              <Button variant="outline" onClick={() => window.location.reload()} className="border-[#334155] text-gray-300 hover:bg-[#334155]">
                Retry
              </Button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-semibold mb-2 text-white">
                {searchQuery ? 'No Matching Users' : 'No Users Yet'}
              </h3>
              <p className="text-gray-400 mb-6">
                {searchQuery ? 'Try adjusting your search' : 'Create your first user to get started'}
              </p>
              {!searchQuery && (
                <Button 
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => setShowUserTypeSelector(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#334155] hover:bg-transparent">
                    <TableHead className="text-gray-400">User</TableHead>
                    <TableHead className="text-gray-400">Code</TableHead>
                    <TableHead className="text-gray-400">Scope</TableHead>
                    <TableHead className="text-gray-400">Contact</TableHead>
                    <TableHead className="text-gray-400">Role</TableHead>
                    <TableHead className="text-gray-400 text-center">Status</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id} className="border-[#334155] hover:bg-[#0F172A]">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={getUserDisplayName(u)} className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                              <User className="w-4 h-4 text-purple-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">{getUserDisplayName(u)}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.code ? (
                          <code className="text-sm bg-[#0F172A] px-2 py-1 rounded text-gray-300">{u.code}</code>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${scopeColors[u.accessScope] || scopeColors.branch} border`}>
                          {u.accessScope || 'branch'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {u.phone || <span className="text-gray-600">-</span>}
                      </TableCell>
                      <TableCell>
                        {u.roleCount ? (
                          <span className="flex items-center gap-1 text-gray-300">
                            <Shield className="w-3 h-3" />
                            {u.roleCount} role{u.roleCount !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-600">No roles</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${statusColors[u.status] || statusColors.active} border`}>
                          {u.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/system/users/${u.id}`)}
                            title="View"
                            className="text-gray-400 hover:text-white hover:bg-[#334155]"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/system/users/${u.id}/edit`)}
                            title="Edit"
                            className="text-gray-400 hover:text-white hover:bg-[#334155]"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/system/users/${u.id}/roles`)}
                            title="Manage Roles"
                            className="text-gray-400 hover:text-white hover:bg-[#334155]"
                          >
                            <Shield className="w-4 h-4" />
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

      <Dialog open={showUserTypeSelector} onOpenChange={setShowUserTypeSelector}>
        <DialogContent className="sm:max-w-2xl bg-[#1E293B] border-[#334155]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-white">
              <Users className="w-5 h-5" />
              Select User Type
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose the type of user you want to create. Each type has different access levels and requirements.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {userTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`
                    relative p-4 rounded-lg border-2 text-left transition-all duration-200
                    ${isSelected 
                      ? `${type.borderColor} bg-gradient-to-r ${type.color} text-white shadow-lg` 
                      : `border-[#334155] ${type.hoverBg} bg-[#0F172A]`
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    <div className={`
                      p-3 rounded-lg
                      ${isSelected ? 'bg-white/20' : `bg-gradient-to-r ${type.color} text-white`}
                    `}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-lg mb-1 ${isSelected ? 'text-white' : 'text-white'}`}>
                        {type.title}
                      </h3>
                      <p className={`text-sm mb-3 ${isSelected ? 'text-white/90' : 'text-gray-400'}`}>
                        {type.description}
                      </p>
                      <ul className="space-y-1">
                        {type.details.map((detail, i) => (
                          <li 
                            key={i} 
                            className={`text-xs flex items-center gap-2 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/60' : 'bg-gray-500'}`} />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {isSelected && (
                      <div className="absolute top-4 right-4">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#334155]">
            <Button variant="outline" onClick={handleCancel} className="border-[#334155] text-gray-300 hover:bg-[#334155] hover:text-white">
              Cancel
            </Button>
            <Button 
              onClick={handleContinue}
              disabled={!selectedType}
              className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
