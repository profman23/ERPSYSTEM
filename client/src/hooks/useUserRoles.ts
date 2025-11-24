import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import type { DPFRole, DPFUserRole } from '../../../types/dpf';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
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

export function useUserRoles(userId: string | undefined) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      
      const response = await axios.get<{ data: DPFUserRole[] }>(
        `${API_BASE}/tenant/users/${userId}/roles`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return response.data.data;
    },
    enabled: !!userId && !!accessToken,
  });
}

export function useUser(userId: string | undefined) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      
      const response = await axios.get<{ data: User }>(
        `${API_BASE}/tenant/users/${userId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return response.data.data;
    },
    enabled: !!userId && !!accessToken,
  });
}

export function useUsers(params?: { page?: number; limit?: number; search?: string; roleId?: string }) {
  const { accessToken } = useAuth();
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

      const response = await axios.get<{ 
        data: User[]; 
        pagination: { page: number; limit: number; total: number; totalPages: number } 
      }>(
        `${API_BASE}/tenant/users?${queryParams}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return response.data;
    },
    enabled: !!accessToken,
  });
}

export function useAssignRole() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roleId, expiresAt }: AssignRoleInput) => {
      const response = await axios.post(
        `${API_BASE}/tenant/users/${userId}/assign-role`,
        { roleId, expiresAt },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}

export function useRemoveRole() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roleId }: RemoveRoleInput) => {
      const response = await axios.post(
        `${API_BASE}/tenant/users/${userId}/remove-role`,
        { roleId },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}

export function useBatchAssignRoles() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      const promises = roleIds.map((roleId) =>
        axios.post(
          `${API_BASE}/tenant/users/${userId}/assign-role`,
          { roleId },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
      );
      return Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}

export function useBatchRemoveRoles() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      const promises = roleIds.map((roleId) =>
        axios.post(
          `${API_BASE}/tenant/users/${userId}/remove-role`,
          { roleId },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
      );
      return Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}
