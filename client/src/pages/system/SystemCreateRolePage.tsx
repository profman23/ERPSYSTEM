/**
 * SystemCreateRolePage — System Role Creation (SAP B1 Style)
 * Route: /system/administration/roles/create
 */

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, Shield, Building2 } from 'lucide-react';
import { useCreateSystemRole } from '@/hooks/useSystemRoles';
import { RoleForm } from '@/components/roles/RoleForm';
import { useDPFModuleTree } from '@/hooks/useDPFModules';
import { useToast } from '@/components/ui/toast';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import type { CreateRoleInput } from '@types/dpf';

const SCREEN_CODE = 'SYSTEM_ROLE_LIST';

export default function SystemCreateRolePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createRole = useCreateSystemRole();
  const { canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);

  const [roleType, setRoleType] = useState<'SYSTEM' | 'TENANT'>('SYSTEM');
  const moduleScope = roleType === 'SYSTEM' ? 'system' : 'tenant';
  const { data: modules = [], isLoading: modulesLoading } = useDPFModuleTree(moduleScope, { useSystemEndpoint: true });

  const handleSubmit = async (data: CreateRoleInput) => {
    try {
      await createRole.mutateAsync({ ...data, isSystemRole: roleType === 'SYSTEM' });
      showToast('success', `Role "${data.roleName}" created successfully`);
      navigate('/system/administration/roles');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      showToast('error', err.response?.data?.error || 'Failed to create role');
    }
  };

  const handleCancel = () => {
    navigate('/system/administration/roles');
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canModify) {
    return <Navigate to="/system/administration/roles" replace />;
  }

  return (
    <div className="p-6 space-y-4">
      {/* Role Type Selector */}
      <div className="flex gap-3 max-w-2xl">
        <button
          type="button"
          onClick={() => setRoleType('SYSTEM')}
          className="flex-1 flex items-center gap-3 p-3 rounded-lg border transition-colors"
          style={{
            borderColor: roleType === 'SYSTEM' ? 'var(--color-accent)' : 'var(--color-border)',
            backgroundColor: roleType === 'SYSTEM' ? 'var(--color-accent-subtle)' : 'var(--color-surface)',
          }}
        >
          <Shield className="w-5 h-5" style={{ color: roleType === 'SYSTEM' ? 'var(--color-accent)' : 'var(--color-text-muted)' }} />
          <div className="text-start">
            <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>System Role</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Platform-wide administration</div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setRoleType('TENANT')}
          className="flex-1 flex items-center gap-3 p-3 rounded-lg border transition-colors"
          style={{
            borderColor: roleType === 'TENANT' ? 'var(--color-accent)' : 'var(--color-border)',
            backgroundColor: roleType === 'TENANT' ? 'var(--color-accent-subtle)' : 'var(--color-surface)',
          }}
        >
          <Building2 className="w-5 h-5" style={{ color: roleType === 'TENANT' ? 'var(--color-accent)' : 'var(--color-text-muted)' }} />
          <div className="text-start">
            <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Tenant Role</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Tenant-level administration</div>
          </div>
        </button>
      </div>

      {modulesLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
        </div>
      ) : (
        <RoleForm
          mode="create"
          modules={modules}
          isSystem={roleType === 'SYSTEM'}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={createRole.isPending}
        />
      )}
    </div>
  );
}
