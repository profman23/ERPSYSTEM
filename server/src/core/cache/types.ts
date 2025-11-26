/**
 * Platform Core Layer - Cache Types
 */

export type CacheLayer = 'L1' | 'L2' | 'L3';
export type CacheTTL = number;

export interface CacheOptions {
  ttl?: CacheTTL;
  tags?: string[];
  tenantScoped?: boolean;
  staleWhileRevalidate?: boolean;
  staleTime?: number;
}

export interface CacheEntry<T> {
  data: T;
  createdAt: number;
  expiresAt: number;
  staleAt?: number;
  tags: string[];
  tenantId: string | null;
  hitCount: number;
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
}

export interface CacheConfig {
  l1MaxSize: number;
  l1DefaultTtl: number;
  l2DefaultTtl: number;
  l3DefaultTtl: number;
  enableL3: boolean;
  staleWhileRevalidateDefault: boolean;
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  l1MaxSize: 1000,
  l1DefaultTtl: 5 * 1000,
  l2DefaultTtl: 5 * 60 * 1000,
  l3DefaultTtl: 30 * 60 * 1000,
  enableL3: true,
  staleWhileRevalidateDefault: true,
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
};

export const CACHE_TAGS = {
  PERMISSIONS: 'permissions',
  ROLES: 'roles',
  USERS: 'users',
  TENANTS: 'tenants',
  CONFIG: 'config',
  QUOTAS: 'quotas',
};
