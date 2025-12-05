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
          <h1 className="text-3xl font-bold" style={{ color: 'var(--sys-text)' }}>Platform Users</h1>
          <p className="mt-2" style={{ color: 'var(--sys-text-secondary)' }}>
            Manage system users, tenant admins, and all platform accounts
          </p>
        </div>
        <Button 
          onClick={() => setShowUserTypeSelector(true)}
          style={{ 
            background: 'linear-gradient(135deg, var(--sys-accent), #7C3AED)', 
            color: 'var(--sys-text)' 
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card className="border" style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                  style={{ color: 'var(--sys-text-muted)' }} 
                />
                <Input
                  placeholder="Search users by name, email, or code..."
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
            <div className="flex gap-4 flex-wrap">
              {tenantOptions.length > 0 && (
                <div className="w-56">
                  <Select
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    style={{ 
                      backgroundColor: 'var(--sys-bg)', 
                      borderColor: 'var(--sys-border)', 
                      color: 'var(--sys-text)' 
                    }}
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

      <Card className="border" style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}>
        <CardHeader>
          <CardTitle style={{ color: 'var(--sys-text)' }}>Users</CardTitle>
          <CardDescription style={{ color: 'var(--sys-text-secondary)' }}>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--sys-accent)' }} />
              <span className="ml-3" style={{ color: 'var(--sys-text-secondary)' }}>Loading...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div 
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-red-400">Error Loading Users</h3>
              <p className="mb-4" style={{ color: 'var(--sys-text-muted)' }}>
                {(error as any)?.message || 'Failed to load users. Please try again.'}
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
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--sys-text-muted)' }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--sys-text)' }}>
                {searchQuery ? 'No Matching Users' : 'No Users Yet'}
              </h3>
              <p className="mb-6" style={{ color: 'var(--sys-text-secondary)' }}>
                {searchQuery ? 'Try adjusting your search' : 'Create your first user to get started'}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setShowUserTypeSelector(true)}
                  style={{ 
                    background: 'linear-gradient(135deg, var(--sys-accent), #7C3AED)', 
                    color: 'var(--sys-text)' 
                  }}
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
                  <TableRow style={{ borderColor: 'var(--sys-border)' }}>
                    <TableHead style={{ color: 'var(--sys-text-secondary)' }}>User</TableHead>
                    <TableHead style={{ color: 'var(--sys-text-secondary)' }}>Code</TableHead>
                    <TableHead style={{ color: 'var(--sys-text-secondary)' }}>Scope</TableHead>
                    <TableHead style={{ color: 'var(--sys-text-secondary)' }}>Contact</TableHead>
                    <TableHead style={{ color: 'var(--sys-text-secondary)' }}>Role</TableHead>
                    <TableHead className="text-center" style={{ color: 'var(--sys-text-secondary)' }}>Status</TableHead>
                    <TableHead className="text-right" style={{ color: 'var(--sys-text-secondary)' }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow 
                      key={u.id} 
                      className="hover:bg-white/5"
                      style={{ borderColor: 'var(--sys-border)' }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={getUserDisplayName(u)} className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div 
                              className="w-9 h-9 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}
                            >
                              <User className="w-4 h-4" style={{ color: 'var(--sys-accent)' }} />
                            </div>
                          )}
                          <div>
                            <p className="font-medium" style={{ color: 'var(--sys-text)' }}>{getUserDisplayName(u)}</p>
                            <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.code ? (
                          <code 
                            className="text-sm px-2 py-1 rounded"
                            style={{ backgroundColor: 'var(--sys-bg)', color: 'var(--sys-text-secondary)' }}
                          >
                            {u.code}
                          </code>
                        ) : (
                          <span style={{ color: 'var(--sys-text-muted)' }}>-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${scopeColors[u.accessScope] || scopeColors.branch} border`}>
                          {u.accessScope || 'branch'}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ color: 'var(--sys-text-secondary)' }}>
                        {u.phone || <span style={{ color: 'var(--sys-text-muted)' }}>-</span>}
                      </TableCell>
                      <TableCell>
                        {u.roleCount ? (
                          <span className="flex items-center gap-1" style={{ color: 'var(--sys-text-secondary)' }}>
                            <Shield className="w-3 h-3" />
                            {u.roleCount} role{u.roleCount !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--sys-text-muted)' }}>No roles</span>
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
                            style={{ color: 'var(--sys-text-secondary)' }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/system/users/${u.id}/edit`)}
                            title="Edit"
                            style={{ color: 'var(--sys-text-secondary)' }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/system/users/${u.id}/roles`)}
                            title="Manage Roles"
                            style={{ color: 'var(--sys-text-secondary)' }}
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
        <DialogContent 
          className="sm:max-w-2xl border"
          style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2" style={{ color: 'var(--sys-text)' }}>
              <Users className="w-5 h-5" />
              Select User Type
            </DialogTitle>
            <DialogDescription style={{ color: 'var(--sys-text-secondary)' }}>
              Choose the type of user you want to create. Each type has different access levels and requirements.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {userTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              const isSystem = type.id === 'system';
              
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`
                    relative p-4 rounded-lg border-2 text-left transition-all duration-200
                    ${isSelected 
                      ? `border-${isSystem ? 'purple' : 'blue'}-500/50` 
                      : ''
                    }
                  `}
                  style={{ 
                    backgroundColor: isSelected 
                      ? (isSystem ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)')
                      : 'var(--sys-bg)',
                    borderColor: isSelected 
                      ? (isSystem ? 'rgba(139, 92, 246, 0.5)' : 'rgba(59, 130, 246, 0.5)')
                      : 'var(--sys-border)'
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="p-3 rounded-lg"
                      style={{ 
                        background: isSystem 
                          ? 'linear-gradient(135deg, #9333EA, #7C3AED)' 
                          : 'linear-gradient(135deg, #2563EB, #3B82F6)',
                        color: 'white'
                      }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--sys-text)' }}>
                        {type.title}
                      </h3>
                      <p className="text-sm mb-3" style={{ color: 'var(--sys-text-secondary)' }}>
                        {type.description}
                      </p>
                      <ul className="space-y-1">
                        {type.details.map((detail, i) => (
                          <li 
                            key={i} 
                            className="text-xs flex items-center gap-2"
                            style={{ color: 'var(--sys-text-muted)' }}
                          >
                            <span 
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: 'var(--sys-text-muted)' }}
                            />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {isSelected && (
                      <div className="absolute top-4 right-4">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: isSystem ? '#9333EA' : '#3B82F6' }}
                        >
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
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

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--sys-border)' }}>
            <Button 
              variant="outline" 
              onClick={handleCancel}
              style={{ 
                backgroundColor: 'var(--sys-button)', 
                borderColor: 'var(--sys-border)', 
                color: 'var(--sys-text)' 
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleContinue}
              disabled={!selectedType}
              style={{ 
                background: selectedType ? 'linear-gradient(135deg, var(--sys-accent), #7C3AED)' : 'var(--sys-button)',
                color: 'var(--sys-text)',
                opacity: selectedType ? 1 : 0.5
              }}
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
