/**
 * DPF Engine - Permission Evaluation Engine
 * High-performance permission checking with caching and tenant isolation
 */

import { db } from '../db';
import { eq, and, inArray } from 'drizzle-orm';
import {
  dpfPermissions,
  dpfRoles,
  dpfRolePermissions,
  dpfUserRoles,
  dpfModules,
  dpfActions,
} from '../db/schemas';
import {
  PermissionCheckRequest,
  PermissionCheckResult,
  AgiAccessLevel,
  PermissionScope,
} from './dpfTypes';
import logger from '../config/logger';
import { cacheService } from '../services/CacheService';

class DPFEngine {
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Check if user has permission
   * This is the MAIN permission checking function
   */
  async checkPermission(request: PermissionCheckRequest): Promise<PermissionCheckResult> {
    const {
      userId,
      tenantId,
      permissionCode,
      moduleCode,
      actionCode,
      apiEndpoint,
      socketEvent,
      scope,
    } = request;

    try {
      // Check cache first
      const cacheKey = this.buildCacheKey(request);
      const cached = await cacheService.get<PermissionCheckResult>(cacheKey);
      if (cached) {
        logger.debug(`✅ DPF: Permission check cache hit for user ${userId}`);
        return cached;
      }

      // Get user's roles
      const userRoles = await this.getUserRoles(userId, tenantId);
      if (userRoles.length === 0) {
        const result: PermissionCheckResult = {
          granted: false,
          reason: 'User has no roles assigned',
          userRoles: [],
          matchedPermissions: [],
          tenantId,
          userId,
        };
        await cacheService.set(cacheKey, result, this.CACHE_TTL);
        return result;
      }

      // Get permissions for user's roles
      const rolePermissions = await this.getRolePermissions(
        tenantId,
        userRoles.map((r) => r.roleId)
      );

      if (rolePermissions.length === 0) {
        const result: PermissionCheckResult = {
          granted: false,
          reason: 'User roles have no permissions assigned',
          userRoles: userRoles.map((r) => r.roleId),
          matchedPermissions: [],
          tenantId,
          userId,
        };
        await cacheService.set(cacheKey, result, this.CACHE_TTL);
        return result;
      }

      // Check specific permission
      if (permissionCode) {
        const hasPermission = rolePermissions.some(
          (rp) => rp.permission.permissionCode === permissionCode
        );
        const result: PermissionCheckResult = {
          granted: hasPermission,
          reason: hasPermission ? 'Permission granted' : 'Permission not found in user roles',
          userRoles: userRoles.map((r) => r.roleId),
          matchedPermissions: hasPermission ? [permissionCode] : [],
          effectiveAgiLevel: hasPermission
            ? this.getEffectiveAgiLevel(rolePermissions, permissionCode)
            : AgiAccessLevel.NO_ACCESS,
          tenantId,
          userId,
        };
        await cacheService.set(cacheKey, result, this.CACHE_TTL);
        return result;
      }

      // Check module access
      if (moduleCode) {
        const modulePermissions = rolePermissions.filter((rp) => {
          return rp.permission.module?.moduleCode === moduleCode;
        });
        const hasAccess = modulePermissions.length > 0;
        const result: PermissionCheckResult = {
          granted: hasAccess,
          reason: hasAccess ? 'Module access granted' : 'No permissions for this module',
          userRoles: userRoles.map((r) => r.roleId),
          matchedPermissions: modulePermissions.map((p) => p.permission.permissionCode),
          tenantId,
          userId,
        };
        await cacheService.set(cacheKey, result, this.CACHE_TTL);
        return result;
      }

      // Check action access
      if (actionCode) {
        const actionPermissions = rolePermissions.filter((rp) => {
          return rp.permission.action?.actionCode === actionCode;
        });
        const hasAccess = actionPermissions.length > 0;
        const result: PermissionCheckResult = {
          granted: hasAccess,
          reason: hasAccess ? 'Action access granted' : 'No permissions for this action',
          userRoles: userRoles.map((r) => r.roleId),
          matchedPermissions: actionPermissions.map((p) => p.permission.permissionCode),
          effectiveAgiLevel: hasAccess
            ? this.getEffectiveAgiLevel(rolePermissions, actionCode)
            : AgiAccessLevel.NO_ACCESS,
          tenantId,
          userId,
        };
        await cacheService.set(cacheKey, result, this.CACHE_TTL);
        return result;
      }

      // Check API endpoint access
      if (apiEndpoint) {
        const endpointPermissions = rolePermissions.filter((rp) => {
          return rp.permission.action?.apiEndpoint === apiEndpoint;
        });
        const hasAccess = endpointPermissions.length > 0;
        const result: PermissionCheckResult = {
          granted: hasAccess,
          reason: hasAccess ? 'API endpoint access granted' : 'No permissions for this endpoint',
          userRoles: userRoles.map((r) => r.roleId),
          matchedPermissions: endpointPermissions.map((p) => p.permission.permissionCode),
          tenantId,
          userId,
        };
        await cacheService.set(cacheKey, result, this.CACHE_TTL);
        return result;
      }

      // Check Socket.IO event access
      if (socketEvent) {
        const eventPermissions = rolePermissions.filter((rp) => {
          return rp.permission.action?.socketEvent === socketEvent;
        });
        const hasAccess = eventPermissions.length > 0;
        const result: PermissionCheckResult = {
          granted: hasAccess,
          reason: hasAccess ? 'Socket event access granted' : 'No permissions for this event',
          userRoles: userRoles.map((r) => r.roleId),
          matchedPermissions: eventPermissions.map((p) => p.permission.permissionCode),
          tenantId,
          userId,
        };
        await cacheService.set(cacheKey, result, this.CACHE_TTL);
        return result;
      }

      // No specific check requested - return general access info
      const result: PermissionCheckResult = {
        granted: rolePermissions.length > 0,
        reason: 'User has general permissions',
        userRoles: userRoles.map((r) => r.roleId),
        matchedPermissions: rolePermissions.map((p) => p.permission.permissionCode),
        tenantId,
        userId,
      };
      await cacheService.set(cacheKey, result, this.CACHE_TTL);
      return result;
    } catch (error) {
      logger.error(`❌ DPF: Permission check failed for user ${userId}:`, error);
      return {
        granted: false,
        reason: `Permission check error: ${error}`,
        userRoles: [],
        matchedPermissions: [],
        tenantId,
        userId,
      };
    }
  }

  /**
   * Get user's active roles with tenant isolation
   */
  private async getUserRoles(userId: string, tenantId: string) {
    const roles = await db
      .select()
      .from(dpfUserRoles)
      .where(
        and(
          eq(dpfUserRoles.userId, userId),
          eq(dpfUserRoles.tenantId, tenantId),
          eq(dpfUserRoles.isActive, 'true')
        )
      );

    return roles.map((r) => ({
      ...r,
      isActive: r.isActive === 'true',
    }));
  }

  /**
   * Get permissions for roles with joined data
   */
  private async getRolePermissions(tenantId: string, roleIds: string[]) {
    if (roleIds.length === 0) return [];

    const rolePermissions = await db
      .select({
        rolePermission: dpfRolePermissions,
        permission: dpfPermissions,
        module: dpfModules,
        action: dpfActions,
      })
      .from(dpfRolePermissions)
      .leftJoin(dpfPermissions, eq(dpfRolePermissions.permissionId, dpfPermissions.id))
      .leftJoin(dpfModules, eq(dpfPermissions.moduleId, dpfModules.id))
      .leftJoin(dpfActions, eq(dpfPermissions.actionId, dpfActions.id))
      .where(
        and(
          eq(dpfRolePermissions.tenantId, tenantId),
          inArray(dpfRolePermissions.roleId, roleIds)
        )
      );

    return rolePermissions
      .filter((rp) => rp.permission !== null)
      .map((rp) => ({
        rolePermission: {
          ...rp.rolePermission,
        },
        permission: {
          ...rp.permission!,
          isActive: rp.permission!.isActive === 'true',
          module: rp.module
            ? {
                ...rp.module,
                isActive: rp.module.isActive === 'true',
                isSystemModule: rp.module.isSystemModule === 'true',
              }
            : undefined,
          action: rp.action
            ? {
                ...rp.action,
                isActive: rp.action.isActive === 'true',
                isDestructive: rp.action.isDestructive === 'true',
              }
            : undefined,
        },
      }));
  }

  /**
   * Get effective AGI level for a permission
   */
  private getEffectiveAgiLevel(
    rolePermissions: any[],
    permissionCodeOrAction: string
  ): AgiAccessLevel {
    const relevantPermissions = rolePermissions.filter(
      (rp) =>
        rp.permission.permissionCode === permissionCodeOrAction ||
        rp.permission.action?.actionCode === permissionCodeOrAction
    );

    if (relevantPermissions.length === 0) {
      return AgiAccessLevel.NO_ACCESS;
    }

    // Get highest AGI level from all matching permissions
    const agiLevels = relevantPermissions
      .map((rp) => rp.rolePermission.grantedAgiLevel || rp.permission.module?.requiredAgiLevel)
      .filter(Boolean);

    if (agiLevels.length === 0) {
      return AgiAccessLevel.READ_ONLY; // Default
    }

    // Return highest level (AUTONOMOUS > AUTOMATE > SUGGEST > READ_ONLY > NO_ACCESS)
    const levelPriority = {
      [AgiAccessLevel.AUTONOMOUS]: 5,
      [AgiAccessLevel.AUTOMATE]: 4,
      [AgiAccessLevel.SUGGEST]: 3,
      [AgiAccessLevel.READ_ONLY]: 2,
      [AgiAccessLevel.NO_ACCESS]: 1,
    };

    const highest = agiLevels.reduce((max, level) => {
      return levelPriority[level as AgiAccessLevel] > levelPriority[max as AgiAccessLevel]
        ? level
        : max;
    });

    return highest as AgiAccessLevel;
  }

  /**
   * Build cache key for permission check
   */
  private buildCacheKey(request: PermissionCheckRequest): string {
    const parts = [
      'dpf:perm',
      request.tenantId,
      request.userId,
      request.permissionCode,
      request.moduleCode,
      request.actionCode,
      request.apiEndpoint,
      request.socketEvent,
      request.scope,
    ];
    return parts.filter(Boolean).join(':');
  }

  /**
   * Invalidate all permission caches for a user
   */
  async invalidateUserPermissions(userId: string, tenantId: string): Promise<void> {
    await cacheService.invalidatePattern(`dpf:perm:${tenantId}:${userId}:*`);
    logger.info(`✅ DPF: Invalidated permission cache for user ${userId}`);
  }

  /**
   * Invalidate all permission caches for a tenant
   */
  async invalidateTenantPermissions(tenantId: string): Promise<void> {
    await cacheService.invalidatePattern(`dpf:perm:${tenantId}:*`);
    logger.info(`✅ DPF: Invalidated all permission caches for tenant ${tenantId}`);
  }

  /**
   * Bulk check multiple permissions (optimized)
   */
  async checkMultiplePermissions(
    userId: string,
    tenantId: string,
    permissionCodes: string[]
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // Get user's roles and permissions once
    const userRoles = await this.getUserRoles(userId, tenantId);
    if (userRoles.length === 0) {
      return permissionCodes.reduce((acc, code) => {
        acc[code] = false;
        return acc;
      }, {} as Record<string, boolean>);
    }

    const rolePermissions = await this.getRolePermissions(
      tenantId,
      userRoles.map((r) => r.roleId)
    );
    const permissionSet = new Set(rolePermissions.map((rp) => rp.permission.permissionCode));

    // Check each permission
    for (const code of permissionCodes) {
      results[code] = permissionSet.has(code);
    }

    return results;
  }
}

export const dpfEngine = new DPFEngine();
