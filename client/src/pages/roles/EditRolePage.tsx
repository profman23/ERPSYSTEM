/**
 * EditRolePage — Tenant Role Editing (SAP B1 Style)
 * Route: /app/administration/roles/:roleId/edit
 */

import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import {
  useRole,
  useUpdateRole,
  useTenantRoleAuthorizations,
  useUpdateTenantRoleAuthorizations,
} from '@/hooks/useRoles';
import { RoleForm } from '@/components/roles/RoleForm';
import { useDPFModuleTree } from '@/hooks/useDPFModules';
import { useScopePath } from '@/hooks/useScopePath';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { extractApiError } from '@/lib/apiError';
import { useToast } from '@/components/ui/toast';
import type { CreateRoleInput } from '@types/dpf';

const SCREEN_CODE = 'ROLES';

export default function EditRolePage() {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const { getRolesPath } = useScopePath();

  const { data: role, isLoading: isLoadingRole } = useRole(roleId);
  const { data: existingAuthorizations, isLoading: isLoadingAuth } = useTenantRoleAuthorizations(roleId);
  const { data: modules = [], isLoading: modulesLoading } = useDPFModuleTree('tenant');
  const updateRole = useUpdateRole();
  const updateAuth = useUpdateTenantRoleAuthorizations();
  const { canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();

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
      if (data.screenAuthorizations) {
        await updateAuth.mutateAsync({
          roleId,
          authorizations: data.screenAuthorizations,
        });
      }
      showToast('success', 'Role Updated');
      navigate(getRolesPath());
    } catch (err) {
      const apiError = extractApiError(err);
      showToast('error', apiError.message);
    }
  };

  const handleCancel = () => {
    navigate(getRolesPath());
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canModify) {
    return <Navigate to={getRolesPath()} replace />;
  }

  if (isLoadingRole || isLoadingAuth || modulesLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <StyledIcon icon={Loader2} emoji="✏️" className="w-8 h-8 animate-spin text-[var(--color-accent)]" />
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
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isMutating}
      />
    </div>
  );
}
