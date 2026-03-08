/**
 * React Query Hooks for User Role Management
 * Uses apiClient exclusively for consistent auth, dedup, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { DPFRole, DPFUserRole } from '@types/dpf';
import axios from 'axios';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
  tenantId?: string;
  branchId?: string;
  businessLineId?: string;
  accessScope?: string;
}

export interface UserWithRoles extends User {
  roles: DPFRole[];
  assignedRoles: DPFUserRole[];
}

export interface AssignRoleInput {
  userId: string;
  roleId: string;
  expiresAt?: Date;
}

export interface RemoveRoleInput {
  userId: string;
  roleId: string;
}

/**
 * Get user's current role assignment
 * System scope: GET /api/v1/system/users/:userId/roles
 * Tenant scope: GET /api/v1/tenant/dpf/user-roles/:userId
 */
export function useUserRoles(userId: string | undefined, options?: { isSystemScope?: boolean }) {
  const { user } = useAuth();
  const isSystemScope = options?.isSystemScope ?? user?.accessScope === 'system';

  return useQuery({
    queryKey: ['user-roles', userId, isSystemScope],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      const endpoint = isSystemScope
        ? `/system/users/${userId}/roles`
        : `/tenant/dpf/user-roles/${userId}`;

      try {
        const response = await apiClient.get(endpoint);
        const data = response.data.data;
        return Array.isArray(data) ? data : (data ? [data] : []);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!userId,
  });
}

/**
 * User context response from the hierarchy endpoint
 */
interface UserContextResponse {
  user: User;
  tenant?: { id: string; name: string; code: string };
  branch?: { id: string; name: string; code: string };
  businessLine?: { id: string; name: string; code: string };
}

/**
 * Get single user details with context
 * GET /api/v1/hierarchy/users/:userId/context
 */
export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      const response = await apiClient.get(`/hierarchy/users/${userId}/context`);
      const context: UserContextResponse = response.data.data;

      return {
        ...context.user,
        tenantId: context.user.tenantId || context.tenant?.id,
        tenant: context.tenant,
        branch: context.branch,
        businessLine: context.businessLine,
      };
    },
    enabled: !!userId,
  });
}

export function useUsers(params?: { page?: number; limit?: number; search?: string; roleId?: string }) {
  const { page = 1, limit = 20, search = '', roleId } = params || {};

  return useQuery({
    queryKey: ['users', page, limit, search, roleId],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(roleId && { roleId }),
      });

      const response = await apiClient.get(`/tenant/users?${queryParams}`);
      return response.data;
    },
  });
}

/**
 * Assign role to user (ONE ROLE PER USER model - replaces existing)
 */
export function useAssignRole(options?: { isSystemScope?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSystemScope = options?.isSystemScope ?? user?.accessScope === 'system';

  return useMutation({
    mutationFn: async ({ userId, roleId, expiresAt }: AssignRoleInput) => {
      const endpoint = isSystemScope
        ? `/system/users/${userId}/roles`
        : `/tenant/dpf/user-roles`;

      const response = await apiClient.post(endpoint, { userId, roleId, expiresAt });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}

/**
 * Remove role from user
 */
export function useRemoveRole(options?: { isSystemScope?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSystemScope = options?.isSystemScope ?? user?.accessScope === 'system';

  return useMutation({
    mutationFn: async ({ userId }: RemoveRoleInput) => {
      const endpoint = isSystemScope
        ? `/system/users/${userId}/roles`
        : `/tenant/dpf/user-roles/${userId}`;

      const response = await apiClient.delete(endpoint);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}

/**
 * Batch assign roles (ONE ROLE PER USER - only first role will be assigned)
 */
export function useBatchAssignRoles(options?: { isSystemScope?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSystemScope = options?.isSystemScope ?? user?.accessScope === 'system';

  return useMutation({
    mutationFn: async ({ userId, roleIds, tenantId }: { userId: string; roleIds: string[]; tenantId?: string }) => {
      if (roleIds.length === 0) return null;

      let url: string;
      if (isSystemScope) {
        url = tenantId
          ? `/system/users/${userId}/roles?tenantId=${tenantId}`
          : `/system/users/${userId}/roles`;
      } else {
        url = tenantId
          ? `/tenant/dpf/user-roles?tenantId=${tenantId}`
          : `/tenant/dpf/user-roles`;
      }

      const response = await apiClient.post(url, { userId, roleId: roleIds[0] });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}

/**
 * Remove role from user (batch version)
 */
export function useBatchRemoveRoles(options?: { isSystemScope?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSystemScope = options?.isSystemScope ?? user?.accessScope === 'system';

  return useMutation({
    mutationFn: async ({ userId, tenantId }: { userId: string; roleIds: string[]; tenantId?: string }) => {
      let url: string;
      if (isSystemScope) {
        url = tenantId
          ? `/system/users/${userId}/roles?tenantId=${tenantId}`
          : `/system/users/${userId}/roles`;
      } else {
        url = tenantId
          ? `/tenant/dpf/user-roles/${userId}?tenantId=${tenantId}`
          : `/tenant/dpf/user-roles/${userId}`;
      }

      const response = await apiClient.delete(url);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}
