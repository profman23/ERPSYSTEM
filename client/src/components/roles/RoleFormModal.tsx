/**
 * Role Form Modal - Create/Edit Role
 * Handles both create and update operations
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateRole, useUpdateRole } from '../../hooks/useRoles';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import type { RoleListItem, CreateRoleInput, UpdateRoleInput } from '../../../../types/dpf';

interface RoleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleListItem | null;
}

type FormData = {
  roleCode: string;
  roleName: string;
  roleNameAr?: string;
  description?: string;
  descriptionAr?: string;
  isDefault: boolean;
};

export function RoleFormModal({ open, onOpenChange, role }: RoleFormModalProps) {
  const isEditing = !!role;
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      roleCode: '',
      roleName: '',
      roleNameAr: '',
      description: '',
      descriptionAr: '',
      isDefault: false,
    },
  });

  const isDefault = watch('isDefault');

  useEffect(() => {
    if (role && open) {
      reset({
        roleCode: role.roleCode,
        roleName: role.roleName,
        roleNameAr: role.roleNameAr || '',
        description: role.description || '',
        descriptionAr: role.descriptionAr || '',
        isDefault: role.isDefault === 'true',
      });
    } else if (!open) {
      reset();
    }
  }, [role, open, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing) {
        const updateInput: UpdateRoleInput = {
          roleName: data.roleName,
          roleNameAr: data.roleNameAr,
          description: data.description,
          descriptionAr: data.descriptionAr,
          isDefault: data.isDefault,
        };
        await updateMutation.mutateAsync({ id: role.id, input: updateInput });
      } else {
        const createInput: CreateRoleInput = {
          roleCode: data.roleCode,
          roleName: data.roleName,
          roleNameAr: data.roleNameAr,
          description: data.description,
          descriptionAr: data.descriptionAr,
          isDefault: data.isDefault,
        };
        await createMutation.mutateAsync(createInput);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Role' : 'Create New Role'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update role information and settings'
              : 'Create a new role for your organization'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roleCode">
                Role Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="roleCode"
                {...register('roleCode', { required: 'Role code is required' })}
                disabled={isEditing}
                placeholder="e.g., VET_DOCTOR"
              />
              {errors.roleCode && (
                <p className="text-sm text-red-500">{errors.roleCode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleName">
                Role Name (English) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="roleName"
                {...register('roleName', { required: 'Role name is required' })}
                placeholder="e.g., Veterinary Doctor"
              />
              {errors.roleName && (
                <p className="text-sm text-red-500">{errors.roleName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="roleNameAr">Role Name (Arabic)</Label>
            <Input
              id="roleNameAr"
              {...register('roleNameAr')}
              placeholder="e.g., طبيب بيطري"
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (English)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe the role's responsibilities..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descriptionAr">Description (Arabic)</Label>
            <Textarea
              id="descriptionAr"
              {...register('descriptionAr')}
              placeholder="وصف مسؤوليات الدور..."
              rows={3}
              dir="rtl"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDefault"
              checked={isDefault}
              onCheckedChange={(checked) => setValue('isDefault', checked as boolean)}
            />
            <Label htmlFor="isDefault" className="cursor-pointer">
              Set as default role for new users
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
