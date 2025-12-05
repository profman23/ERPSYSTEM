import { useState } from 'react';
import { Shield, Plus, Settings, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const systemRoles = [
  {
    id: 'SYSTEM_ADMIN',
    name: 'System Administrator',
    code: 'SYSTEM_ADMIN',
    description: 'Full platform access with all permissions. Can manage all tenants, users, and system configurations.',
    isProtected: true,
    isDefault: true,
    userCount: 1,
    permissions: ['*'],
    accessScope: 'system'
  },
  {
    id: 'SYSTEM_SUPPORT',
    name: 'System Support',
    code: 'SYSTEM_SUPPORT',
    description: 'Read-only access to platform resources for support and troubleshooting purposes.',
    isProtected: true,
    isDefault: false,
    userCount: 0,
    permissions: ['system.view', 'tenants.view', 'users.view'],
    accessScope: 'system'
  },
  {
    id: 'BILLING_SUPPORT',
    name: 'Billing Support',
    code: 'BILLING_SUPPORT',
    description: 'Access to billing, subscriptions, and payment information across all tenants.',
    isProtected: true,
    isDefault: false,
    userCount: 0,
    permissions: ['billing.view', 'billing.update', 'subscriptions.view'],
    accessScope: 'system'
  }
];

export default function SystemRolesPage() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--sys-text)' }}>System Roles</h1>
          <p className="mt-2" style={{ color: 'var(--sys-text-secondary)' }}>
            Manage platform-wide system roles (not tenant roles)
          </p>
        </div>
        <Button 
          className="transition-colors"
          style={{ 
            background: 'linear-gradient(135deg, var(--sys-accent), #7C3AED)', 
            color: 'var(--sys-text)' 
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create System Role
        </Button>
      </div>

      <div 
        className="p-4 rounded-lg border"
        style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}
      >
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 mt-0.5" style={{ color: 'var(--sys-accent)' }} />
          <div>
            <h4 className="font-medium" style={{ color: 'var(--sys-text)' }}>System Roles Only</h4>
            <p className="text-sm mt-1" style={{ color: 'var(--sys-text-secondary)' }}>
              This page displays only system-level roles (SYSTEM_ADMIN, SYSTEM_SUPPORT, BILLING_SUPPORT). 
              Tenant-specific roles like TENANT_ADMIN are managed within each tenant's admin panel.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {systemRoles.map((role) => (
          <div
            key={role.id}
            className="rounded-xl border p-6 transition-all cursor-pointer"
            style={{ 
              backgroundColor: selectedRole === role.id ? 'var(--sys-surface-hover)' : 'var(--sys-surface)', 
              borderColor: selectedRole === role.id ? 'var(--sys-accent)' : 'var(--sys-border)'
            }}
            onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div 
                  className="p-3 rounded-lg"
                  style={{ 
                    background: role.code === 'SYSTEM_ADMIN' 
                      ? 'linear-gradient(135deg, var(--sys-accent), #7C3AED)'
                      : 'var(--sys-button)'
                  }}
                >
                  <Shield className="w-6 h-6" style={{ color: 'var(--sys-text)' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--sys-text)' }}>
                      {role.name}
                    </h3>
                    {role.isProtected && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 border">
                        <Lock className="w-3 h-3 mr-1" />
                        Protected
                      </Badge>
                    )}
                    {role.isDefault && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
                        Default
                      </Badge>
                    )}
                  </div>
                  <code 
                    className="text-sm px-2 py-1 rounded mt-1 inline-block"
                    style={{ backgroundColor: 'var(--sys-bg)', color: 'var(--sys-text-secondary)' }}
                  >
                    {role.code}
                  </code>
                  <p className="mt-2 text-sm" style={{ color: 'var(--sys-text-secondary)' }}>
                    {role.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2" style={{ color: 'var(--sys-text-muted)' }}>
                <Users className="w-4 h-4" />
                <span className="text-sm">{role.userCount} user{role.userCount !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {selectedRole === role.id && (
              <div 
                className="mt-4 pt-4 border-t"
                style={{ borderColor: 'var(--sys-border)' }}
              >
                <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--sys-text)' }}>
                  Permissions
                </h4>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map((perm, idx) => (
                    <Badge 
                      key={idx}
                      className="border"
                      style={{ 
                        backgroundColor: perm === '*' ? 'rgba(139, 92, 246, 0.2)' : 'var(--sys-button)',
                        color: perm === '*' ? 'var(--sys-accent)' : 'var(--sys-text-secondary)',
                        borderColor: perm === '*' ? 'rgba(139, 92, 246, 0.3)' : 'var(--sys-border)'
                      }}
                    >
                      {perm === '*' ? '✦ Wildcard (All Permissions)' : perm}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={role.isProtected}
                    style={{ 
                      backgroundColor: 'var(--sys-button)', 
                      borderColor: 'var(--sys-border)', 
                      color: 'var(--sys-text)' 
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div 
        className="rounded-xl border p-6 text-center"
        style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}
      >
        <Settings className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--sys-text-muted)' }} />
        <p className="text-lg font-medium" style={{ color: 'var(--sys-text-secondary)' }}>
          Additional Role Management
        </p>
        <p className="mt-2" style={{ color: 'var(--sys-text-muted)' }}>
          Custom system role creation and advanced permission configuration coming in Phase 2
        </p>
      </div>
    </div>
  );
}
