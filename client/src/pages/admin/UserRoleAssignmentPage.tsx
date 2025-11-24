import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRoleAssignmentDrawer } from '@/components/roles/UserRoleAssignmentDrawer';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/providers/SocketProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { useRoles } from '@/hooks/useRoles';
import { useUser, useUserRoles, useBatchAssignRoles, useBatchRemoveRoles } from '@/hooks/useUserRoles';
import { ArrowLeft, Loader2, Shield, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import type { DPFPermission } from '../../../../types/dpf';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function UserRoleAssignmentPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { socket } = useSocket();
  const { hasPermission } = usePermissions();
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [allPermissions, setAllPermissions] = useState<DPFPermission[]>([]);

  const canAssignRoles = hasPermission('roles.assign');
  const canViewRoles = hasPermission('roles.view');
  const canViewUsers = hasPermission('users.view');

  const { data: user, isLoading: isLoadingUser, error: userError } = useUser(userId);
  const { data: userRoles = [], isLoading: isLoadingRoles } = useUserRoles(userId);
  const { data: rolesData, isLoading: isLoadingAllRoles } = useRoles({ page: 1, limit: 100 });
  const batchAssignMutation = useBatchAssignRoles();
  const batchRemoveMutation = useBatchRemoveRoles();

  const allRoles = rolesData?.data || [];
  const currentRoles = userRoles.map(ur => allRoles.find(r => r.id === ur.roleId)).filter(Boolean) as any[];

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!accessToken) return;
      try {
        const response = await axios.get<{ data: DPFPermission[] }>(
          `${API_BASE}/tenant/permissions/all`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        setAllPermissions(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
      }
    };
    fetchPermissions();
  }, [accessToken]);

  useEffect(() => {
    if (!socket) return;

    const handleUserRoleUpdated = (data: any) => {
      if (data.userId === userId) {
        console.log('User role updated via Socket.IO:', data);
      }
    };

    const handleRoleUpdated = () => {
      console.log('Role updated via Socket.IO - refreshing data');
    };

    const handlePermissionsUpdated = () => {
      console.log('Permissions updated via Socket.IO - refreshing data');
    };

    socket.on('user-role-updated', handleUserRoleUpdated);
    socket.on('role-updated', handleRoleUpdated);
    socket.on('permissions-updated', handlePermissionsUpdated);

    return () => {
      socket.off('user-role-updated', handleUserRoleUpdated);
      socket.off('role-updated', handleRoleUpdated);
      socket.off('permissions-updated', handlePermissionsUpdated);
    };
  }, [socket, userId]);

  const handleSaveRoles = async (selectedRoleIds: string[]) => {
    if (!userId) return;

    const currentRoleIds = new Set(currentRoles.map(r => r.id));
    const selectedRoleIdsSet = new Set(selectedRoleIds);

    const toAssign = selectedRoleIds.filter(id => !currentRoleIds.has(id));
    const toRemove = Array.from(currentRoleIds).filter(id => !selectedRoleIdsSet.has(id));

    try {
      if (toRemove.length > 0) {
        await batchRemoveMutation.mutateAsync({ userId, roleIds: toRemove });
      }
      
      if (toAssign.length > 0) {
        await batchAssignMutation.mutateAsync({ userId, roleIds: toAssign });
      }
    } catch (error) {
      throw error;
    }
  };

  if (!canViewUsers || !canViewRoles) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have permission to view user roles.
            </p>
            <Button onClick={() => navigate('/users')} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingUser || isLoadingRoles || isLoadingAllRoles) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Error</h2>
          <p className="mt-2 text-muted-foreground">
            {axios.isAxiosError(userError) ? userError.response?.data?.error : 'Failed to load user'}
          </p>
          <Button onClick={() => navigate('/users')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  const currentPermissions = allPermissions.filter(p => 
    currentRoles.some(r => r.id === p.moduleId || p.permissionCode.startsWith(r.roleCode))
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/users')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Role Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage roles and permissions for <span className="font-semibold">{user.firstName} {user.lastName}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Basic user details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Full Name</p>
              <p className="text-sm">{user.firstName} {user.lastName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={user.status === 'active' ? 'success' : 'default'}>
                {user.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created At</p>
              <p className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Assigned Roles
            </CardTitle>
            <CardDescription>
              Current roles for this user ({currentRoles.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {currentRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No roles assigned
                </p>
              ) : (
                currentRoles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <div>
                      <p className="text-sm font-medium">{role.roleName}</p>
                      <p className="text-xs text-muted-foreground">{role.roleCode}</p>
                    </div>
                    {role.isProtected === 'true' && (
                      <Badge variant="warning" className="text-xs">Protected</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {canAssignRoles && (
              <Button
                onClick={() => setIsDrawerOpen(true)}
                className="w-full mt-4"
              >
                <Settings className="mr-2 h-4 w-4" />
                Manage Roles
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Effective Permissions</CardTitle>
          <CardDescription>
            All permissions granted to this user through assigned roles ({currentPermissions.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto">
            {currentPermissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No permissions granted. Assign roles to grant permissions.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {currentPermissions.map((perm) => (
                  <div
                    key={perm.id}
                    className="text-xs p-2 rounded border bg-gray-50"
                  >
                    <div className="font-medium">{perm.permissionCode}</div>
                    <div className="text-muted-foreground truncate">
                      {perm.permissionName}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <UserRoleAssignmentDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        user={user}
        currentRoles={currentRoles}
        allRoles={allRoles}
        allPermissions={allPermissions}
        currentPermissions={currentPermissions}
        onSave={handleSaveRoles}
        isSaving={batchAssignMutation.isPending || batchRemoveMutation.isPending}
      />
    </div>
  );
}
