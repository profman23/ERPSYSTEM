import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { PermissionTree } from './PermissionTree';
import { Loader2 } from 'lucide-react';
import type { PermissionMatrixModule, DPFPermission, AssignPermissionsInput } from '@types/dpf';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

interface PermissionMatrixProps {
  roleId: string;
  roleName: string;
  accessToken: string;
}

export function PermissionMatrix({ roleId, roleName, accessToken }: PermissionMatrixProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  const { data: matrixData, isLoading: isLoadingMatrix } = useQuery({
    queryKey: ['permission-matrix'],
    queryFn: async () => {
      const response = await axios.get<{ data: PermissionMatrixModule[] }>(
        `${API_BASE}/tenant/dpf/permissions/matrix`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return response.data.data;
    },
  });

  const { data: rolePermissionsData, isLoading: isLoadingRolePermissions } = useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: async () => {
      const response = await axios.get<{ data: DPFPermission[] }>(
        `${API_BASE}/tenant/dpf/permissions/roles/${roleId}/permissions`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return response.data.data;
    },
    enabled: !!roleId,
  });

  useEffect(() => {
    if (rolePermissionsData) {
      const codes = new Set(rolePermissionsData.map(p => p.permissionCode));
      setSelectedPermissions(codes);
      setHasChanges(false);
    }
  }, [rolePermissionsData]);

  const savePermissionsMutation = useMutation({
    mutationFn: async (permissionIds: string[]) => {
      const payload: AssignPermissionsInput = {
        roleId,
        permissionIds,
      };
      const response = await axios.post(
        `${API_BASE}/tenant/dpf/permissions/roles/${roleId}/permissions`,
        payload,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', roleId] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setHasChanges(false);
      showToast('success', 'Permissions updated successfully');
    },
    onError: (error: any) => {
      showToast('error', error.response?.data?.error || 'Failed to update permissions');
    },
  });

  const handlePermissionToggle = (permissionCode: string, checked: boolean) => {
    const newSet = new Set(selectedPermissions);
    if (checked) {
      newSet.add(permissionCode);
    } else {
      newSet.delete(permissionCode);
    }
    setSelectedPermissions(newSet);
    setHasChanges(true);
  };

  const handleModuleToggle = (moduleCode: string, checked: boolean) => {
    if (!matrixData) return;
    
    const module = matrixData.find(m => m.module.moduleCode === moduleCode);
    if (!module) return;

    const newSet = new Set(selectedPermissions);
    module.screens.forEach(screen => {
      screen.actions.forEach(action => {
        if (checked) {
          newSet.add(action.actionCode);
        } else {
          newSet.delete(action.actionCode);
        }
      });
    });

    setSelectedPermissions(newSet);
    setHasChanges(true);
  };

  const handleScreenToggle = (moduleCode: string, screenCode: string, checked: boolean) => {
    if (!matrixData) return;

    const module = matrixData.find(m => m.module.moduleCode === moduleCode);
    if (!module) return;

    const screen = module.screens.find(s => s.screen.screenCode === screenCode);
    if (!screen) return;

    const newSet = new Set(selectedPermissions);
    screen.actions.forEach(action => {
      if (checked) {
        newSet.add(action.actionCode);
      } else {
        newSet.delete(action.actionCode);
      }
    });

    setSelectedPermissions(newSet);
    setHasChanges(true);
  };

  const handleSelectAll = () => {
    if (!matrixData) return;

    const allPermissions = new Set<string>();
    matrixData.forEach(module => {
      module.screens.forEach(screen => {
        screen.actions.forEach(action => {
          allPermissions.add(action.actionCode);
        });
      });
    });

    setSelectedPermissions(allPermissions);
    setHasChanges(true);
  };

  const handleDeselectAll = () => {
    setSelectedPermissions(new Set());
    setHasChanges(true);
  };

  const handleReset = () => {
    if (rolePermissionsData) {
      const codes = new Set(rolePermissionsData.map(p => p.permissionCode));
      setSelectedPermissions(codes);
      setHasChanges(false);
    }
  };

  const handleSave = async () => {
    if (!matrixData) return;

    const permissionIds: string[] = [];
    matrixData.forEach(module => {
      module.screens.forEach(screen => {
        screen.actions.forEach(action => {
          if (selectedPermissions.has(action.actionCode)) {
            const permission = screen.actionPermissions.find(
              p => p.permissionCode === action.actionCode
            );
            if (permission) {
              permissionIds.push(permission.id);
            }
          }
        });
      });
    });

    await savePermissionsMutation.mutateAsync(permissionIds);
  };

  if (isLoadingMatrix || isLoadingRolePermissions) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!matrixData || matrixData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            No permissions available
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPermissions = matrixData.reduce(
    (acc, module) => acc + module.screens.reduce((sum, screen) => sum + screen.actions.length, 0),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Permissions for "{roleName}"</CardTitle>
        <CardDescription>
          Select permissions to grant to this role. Changes are saved immediately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedPermissions.size} / {totalPermissions} permissions selected
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={savePermissionsMutation.isPending}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                disabled={savePermissionsMutation.isPending}
              >
                Deselect All
              </Button>
            </div>
          </div>

          <div className="border rounded-lg p-4 max-h-[600px] overflow-y-auto">
            <PermissionTree
              modules={matrixData}
              selectedPermissions={selectedPermissions}
              onPermissionToggle={handlePermissionToggle}
              onModuleToggle={handleModuleToggle}
              onScreenToggle={handleScreenToggle}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || savePermissionsMutation.isPending}
            >
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || savePermissionsMutation.isPending}
            >
              {savePermissionsMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
