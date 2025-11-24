import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { PermissionMatrix } from '@/components/permissions/PermissionMatrix';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { DPFRole } from '../../../../types/dpf';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function RolePermissionsPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const { data: role, isLoading, error } = useQuery({
    queryKey: ['role', roleId],
    queryFn: async () => {
      const response = await axios.get<{ data: DPFRole }>(
        `${API_BASE}/tenant/roles/${roleId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return response.data.data;
    },
    enabled: !!roleId && !!accessToken,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Error</h2>
          <p className="mt-2 text-muted-foreground">
            {axios.isAxiosError(error) ? error.response?.data?.error : 'Failed to load role'}
          </p>
          <Button onClick={() => navigate('/admin/roles')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roles
          </Button>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Role Not Found</h2>
          <p className="mt-2 text-muted-foreground">
            The requested role could not be found.
          </p>
          <Button onClick={() => navigate('/admin/roles')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/roles')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Roles
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Permissions</h1>
            <p className="text-muted-foreground mt-1">
              Configure permissions for role: <span className="font-semibold">{role.roleName}</span>
            </p>
          </div>
        </div>
      </div>

      <PermissionMatrix
        roleId={roleId!}
        roleName={role.roleName}
        accessToken={accessToken!}
      />
    </div>
  );
}
