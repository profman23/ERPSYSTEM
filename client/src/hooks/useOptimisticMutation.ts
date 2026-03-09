/**
 * Optimistic Mutation Hooks
 *
 * High-performance mutations with optimistic updates
 * Provides instant UI feedback while syncing with server
 *
 * Features:
 * - Instant UI updates
 * - Automatic rollback on error
 * - Toast notifications
 * - Cache invalidation
 */

import { useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { queryKeys } from '@/lib/queryKeys';
import { apiClient } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface OptimisticMutationOptions<TData, TVariables, TContext> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: QueryKey;
  optimisticUpdate?: (oldData: unknown, variables: TVariables) => unknown;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void;
  successMessage?: string;
  errorMessage?: string;
  invalidateOnSuccess?: QueryKey[];
}

// ═══════════════════════════════════════════════════════════════
// GENERIC OPTIMISTIC MUTATION HOOK
// ═══════════════════════════════════════════════════════════════

export function useOptimisticMutation<TData, TVariables, TContext = unknown>({
  mutationFn,
  queryKey,
  optimisticUpdate,
  onSuccess,
  onError,
  successMessage,
  errorMessage = 'An error occurred',
  invalidateOnSuccess = [],
}: OptimisticMutationOptions<TData, TVariables, TContext>) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn,

    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update
      if (optimisticUpdate && previousData) {
        queryClient.setQueryData(queryKey, (old: unknown) =>
          optimisticUpdate(old, variables)
        );
      }

      return { previousData } as TContext;
    },

    onError: (error: Error, variables: TVariables, context: TContext | undefined) => {
      // Rollback on error
      if (context && (context as any).previousData) {
        queryClient.setQueryData(queryKey, (context as any).previousData);
      }

      showToast('error', errorMessage, error.message);

      onError?.(error, variables, context);
    },

    onSuccess: (data: TData, variables: TVariables) => {
      if (successMessage) {
        showToast('success', successMessage);
      }

      onSuccess?.(data, variables);
    },

    onSettled: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey });

      invalidateOnSuccess.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// USER ROLE ASSIGNMENT
// ═══════════════════════════════════════════════════════════════

interface AssignRoleVariables {
  userId: string;
  roleId: string;
  roleName?: string;
}

export function useAssignUserRole() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, roleId }: AssignRoleVariables) => {
      const response = await apiClient.post(`/tenant/users/${userId}/roles`, { roleId });
      return response.data;
    },

    onMutate: async ({ userId, roleId, roleName }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.roles(userId) });

      const previousRoles = queryClient.getQueryData(queryKeys.users.roles(userId));

      // Optimistically add role
      queryClient.setQueryData(queryKeys.users.roles(userId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: [...(old.data || []), { roleId, roleName, _optimistic: true }],
        };
      });

      return { previousRoles };
    },

    onError: (error: Error, { userId }, context) => {
      if (context?.previousRoles) {
        queryClient.setQueryData(queryKeys.users.roles(userId), context.previousRoles);
      }
      showToast('error', 'Failed to assign role', error.message);
    },

    onSuccess: (_, { roleName }) => {
      showToast('success', `Role "${roleName || 'assigned'}" successfully`);
    },

    onSettled: (_, __, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.roles(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// REMOVE USER ROLE
// ═══════════════════════════════════════════════════════════════

interface RemoveRoleVariables {
  userId: string;
  roleId: string;
}

export function useRemoveUserRole() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, roleId }: RemoveRoleVariables) => {
      const response = await apiClient.delete(`/tenant/users/${userId}/roles/${roleId}`);
      return response.data;
    },

    onMutate: async ({ userId, roleId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.roles(userId) });

      const previousRoles = queryClient.getQueryData(queryKeys.users.roles(userId));

      // Optimistically remove role
      queryClient.setQueryData(queryKeys.users.roles(userId), (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((r: any) => r.roleId !== roleId),
        };
      });

      return { previousRoles };
    },

    onError: (error: Error, { userId }, context) => {
      if (context?.previousRoles) {
        queryClient.setQueryData(queryKeys.users.roles(userId), context.previousRoles);
      }
      showToast('error', 'Failed to remove role', error.message);
    },

    onSuccess: () => {
      showToast('success', 'Role removed successfully');
    },

    onSettled: (_, __, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.roles(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// UPDATE USER STATUS
// ═══════════════════════════════════════════════════════════════

interface UpdateStatusVariables {
  userId: string;
  status: 'active' | 'inactive' | 'suspended';
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, status }: UpdateStatusVariables) => {
      const response = await apiClient.patch(`/tenant/users/${userId}/status`, { status });
      return response.data;
    },

    onMutate: async ({ userId, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(userId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.users.lists() });

      const previousUser = queryClient.getQueryData(queryKeys.users.detail(userId));
      const previousList = queryClient.getQueryData(queryKeys.users.lists());

      // Optimistically update user detail
      queryClient.setQueryData(queryKeys.users.detail(userId), (old: any) => {
        if (!old) return old;
        return { ...old, status, _optimistic: true };
      });

      // Optimistically update user in list
      queryClient.setQueryData(queryKeys.users.lists(), (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((user: any) =>
            user.id === userId ? { ...user, status, _optimistic: true } : user
          ),
        };
      });

      return { previousUser, previousList };
    },

    onError: (error: Error, { userId }, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.users.detail(userId), context.previousUser);
      }
      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.users.lists(), context.previousList);
      }
      showToast('error', 'Failed to update status', error.message);
    },

    onSuccess: (_, { status }) => {
      showToast('success', `User ${status === 'active' ? 'activated' : status === 'suspended' ? 'suspended' : 'deactivated'} successfully`);
    },

    onSettled: (_, __, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// BULK ROLE ASSIGNMENT
// ═══════════════════════════════════════════════════════════════

interface BulkAssignRolesVariables {
  assignments: { userId: string; roleId: string }[];
}

export function useBulkAssignRoles() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ assignments }: BulkAssignRolesVariables) => {
      const response = await apiClient.post('/bulk/users/assign-roles', { assignments });
      return response.data;
    },

    onSuccess: (data) => {
      showToast('success', `${data.totalProcessed} role assignments completed`, data.totalFailed > 0 ? `${data.totalFailed} failed` : undefined);
    },

    onError: (error: Error) => {
      showToast('error', 'Bulk assignment failed', error.message);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// DELETE ENTITY (Generic)
// ═══════════════════════════════════════════════════════════════

interface DeleteEntityOptions {
  endpoint: string;
  queryKey: QueryKey;
  entityName: string;
}

export function useDeleteEntity({ endpoint, queryKey, entityName }: DeleteEntityOptions) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`${endpoint}/${id}`);
      return response.data;
    },

    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically remove from list
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((item: any) => item.id !== id),
        };
      });

      return { previousData };
    },

    onError: (error: Error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      showToast('error', `Failed to delete ${entityName}`, error.message);
    },

    onSuccess: () => {
      showToast('success', `${entityName} deleted successfully`);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export default {
  useOptimisticMutation,
  useAssignUserRole,
  useRemoveUserRole,
  useUpdateUserStatus,
  useBulkAssignRoles,
  useDeleteEntity,
};
