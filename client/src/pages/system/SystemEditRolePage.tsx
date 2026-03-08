/**
 * SystemEditRolePage — System Role Editing (SAP B1 Style)
 * Route: /system/administration/roles/:roleId/edit
 */

import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  useSystemRole,
  useUpdateSystemRole,
  useRoleAuthorizations,
  useUpdateRoleAuthorizations,
} from '@/hooks/useSystemRoles';
import { RoleForm } from '@/components/roles/RoleForm';
import { useDPFModuleTree } from '@/hooks/useDPFModules';
import { useToast } from '@/components/ui/toast';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import type { CreateRoleInput } from '@types/dpf';

const SCREEN_CODE = 'SYSTEM_ROLE_LIST';

export default function SystemEditRolePage() {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);

  const { data: role, isLoading: isLoadingRole } = useSystemRole(roleId);
  const { data: existingAuthorizations, isLoading: isLoadingAuth } = useRoleAuthorizations(roleId);

  // Determine module scope based on role type
  const moduleScope = role?.roleType === 'SYSTEM' ? 'system' : 'tenant';
  const { data: modules = [], isLoading: modulesLoading } = useDPFModuleTree(moduleScope, { enabled: !!role, useSystemEndpoint: true });
  const updateRole = useUpdateSystemRole();
  const updateAuth = useUpdateRoleAuthorizations();

  const handleSubmit = async (data: CreateRoleInput) => {
    if (!roleId) return;
    try {
      await updateRole.mutateAsync({
        id: roleId,
        input: {
          roleName: data.roleName,
          description: data.description,
        },
      });
      await updateAuth.mutateAsync({
        roleId,
        authorizations: data.screenAuthorizations || {},
      });
      showToast('success', `Role "${data.roleName}" updated successfully`);
      navigate('/system/administration/roles');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to update role');
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

  if (isLoadingRole || isLoadingAuth || modulesLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)]" />
        <span className="ml-3 text-[var(--color-text-secondary)]">Loading role...</span>
      </div>
    );
  }

  const isMutating = updateRole.isPending || updateAuth.isPending;

  return (
    <div className="p-6">
      <RoleForm
        mode="edit"
        role={role}
        existingAuthorizations={existingAuthorizations || {}}
        modules={modules}
        isSystem
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isMutating}
      />
    </div>
  );
}
