/**
 * Platform Core Layer - AGI-Ready Cache Types
 * Phase 7: Ultra-High Performance Caching Architecture
 */

export type CacheLayer = 'L1' | 'L2' | 'L3';
export type CacheTTL = number;
export type CachePriority = 'low' | 'normal' | 'high' | 'critical';

export interface CacheOptions {
  ttl?: CacheTTL;
  tags?: string[];
  tenantScoped?: boolean;
  explicitTenantId?: string;
  staleWhileRevalidate?: boolean;
  staleTime?: number;
  priority?: CachePriority;
  layer?: CacheLayer;
}

export interface CacheEntry<T> {
  data: T;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
  staleAt?: number;
  tags: string[];
  tenantId: string | null;
  hitCount: number;
  priority: CachePriority;
  size?: number;
}

export interface CacheStats {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  l3Hits: number;
  l3Misses: number;
  totalSize: number;
  evictions: number;
  hitRatio: number;
  l1HitRatio: number;
  l2HitRatio: number;
  avgTtl: number;
  warmupComplete: boolean;
}

export interface CacheConfig {
  l1MaxSize: number;
  l1DefaultTtl: number;
  l2DefaultTtl: number;
  l3DefaultTtl: number;
  enableL3: boolean;
  staleWhileRevalidateDefault: boolean;
  adaptiveTtlEnabled: boolean;
  warmupEnabled: boolean;
  metricsEnabled: boolean;
}

export interface AdaptiveTtlParams {
  baseTtl: number;
  hitRatio: number;
  currentLoad: number;
  priority: CachePriority;
}

export interface CacheWarmupConfig {
  scopes: boolean;
  permissions: boolean;
  tenantSettings: boolean;
  agiKnowledge: boolean;
}

export interface L3KnowledgeEntry {
  type: 'permission_graph' | 'tenant_hierarchy' | 'dpf_matrix' | 'scope_tree';
  data: unknown;
  computedAt: number;
  validUntil: number;
  tenantId?: string;
  version: number;
  tags?: string[];
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  l1MaxSize: 5000,
  l1DefaultTtl: 30 * 1000,
  l2DefaultTtl: 5 * 60 * 1000,
  l3DefaultTtl: 60 * 60 * 1000,
  enableL3: true,
  staleWhileRevalidateDefault: true,
  adaptiveTtlEnabled: true,
  warmupEnabled: true,
  metricsEnabled: true,
};

export const CACHE_KEYS = {
  permissions: (tenantId: string, userId: string) =>
    `permissions:${tenantId}:${userId}`,
  rolePermissions: (tenantId: string, roleId: string) =>
    `role-permissions:${tenantId}:${roleId}`,
  user: (userId: string) => `user:${userId}`,
  tenant: (tenantId: string) => `tenant:${tenantId}`,
  config: (tenantId: string, key: string) => `config:${tenantId}:${key}`,
  quota: (tenantId: string, type: string) => `quota:${tenantId}:${type}`,
  scopeFilter: (tenantId: string, userId: string) => `scope-filter:${tenantId}:${userId}`,
  scopeContext: (tenantId: string, userId: string) => `scope-context:${tenantId}:${userId}`,
  userBranches: (tenantId: string, userId: string) => `user-branches:${tenantId}:${userId}`,
  userBusinessLines: (tenantId: string, userId: string) => `user-business-lines:${tenantId}:${userId}`,
  permissionGraph: (tenantId: string) => `l3:permission-graph:${tenantId}`,
  tenantHierarchy: (tenantId: string) => `l3:tenant-hierarchy:${tenantId}`,
  dpfMatrix: (tenantId: string) => `l3:dpf-matrix:${tenantId}`,
};

export const CACHE_TAGS = {
  PERMISSIONS: 'permissions',
  ROLES: 'roles',
  USERS: 'users',
  TENANTS: 'tenants',
  CONFIG: 'config',
  QUOTAS: 'quotas',
  SCOPES: 'scopes',
  HIERARCHY: 'hierarchy',
  DPF: 'dpf',
  AGI_KNOWLEDGE: 'agi-knowledge',
};

export const PRIORITY_WEIGHTS: Record<CachePriority, number> = {
  low: 1,
  normal: 2,
  high: 4,
  critical: 8,
};
