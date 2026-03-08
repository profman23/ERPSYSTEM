/**
 * Cache Invalidation Service
 *
 * Centralized cache invalidation with event-driven approach
 * Supports tag-based invalidation and real-time notifications
 *
 * Features:
 * - Tag-based cache invalidation
 * - Real-time WebSocket notifications
 * - Batch invalidation support
 * - Audit logging for cache operations
 */

import { cacheService } from './CacheService';
import { getRedisClient } from './redisClient';
import logger from '../config/logger';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { dpfUserRoles } from '../db/schemas';

// Cache tag prefixes
export const CACHE_TAGS = {
  USER_PERMISSIONS: 'user-permissions',
  ROLE_PERMISSIONS: 'role-permissions',
  TENANT_CONFIG: 'tenant-config',
  USER_ROLES: 'user-roles',
  BRANCH_ACCESS: 'branch-access',
  TENANT_HIERARCHY: 'tenant-hierarchy',
  DPF_MATRIX: 'dpf-matrix',
};

// Socket.IO instance will be set by the server
let socketIO: any = null;

export function setSocketIO(io: any) {
  socketIO = io;
}

class CacheInvalidationService {
  /**
   * Invalidate user permissions when their roles change
   */
  async onUserRoleChanged(tenantId: string, userId: string): Promise<void> {
    const patterns = [
      `dpf:perm:${tenantId}:${userId}:*`,
      `dpf:branch_access:${tenantId}:${userId}:*`,
      `permissions:${tenantId}:${userId}`,
      `user-branches:${tenantId}:${userId}`,
      `user-business-lines:${tenantId}:${userId}`,
      `scope-filter:${tenantId}:${userId}`,
      `scope-context:${tenantId}:${userId}`,
    ];

    await this.invalidatePatterns(patterns);

    // Notify user via WebSocket
    this.notifyUser(userId, 'permissions:invalidated', {
      reason: 'role_changed',
      timestamp: new Date().toISOString(),
    });

    logger.info(`Cache invalidated for user ${userId} in tenant ${tenantId} (role changed)`);
  }

  /**
   * Invalidate all users' permissions when a role's permissions change
   */
  async onRolePermissionsChanged(tenantId: string, roleId: string): Promise<void> {
    // Get all users with this role
    const usersWithRole = await db
      .select({ userId: dpfUserRoles.userId })
      .from(dpfUserRoles)
      .where(
        and(
          eq(dpfUserRoles.roleId, roleId),
          eq(dpfUserRoles.tenantId, tenantId),
          // DPF tables use varchar(10) for isActive, not boolean — 'true' is correct here
          eq(dpfUserRoles.isActive, 'true')
        )
      );

    // Invalidate each user's permission cache
    const invalidationPromises = usersWithRole.map(({ userId }) =>
      this.onUserRoleChanged(tenantId, userId)
    );

    await Promise.all(invalidationPromises);

    // Invalidate role-specific caches
    await this.invalidatePatterns([
      `role-permissions:${tenantId}:${roleId}`,
      `l3:permission-graph:${tenantId}`,
      `l3:dpf-matrix:${tenantId}`,
    ]);

    // Notify tenant users
    this.notifyTenant(tenantId, 'permissions:role_updated', {
      roleId,
      timestamp: new Date().toISOString(),
    });

    logger.info(
      `Cache invalidated for role ${roleId} in tenant ${tenantId} (${usersWithRole.length} users affected)`
    );
  }

  /**
   * Invalidate user's branch access cache
   */
  async onUserBranchAccessChanged(
    tenantId: string,
    userId: string,
    branchId?: string
  ): Promise<void> {
    const patterns = branchId
      ? [`dpf:branch_access:${tenantId}:${userId}:${branchId}`]
      : [`dpf:branch_access:${tenantId}:${userId}:*`];

    patterns.push(`user-branches:${tenantId}:${userId}`);

    await this.invalidatePatterns(patterns);

    this.notifyUser(userId, 'permissions:branch_access_changed', {
      branchId,
      timestamp: new Date().toISOString(),
    });

    logger.info(
      `Branch access cache invalidated for user ${userId} in tenant ${tenantId}`
    );
  }

  /**
   * Invalidate entire tenant's permission cache (use sparingly)
   */
  async onTenantPermissionsReset(tenantId: string): Promise<void> {
    await this.invalidatePatterns([
      `dpf:perm:${tenantId}:*`,
      `dpf:branch_access:${tenantId}:*`,
      `permissions:${tenantId}:*`,
      `role-permissions:${tenantId}:*`,
      `user-branches:${tenantId}:*`,
      `user-business-lines:${tenantId}:*`,
      `scope-filter:${tenantId}:*`,
      `scope-context:${tenantId}:*`,
      `l3:permission-graph:${tenantId}`,
      `l3:tenant-hierarchy:${tenantId}`,
      `l3:dpf-matrix:${tenantId}`,
    ]);

    this.notifyTenant(tenantId, 'permissions:tenant_reset', {
      timestamp: new Date().toISOString(),
    });

    logger.warn(`Full permission cache reset for tenant ${tenantId}`);
  }

  /**
   * Invalidate tenant configuration cache
   */
  async onTenantConfigChanged(tenantId: string, configKey?: string): Promise<void> {
    const patterns = configKey
      ? [`config:${tenantId}:${configKey}`]
      : [`config:${tenantId}:*`];

    patterns.push(`tenant:${tenantId}`);

    await this.invalidatePatterns(patterns);

    this.notifyTenant(tenantId, 'config:changed', {
      configKey,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Config cache invalidated for tenant ${tenantId}`);
  }

  /**
   * Batch invalidation for multiple users
   */
  async batchInvalidateUsers(
    tenantId: string,
    userIds: string[],
    reason: string
  ): Promise<{ invalidated: number; failed: number }> {
    let invalidated = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await this.onUserRoleChanged(tenantId, userId);
        invalidated++;
      } catch (error) {
        logger.error(`Failed to invalidate cache for user ${userId}:`, error);
        failed++;
      }
    }

    logger.info(
      `Batch invalidation for tenant ${tenantId}: ${invalidated} succeeded, ${failed} failed (${reason})`
    );

    return { invalidated, failed };
  }

  /**
   * Warm up cache for a user (preload permission set into L1+L2 cache)
   */
  async warmupUserCache(tenantId: string, userId: string): Promise<void> {
    logger.info(`Starting cache warmup for user ${userId} in tenant ${tenantId}`);

    try {
      // Lazy import to avoid circular dependency
      const { dpfEngine } = await import('../rbac/dpfEngine');
      await dpfEngine.getEffectivePermissions(userId, tenantId);
      logger.info(`Cache warmup completed for user ${userId}`);
    } catch (error) {
      logger.warn(`Cache warmup failed for user ${userId}:`, error);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(): Promise<{
    l1Size: number;
    l1HitRatio: number;
    redisConnected: boolean;
    pendingInvalidations: number;
  }> {
    const redis = getRedisClient();
    const stats = await cacheService.getStats();

    return {
      l1Size: stats?.size || 0,
      l1HitRatio: stats?.hitRatio || 0,
      redisConnected: redis?.status === 'ready',
      pendingInvalidations: 0,
    };
  }

  /**
   * Internal: Invalidate multiple patterns
   */
  private async invalidatePatterns(patterns: string[]): Promise<void> {
    const redis = getRedisClient();

    for (const pattern of patterns) {
      try {
        // Use SCAN instead of KEYS to avoid blocking Redis in production
        // KEYS blocks the entire server; SCAN iterates incrementally
        if (redis && redis.status === 'ready') {
          let cursor = '0';
          do {
            const [nextCursor, keys] = await redis.scan(
              cursor, 'MATCH', pattern, 'COUNT', 100
            );
            cursor = nextCursor;
            if (keys.length > 0) {
              await redis.del(...keys);
            }
          } while (cursor !== '0');
        }

        // Also invalidate in local cache service
        await cacheService.invalidatePattern(pattern);
      } catch (error) {
        logger.error(`Failed to invalidate pattern ${pattern}:`, error);
      }
    }
  }

  /**
   * Internal: Notify user via WebSocket
   */
  private notifyUser(userId: string, event: string, data: any): void {
    if (socketIO) {
      socketIO.to(`user:${userId}`).emit(event, data);
    }
  }

  /**
   * Internal: Notify all users in a tenant via WebSocket
   */
  private notifyTenant(tenantId: string, event: string, data: any): void {
    if (socketIO) {
      socketIO.to(`tenant:${tenantId}`).emit(event, data);
    }
  }
}

export const cacheInvalidationService = new CacheInvalidationService();
export default cacheInvalidationService;
