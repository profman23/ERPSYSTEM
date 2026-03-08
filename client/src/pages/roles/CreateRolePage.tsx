/**
 * CreateRolePage — Tenant Role Creation (SAP B1 Style)
 * Route: /app/administration/roles/create
 */

import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useCreateRoleWithAuthorizations } from '@/hooks/useRoles';
import { RoleForm } from '@/components/roles/RoleForm';
import { useDPFModuleTree } from '@/hooks/useDPFModules';
import { useScopePath } from '@/hooks/useScopePath';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { extractApiError } from '@/lib/apiError';
import { useToast } from '@/components/ui/toast';
import type { CreateRoleInput } from '@types/dpf';

const SCREEN_CODE = 'ROLES';

export default function CreateRolePage() {
  const navigate = useNavigate();
  const { getRolesPath } = useScopePath();
  const createWithAuth = useCreateRoleWithAuthorizations();
  const { data: modules = [], isLoading: modulesLoading } = useDPFModuleTree('tenant');
  const { canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);
  const { showToast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (data: CreateRoleInput) => {
    try {
      await createWithAuth.mutateAsync(data);
      showToast('success', t('roles.roleCreated'));
      navigate(getRolesPath());
    } catch (err) {
      const apiError = extractApiError(err);
      showToast('error', apiError.message);
    }
  };

  const handleCancel = () => {
    navigate(getRolesPath());
  };

  if (permissionsLoading || modulesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canModify) {
    return <Navigate to={getRolesPath()} replace />;
  }

  return (
    <div className="p-6">
      <RoleForm
        mode="create"
        modules={modules}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={createWithAuth.isPending}
      />
    </div>
  );
}
