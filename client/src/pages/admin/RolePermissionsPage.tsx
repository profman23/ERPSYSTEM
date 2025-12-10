import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { PermissionMatrix } from '@/components/permissions/PermissionMatrix';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import type { DPFRole } from '../../../../types/dpf';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function RolePermissionsPage() {
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
        <LoadingState size="lg" message="Loading role..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Error"
          message={axios.isAxiosError(error) ? error.response?.data?.error : 'Failed to load role'}
          variant="page"
          retryAction={() => navigate('/roles')}
          retryLabel="Back to Roles"
        />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Role Not Found</h2>
          <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            The requested role could not be found.
          </p>
          <Button onClick={() => navigate('/roles')} className="mt-4">
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
          onClick={() => navigate('/roles')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Roles
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
              Manage Permissions
            </h1>
            <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
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
