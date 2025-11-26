import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface Tenant {
  id: string;
  code: string;
  name: string;
  defaultLanguage: string;
  country: string | null;
  timezone: string;
  subscriptionPlan: string;
  status: string;
  logoUrl: string | null;
  primaryColor: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  businessLineCount?: number;
  totalBranches?: number;
  totalUsers?: number;
}

export interface BusinessLine {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  businessLineType: string;
  description: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branchCount?: number;
  totalUsers?: number;
}

export interface Branch {
  id: string;
  tenantId: string;
  businessLineId: string;
  code: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string | null;
  workingHours: Record<string, string>;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
}

export interface User {
  id: string;
  code: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  accessScope: string;
  status: string;
  isActive: boolean;
  branchId: string | null;
  businessLineId: string | null;
  tenantId: string | null;
  allowedBranchIds: string[];
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  roleCount?: number;
}

export interface TenantHierarchy extends Tenant {
  businessLines: (BusinessLine & {
    branches: (Branch & {
      users: User[];
      userCount: number;
    })[];
    branchCount: number;
    totalUsers: number;
  })[];
}

export interface CreateTenantInput {
  name: string;
  code: string;
  subscriptionPlan?: string;
  country?: string;
  timezone?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  primaryColor?: string;
}

export interface CreateBusinessLineInput {
  tenantId: string;
  name: string;
  code?: string;
  businessLineType?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  settings?: Record<string, unknown>;
}

export interface CreateBranchInput {
  businessLineId: string;
  name: string;
  code?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  workingHours?: Record<string, string>;
  settings?: Record<string, unknown>;
}

export interface CreateUserInput {
  branchId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  code?: string;
  phone?: string;
  role?: string;
  accessScope?: string;
  allowedBranchIds?: string[];
}

export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/tenants', {
        headers: getAuthHeaders(),
      });
      return response.data.data as Tenant[];
    },
  });
}

export function useTenant(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const response = await apiClient.get(`/api/v1/hierarchy/tenants/${tenantId}/hierarchy`, {
        headers: getAuthHeaders(),
      });
      return response.data.data as TenantHierarchy;
    },
    enabled: !!tenantId,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTenantInput) => {
      const response = await apiClient.post('/api/v1/hierarchy/tenants', input, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateTenantInput> & { id: string }) => {
      const response = await apiClient.patch(`/api/v1/tenants/${id}`, input, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', variables.id] });
    },
  });
}

export function useBusinessLines(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['businessLines', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const response = await apiClient.get(`/api/v1/business-lines?tenantId=${tenantId}`, {
        headers: getAuthHeaders(),
      });
      return response.data.data as BusinessLine[];
    },
    enabled: !!tenantId,
  });
}

export function useBusinessLine(businessLineId: string | undefined) {
  return useQuery({
    queryKey: ['businessLine', businessLineId],
    queryFn: async () => {
      if (!businessLineId) return null;
      const response = await apiClient.get(`/api/v1/business-lines/${businessLineId}`, {
        headers: getAuthHeaders(),
      });
      return response.data.data as BusinessLine;
    },
    enabled: !!businessLineId,
  });
}

export function useCreateBusinessLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBusinessLineInput) => {
      const response = await apiClient.post('/api/v1/hierarchy/business-lines', input, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['businessLines', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenant', variables.tenantId] });
    },
  });
}

export function useUpdateBusinessLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateBusinessLineInput> & { id: string }) => {
      const response = await apiClient.patch(`/api/v1/business-lines/${id}`, input, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessLines'] });
    },
  });
}

export function useDeleteBusinessLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/api/v1/business-lines/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessLines'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useBranches(businessLineId: string | undefined) {
  return useQuery({
    queryKey: ['branches', businessLineId],
    queryFn: async () => {
      if (!businessLineId) return [];
      const response = await apiClient.get(`/api/v1/branches?businessLineId=${businessLineId}`, {
        headers: getAuthHeaders(),
      });
      return response.data.data as Branch[];
    },
    enabled: !!businessLineId,
  });
}

export function useAllBranches(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['allBranches', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const response = await apiClient.get(`/api/v1/branches?tenantId=${tenantId}`, {
        headers: getAuthHeaders(),
      });
      return response.data.data as Branch[];
    },
    enabled: !!tenantId,
  });
}

export function useBranch(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      const response = await apiClient.get(`/api/v1/branches/${branchId}`, {
        headers: getAuthHeaders(),
      });
      return response.data.data as Branch;
    },
    enabled: !!branchId,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBranchInput) => {
      const response = await apiClient.post('/api/v1/hierarchy/branches', input, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branches', variables.businessLineId] });
      queryClient.invalidateQueries({ queryKey: ['businessLines'] });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateBranchInput> & { id: string }) => {
      const response = await apiClient.patch(`/api/v1/branches/${id}`, input, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/api/v1/branches/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['businessLines'] });
    },
  });
}

export function useUsers(filters?: { tenantId?: string; businessLineId?: string; branchId?: string }) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.tenantId) params.append('tenantId', filters.tenantId);
      if (filters?.businessLineId) params.append('businessLineId', filters.businessLineId);
      if (filters?.branchId) params.append('branchId', filters.branchId);
      const queryString = params.toString();
      const url = `/api/v1/tenant/users${queryString ? `?${queryString}` : ''}`;
      const response = await apiClient.get(url, {
        headers: getAuthHeaders(),
      });
      return response.data.data as User[];
    },
  });
}

export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await apiClient.get(`/api/v1/hierarchy/users/${userId}/context`, {
        headers: getAuthHeaders(),
      });
      return response.data.data as User;
    },
    enabled: !!userId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const response = await apiClient.post('/api/v1/hierarchy/users', input, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateUserInput> & { id: string }) => {
      const response = await apiClient.patch(`/api/v1/tenant/users/${id}`, input, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] });
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiClient.patch(`/api/v1/tenant/users/${id}`, { isActive }, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
