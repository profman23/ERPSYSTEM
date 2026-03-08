/**
 * React Query Keys Factory
 *
 * Centralized query key management for consistent caching and invalidation
 * Supports 3000+ tenant environments with proper cache isolation
 *
 * Usage:
 * - queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
 * - useQuery({ queryKey: queryKeys.users.detail(userId) })
 * - queryClient.setQueryData(queryKeys.users.detail(userId), newData)
 */

// ═══════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  roles: (userId: string) => [...userKeys.detail(userId), 'roles'] as const,
  permissions: (userId: string) => [...userKeys.detail(userId), 'permissions'] as const,
  branches: (userId: string) => [...userKeys.detail(userId), 'branches'] as const,
};

// ═══════════════════════════════════════════════════════════════
// TENANTS
// ═══════════════════════════════════════════════════════════════
export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...tenantKeys.lists(), filters] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
  settings: (tenantId: string) => [...tenantKeys.detail(tenantId), 'settings'] as const,
  stats: (tenantId: string) => [...tenantKeys.detail(tenantId), 'stats'] as const,
};

// ═══════════════════════════════════════════════════════════════
// ROLES
// ═══════════════════════════════════════════════════════════════
export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...roleKeys.lists(), filters] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: string) => [...roleKeys.details(), id] as const,
  permissions: (roleId: string) => [...roleKeys.detail(roleId), 'permissions'] as const,
  authorizations: (roleId: string) => [...roleKeys.detail(roleId), 'authorizations'] as const,
  users: (roleId: string) => [...roleKeys.detail(roleId), 'users'] as const,
};

// ═══════════════════════════════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════════════════════════════
export const permissionKeys = {
  all: ['permissions'] as const,
  lists: () => [...permissionKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...permissionKeys.lists(), filters] as const,
  user: (userId: string) => ['permissions', 'user', userId] as const,
  check: (codes: string[]) => ['permissions', 'check', ...codes] as const,
  modules: () => ['permissions', 'modules'] as const,
  matrix: () => ['permissions', 'matrix'] as const,
};

// ═══════════════════════════════════════════════════════════════
// BRANCHES
// ═══════════════════════════════════════════════════════════════
export const branchKeys = {
  all: ['branches'] as const,
  lists: () => [...branchKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...branchKeys.lists(), filters] as const,
  details: () => [...branchKeys.all, 'detail'] as const,
  detail: (id: string) => [...branchKeys.details(), id] as const,
  capacity: (branchId: string) => [...branchKeys.detail(branchId), 'capacity'] as const,
  users: (branchId: string) => [...branchKeys.detail(branchId), 'users'] as const,
};

// ═══════════════════════════════════════════════════════════════
// BUSINESS LINES
// ═══════════════════════════════════════════════════════════════
export const businessLineKeys = {
  all: ['businessLines'] as const,
  lists: () => [...businessLineKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...businessLineKeys.lists(), filters] as const,
  details: () => [...businessLineKeys.all, 'detail'] as const,
  detail: (id: string) => [...businessLineKeys.details(), id] as const,
  branches: (businessLineId: string) => [...businessLineKeys.detail(businessLineId), 'branches'] as const,
};

// ═══════════════════════════════════════════════════════════════
// HIERARCHY
// ═══════════════════════════════════════════════════════════════
export const hierarchyKeys = {
  all: ['hierarchy'] as const,
  tree: () => [...hierarchyKeys.all, 'tree'] as const,
  scope: (userId: string) => [...hierarchyKeys.all, 'scope', userId] as const,
  context: () => [...hierarchyKeys.all, 'context'] as const,
};

// ═══════════════════════════════════════════════════════════════
// DPF (Dynamic Permission Framework)
// ═══════════════════════════════════════════════════════════════
export const dpfKeys = {
  all: ['dpf'] as const,
  modules: () => [...dpfKeys.all, 'modules'] as const,
  screens: (moduleId?: string) => [...dpfKeys.all, 'screens', moduleId] as const,
  actions: (screenId?: string) => [...dpfKeys.all, 'actions', screenId] as const,
  structure: () => [...dpfKeys.all, 'structure'] as const,
};

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════
export const authKeys = {
  user: () => ['auth', 'user'] as const,
  session: () => ['auth', 'session'] as const,
  token: () => ['auth', 'token'] as const,
};

// ═══════════════════════════════════════════════════════════════
// SYSTEM (for System Admin panel)
// ═══════════════════════════════════════════════════════════════
export const systemKeys = {
  metrics: () => ['system', 'metrics'] as const,
  health: () => ['system', 'health'] as const,
  config: () => ['system', 'config'] as const,
  logs: (filters?: Record<string, unknown>) => ['system', 'logs', filters] as const,
  ai: {
    config: () => ['system', 'ai', 'config'] as const,
    monitoring: () => ['system', 'ai', 'monitoring'] as const,
    logs: (filters?: Record<string, unknown>) => ['system', 'ai', 'logs', filters] as const,
  },
};

// ═══════════════════════════════════════════════════════════════
// UNIFIED EXPORT
// ═══════════════════════════════════════════════════════════════
export const queryKeys = {
  users: userKeys,
  tenants: tenantKeys,
  roles: roleKeys,
  permissions: permissionKeys,
  branches: branchKeys,
  businessLines: businessLineKeys,
  hierarchy: hierarchyKeys,
  dpf: dpfKeys,
  auth: authKeys,
  system: systemKeys,
};

export default queryKeys;
