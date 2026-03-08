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
  accentColor: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  allowedBusinessLines: number;
  allowedBranches: number;
  allowedUsers: number;
  storageLimitGB: number;
  apiRateLimit: number;
  aiAssistantEnabled: boolean;
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
  country: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  address: string | null;
  buildingNumber: string | null;
  district: string | null;
  vatRegistrationNumber: string | null;
  commercialRegistrationNumber: string | null;
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
  tenantName?: string | null;
  businessLineName?: string | null;
  branchName?: string | null;
  allowedBranchIds: string[];
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  roleCount?: number;
  dpfRoleId?: string | null;
  dpfRoleName?: string | null;
  dpfRoleCode?: string | null;
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
  country?: string;
  timezone?: string;
  subscriptionPlan?: 'trial' | 'standard' | 'enterprise';
  allowedBusinessLines?: number;
  allowedBranches?: number;
  allowedUsers?: number;
  storageLimitGB?: number;
  apiRateLimit?: number;
  primaryColor?: string;
  accentColor?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  aiAssistantEnabled?: boolean;
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
  country: string;
  city: string;
  address: string;
  buildingNumber: string;
  vatRegistrationNumber: string;
  commercialRegistrationNumber: string;
  code?: string;
  state?: string;
  postalCode?: string;
  district?: string;
  phone?: string;
  email?: string;
  timezone?: string;
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
  roleId?: string;
}

/**
 * Get all tenants (System Panel)
 * Uses /system/tenants endpoint with SYSTEM_TENANT_LIST authorization
 */
export function useTenants(enabled = true) {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const response = await apiClient.get('/system/tenants', {
        headers: getAuthHeaders(),
      });
      return response.data.data as Tenant[];
    },
    enabled,
  });
}

export function useTenant(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const response = await apiClient.get(`/hierarchy/tenants/${tenantId}/hierarchy`, {
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
      const response = await apiClient.post('/hierarchy/tenants', input, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

/**
 * Update a tenant (System Panel)
 * Uses /system/tenants endpoint with SYSTEM_TENANT_LIST authorization
 */
export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateTenantInput> & { id: string }) => {
      const response = await apiClient.put(`/system/tenants/${id}`, input, {
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
      const response = await apiClient.get(`/business-lines?tenantId=${tenantId}&limit=100`, {
        headers: getAuthHeaders(),
      });
      const payload = response.data.data;
      return (Array.isArray(payload) ? payload : payload?.data ?? []) as BusinessLine[];
    },
    enabled: !!tenantId,
  });
}

export function useBusinessLine(businessLineId: string | undefined) {
  return useQuery({
    queryKey: ['businessLine', businessLineId],
    queryFn: async () => {
      if (!businessLineId) return null;
      const response = await apiClient.get(`/business-lines/${businessLineId}`, {
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
      const response = await apiClient.post('/hierarchy/business-lines', input, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['businessLines', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenant', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenantQuota'] });
    },
  });
}

export function useUpdateBusinessLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateBusinessLineInput> & { id: string }) => {
      const response = await apiClient.put(`/business-lines/${id}`, input, {
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
      const response = await apiClient.delete(`/business-lines/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessLines'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenantQuota'] });
    },
  });
}

export function useBranches(businessLineId: string | undefined) {
  return useQuery({
    queryKey: ['branches', businessLineId],
    queryFn: async () => {
      if (!businessLineId) return [];
      const response = await apiClient.get(`/branches?businessLineId=${businessLineId}&limit=100`, {
        headers: getAuthHeaders(),
      });
      const payload = response.data.data;
      return (Array.isArray(payload) ? payload : payload?.data ?? []) as Branch[];
    },
    enabled: !!businessLineId,
  });
}

export function useAllBusinessLines() {
  return useQuery({
    queryKey: ['allBusinessLines'],
    queryFn: async () => {
      const response = await apiClient.get('/business-lines?limit=100', {
        headers: getAuthHeaders(),
      });
      // Paginated endpoint returns { success, data: { data: [...], pagination } }
      const payload = response.data.data;
      return (Array.isArray(payload) ? payload : payload?.data ?? []) as BusinessLine[];
    },
  });
}

export function useAllBranchesNoFilter() {
  return useQuery({
    queryKey: ['allBranchesNoFilter'],
    queryFn: async () => {
      const response = await apiClient.get('/tenant/branches?limit=100');
      // Paginated endpoint returns { success, data: { data: [...], pagination } }
      const payload = response.data.data;
      return (Array.isArray(payload) ? payload : payload?.data ?? []) as Branch[];
    },
  });
}

export function useAllUsers() {
  return useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const response = await apiClient.get('/system/users?limit=100', {
        headers: getAuthHeaders(),
      });
      // Paginated endpoint returns { success, data: { data: [...], pagination } }
      const payload = response.data.data;
      return (Array.isArray(payload) ? payload : payload?.data ?? []) as User[];
    },
  });
}

export function useAllBranches(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['allBranches', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const response = await apiClient.get(`/branches?tenantId=${tenantId}&limit=100`, {
        headers: getAuthHeaders(),
      });
      const payload = response.data.data;
      return (Array.isArray(payload) ? payload : payload?.data ?? []) as Branch[];
    },
    enabled: !!tenantId,
  });
}

export function useBranch(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      const response = await apiClient.get(`/branches/${branchId}`, {
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
      const response = await apiClient.post('/hierarchy/branches', input, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branches', variables.businessLineId] });
      queryClient.invalidateQueries({ queryKey: ['businessLines'] });
      queryClient.invalidateQueries({ queryKey: ['tenantQuota'] });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateBranchInput> & { id: string }) => {
      const response = await apiClient.patch(`/branches/${id}`, input, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['allBranches'] });
      queryClient.invalidateQueries({ queryKey: ['branch'] });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/branches/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['businessLines'] });
      queryClient.invalidateQueries({ queryKey: ['tenantQuota'] });
    },
  });
}

export interface PaginatedUsersResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function useUsers(filters?: {
  tenantId?: string;
  businessLineId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.tenantId) params.append('tenantId', filters.tenantId);
      if (filters?.businessLineId) params.append('businessLineId', filters.businessLineId);
      if (filters?.branchId) params.append('branchId', filters.branchId);
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.search) params.append('search', filters.search);
      const queryString = params.toString();
      const url = `/tenant/users${queryString ? `?${queryString}` : ''}`;
      const response = await apiClient.get(url, {
        headers: getAuthHeaders(),
      });
      // API returns { success, data: { data: [...], pagination } }
      return response.data.data as PaginatedUsersResponse;
    },
    placeholderData: (prev: PaginatedUsersResponse | undefined) => prev,
  });
}

export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await apiClient.get(`/hierarchy/users/${userId}/context`, {
        headers: getAuthHeaders(),
      });
      const data = response.data.data;
      // API returns { user, branch, businessLine, tenant } — extract user with tenant info
      if (data?.user) {
        return {
          ...data.user,
          tenantName: data.tenant?.name || null,
          branchName: data.branch?.name || null,
          businessLineName: data.businessLine?.name || null,
        } as User;
      }
      return data as User;
    },
    enabled: !!userId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const response = await apiClient.post('/hierarchy/users', input, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['tenantQuota'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateUserInput> & { id: string }) => {
      const response = await apiClient.patch(`/tenant/users/${id}`, input, {
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
      const response = await apiClient.patch(`/tenant/users/${id}`, { isActive }, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// --- Tenant Quota ---

export interface TenantQuota {
  businessLines: { used: number; limit: number };
  branches: { used: number; limit: number };
  users: { used: number; limit: number };
  subscriptionPlan: string;
}

export function useTenantQuota(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['tenantQuota', tenantId],
    queryFn: async () => {
      const response = await apiClient.get(`/hierarchy/tenant-quota?tenantId=${tenantId}`, {
        headers: getAuthHeaders(),
      });
      return response.data.data as TenantQuota;
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}
