/**
 * Roles Management Page - List all roles with CRUD operations
 * Enforces permission-based UI rendering
 */

import { useState } from 'react';
import { Plus, Edit, Trash2, Search, Shield } from 'lucide-react';
import { useRoles, useDeleteRole } from '../../hooks/useRoles';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { RoleFormModal } from '../../components/roles/RoleFormModal';
import { DeleteRoleDialog } from '../../components/roles/DeleteRoleDialog';
import { usePermissions } from '../../hooks/usePermissions';
import type { RoleListItem } from '../../../../types/dpf';

export default function RolesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleListItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { hasPermission } = usePermissions();
  const { data, isLoading, error } = useRoles({ page, limit: 20, search });
  const deleteRoleMutation = useDeleteRole();

  const canCreate = hasPermission('roles.create');
  const canEdit = hasPermission('roles.update');
  const canDelete = hasPermission('roles.delete');
  const canView = hasPermission('roles.view');

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have permission to view roles.
          </p>
        </div>
      </div>
    );
  }

  const handleCreate = () => {
    setSelectedRole(null);
    setIsFormOpen(true);
  };

  const handleEdit = (role: RoleListItem) => {
    setSelectedRole(role);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (role: RoleListItem) => {
    setSelectedRole(role);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedRole) {
      await deleteRoleMutation.mutateAsync(selectedRole.id);
      setIsDeleteOpen(false);
      setSelectedRole(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>
                Manage roles and their permissions for your organization
              </CardDescription>
            </div>
            {canCreate && (
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Role
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search roles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading roles...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              Error loading roles. Please try again.
            </div>
          ) : !data?.data.length ? (
            <div className="text-center py-8 text-gray-500">
              No roles found. {canCreate && 'Create your first role to get started.'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.roleName}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {role.roleCode}
                        </code>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {role.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.usersCount > 0 ? 'info' : 'default'}>
                          {role.usersCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{role.permissionsCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.isActive === 'true' ? 'success' : 'default'}>
                          {role.isActive === 'true' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(role)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && role.isProtected !== 'true' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(role)}
                              disabled={role.usersCount > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data.pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= data.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <RoleFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        role={selectedRole}
      />

      <DeleteRoleDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        role={selectedRole}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteRoleMutation.isPending}
      />
    </div>
  );
}
