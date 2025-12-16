import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Eye, Edit, Shield, User, Building2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAllUsers, useTenants } from '@/hooks/useHierarchy';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { VirtualizedTable, Column } from '@/components/ui/VirtualizedTable';

type UserTypeSelection = 'system' | 'tenant_admin' | null;

interface UserRecord {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  code?: string;
  phone?: string;
  avatarUrl?: string;
  accessScope?: string;
  status?: string;
  roleCount?: number;
  tenantId?: string;
}

const getScopeStyle = (scope: string) => {
  switch (scope) {
    case 'system':
      return { backgroundColor: 'color-mix(in srgb, var(--sys-accent) 20%, transparent)', color: 'var(--sys-accent)', borderColor: 'color-mix(in srgb, var(--sys-accent) 30%, transparent)' };
    case 'tenant':
      return { backgroundColor: 'var(--badge-info-bg)', color: 'var(--color-text-info)', borderColor: 'var(--badge-info-border)' };
    case 'business_line':
      return { backgroundColor: 'color-mix(in srgb, var(--color-info) 20%, transparent)', color: 'var(--color-info)', borderColor: 'color-mix(in srgb, var(--color-info) 30%, transparent)' };
    case 'branch':
      return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--color-text-success)', borderColor: 'var(--badge-success-border)' };
    case 'mixed':
      return { backgroundColor: 'var(--badge-warning-bg)', color: 'var(--color-text-warning)', borderColor: 'var(--badge-warning-border)' };
    default:
      return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--color-text-success)', borderColor: 'var(--badge-success-border)' };
  }
};

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

  const handleRowClick = useCallback((user: UserRecord) => {
    navigate(`/system/users/${user.id}`);
  }, [navigate]);

  const userColumns: Column<UserRecord>[] = useMemo(() => [
    {
      key: 'name' as keyof UserRecord,
      header: 'User',
      width: 280,
      render: (_: unknown, user: UserRecord) => (
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={getUserDisplayName(user)} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--sys-accent) 20%, transparent)' }}
            >
              <User className="w-4 h-4" style={{ color: 'var(--sys-accent)' }} />
            </div>
          )}
          <div>
            <p className="font-medium" style={{ color: 'var(--sys-text)' }}>{getUserDisplayName(user)}</p>
            <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'code' as keyof UserRecord,
      header: 'Code',
      width: 120,
      render: (value: unknown) => value ? (
        <code 
          className="text-sm px-2 py-1 rounded"
          style={{ backgroundColor: 'var(--sys-bg)', color: 'var(--sys-text-secondary)' }}
        >
          {String(value)}
        </code>
      ) : (
        <span style={{ color: 'var(--sys-text-muted)' }}>-</span>
      ),
    },
    {
      key: 'accessScope' as keyof UserRecord,
      header: 'Scope',
      width: 100,
      render: (value: unknown) => (
        <Badge className="border" style={getScopeStyle(String(value || 'branch'))}>
          {String(value || 'branch')}
        </Badge>
      ),
    },
    {
      key: 'phone' as keyof UserRecord,
      header: 'Contact',
      width: 130,
      render: (value: unknown) => value ? (
        <span style={{ color: 'var(--sys-text-secondary)' }}>{String(value)}</span>
      ) : (
        <span style={{ color: 'var(--sys-text-muted)' }}>-</span>
      ),
    },
    {
      key: 'roleCount' as keyof UserRecord,
      header: 'Role',
      width: 100,
      render: (value: unknown) => value ? (
        <span className="flex items-center gap-1" style={{ color: 'var(--sys-text-secondary)' }}>
          <Shield className="w-3 h-3" />
          {Number(value)} role{Number(value) !== 1 ? 's' : ''}
        </span>
      ) : (
        <span style={{ color: 'var(--sys-text-muted)' }}>No roles</span>
      ),
    },
    {
      key: 'status' as keyof UserRecord,
      header: 'Status',
      width: 100,
      render: (value: unknown) => (
        <Badge className="border" style={getStatusStyle(String(value || 'active'))}>
          {String(value || 'active')}
        </Badge>
      ),
    },
    {
      key: 'id' as keyof UserRecord,
      header: 'Actions',
      width: 130,
      render: (_: unknown, user: UserRecord) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); navigate(`/system/users/${user.id}`); }}
            title="View"
            style={{ color: 'var(--sys-text-secondary)' }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); navigate(`/system/users/${user.id}/edit`); }}
            title="Edit"
            style={{ color: 'var(--sys-text-secondary)' }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); navigate(`/system/users/${user.id}/roles`); }}
            title="Manage Roles"
            style={{ color: 'var(--sys-text-secondary)' }}
          >
            <Shield className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ], [navigate]);

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
            background: 'linear-gradient(135deg, var(--sys-accent), var(--sys-accent-hover))', 
            color: 'var(--color-text-on-accent)' 
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
            <LoadingState size="lg" message="Loading users..." fullPage />
          ) : error ? (
            <ErrorState
              title="Error Loading Users"
              message={(error as any)?.message || 'Failed to load users. Please try again.'}
              retryAction={() => window.location.reload()}
              variant="page"
            />
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={searchQuery ? 'No Matching Users' : 'No Users Yet'}
              description={searchQuery ? 'Try adjusting your search' : 'Create your first user to get started'}
              action={!searchQuery ? {
                label: 'Add User',
                onClick: () => setShowUserTypeSelector(true),
                icon: Plus,
              } : undefined}
            />
          ) : (
            <VirtualizedTable<UserRecord>
              columns={userColumns}
              data={filteredUsers as UserRecord[]}
              height={500}
              rowHeight={56}
              onRowClick={handleRowClick}
              emptyMessage="No users found"
            />
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
                  className="relative p-4 rounded-lg border-2 text-left transition-all duration-200"
                  style={{ 
                    backgroundColor: isSelected 
                      ? 'color-mix(in srgb, var(--sys-accent) 10%, transparent)'
                      : 'var(--sys-bg)',
                    borderColor: isSelected 
                      ? 'color-mix(in srgb, var(--sys-accent) 50%, transparent)'
                      : 'var(--sys-border)'
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="p-3 rounded-lg"
                      style={{ 
                        background: 'linear-gradient(135deg, var(--sys-accent), var(--sys-accent-hover))',
                        color: 'var(--color-text-on-accent)'
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
                          style={{ backgroundColor: 'var(--sys-accent)' }}
                        >
                          <svg className="w-4 h-4" fill="var(--color-text-on-accent)" viewBox="0 0 20 20">
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
                background: selectedType ? 'linear-gradient(135deg, var(--sys-accent), var(--sys-accent-hover))' : 'var(--sys-button)',
                color: 'var(--color-text-on-accent)',
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
