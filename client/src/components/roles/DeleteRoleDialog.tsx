/**
 * Delete Role Confirmation Dialog
 * Prevents deletion if users are assigned
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import type { RoleListItem } from '../../../../types/dpf';

interface DeleteRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleListItem | null;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteRoleDialog({
  open,
  onOpenChange,
  role,
  onConfirm,
  isDeleting,
}: DeleteRoleDialogProps) {
  if (!role) return null;

  const hasUsers = role.usersCount > 0;
  const isProtected = role.isProtected === 'true';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Role</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this role?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">{role.roleName}</h4>
            <p className="text-sm text-gray-600">{role.description || 'No description'}</p>
            <div className="mt-2 text-sm">
              <span className="text-gray-500">Code:</span>{' '}
              <code className="bg-white px-2 py-1 rounded text-xs">{role.roleCode}</code>
            </div>
          </div>

          {isProtected && (
            <Alert variant="error">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Protected Role</AlertTitle>
              <AlertDescription>
                This is a protected system role and cannot be deleted.
              </AlertDescription>
            </Alert>
          )}

          {hasUsers && (
            <Alert variant="error">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Cannot Delete</AlertTitle>
              <AlertDescription>
                This role has {role.usersCount} user(s) assigned. Please reassign or remove
                users before deleting this role.
              </AlertDescription>
            </Alert>
          )}

          {!hasUsers && !isProtected && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                This action cannot be undone. All permissions associated with this role will
                be permanently deleted.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={onConfirm}
            disabled={hasUsers || isProtected || isDeleting}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            {isDeleting ? 'Deleting...' : 'Delete Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
