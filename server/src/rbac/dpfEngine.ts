/**
 * DPF Engine - Permission Evaluation Engine (Optimized)
 *
 * Performance optimizations (Phase 2.1 + 2.2):
 * 1. Caches user's ENTIRE permission set per user+tenant (not individual checks)
 * 2. Uses L1 in-memory + L2 Redis via AGI-Ready cache service
 * 3. Loads roles + permissions + custom permissions efficiently
 * 4. Tag-based cache invalidation (replaces broken invalidatePattern calls)
 * 5. Branch access cached separately with longer TTL
 *
 * Before: 3 DB queries per permission check (150 queries for 50 checks)
 * After: 3 DB queries once, then all checks are in-memory (3 queries for 50+ checks)
 */

import { db } from '../db';
import { eq, and, inArray, sql } from 'drizzle-orm';
import {
  dpfPermissions,
  dpfRolePermissions,
  dpfUserRoles,
  dpfUserCustomPermissions,
  dpfUserRoleBranches,
  dpfModules,
  dpfActions,
} from '../db/schemas';
import {
  PermissionCheckRequest,
  PermissionCheckResult,
  AgiAccessLevel,
} from './dpfTypes';
import logger from '../config/logger';
import { cacheService } from '../core/cache/cacheService';
import {
  hasPermissionWithInheritance,
  matchWildcard,
  parsePermissionHierarchy,
  checkFullControlInheritance,
} from './permissionUtils';

/** Flattened permission data for caching */
interface FlatPermission {
  id: string;
  permissionCode: string;
  moduleCode: string | null;
  actionCode: string | null;
  apiEndpoint: string | null;
  socketEvent: string | null;
  grantedAgiLevel: string | null;
  requiredAgiLevel: string | null;
}

/** Cached effective permission data for a user in a tenant */
interface EffectivePermissionData {
  permissionCodes: string[];
  roleIds: string[];
  permissions: FlatPermission[];
}

class DPFEngine {
  private readonly PERM_CACHE_TTL = 15 * 60 * 1000; // 15 minutes (ms) — safe with tag-based invalidation
  private readonly BRANCH_CACHE_TTL = 30 * 60 * 1000; // 30 minutes (ms) — safe with tag-based invalidation

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
      branchId,
    } = request;

    try {
      // Load user's entire effective permission set (cached after first load)
      const permData = await this.getEffectivePermissions(userId, tenantId);

      if (permData.roleIds.length === 0) {
        return {
          granted: false,
          reason: 'User has no roles assigned',
          userRoles: [],
          matchedPermissions: [],
          tenantId,
          userId,
        };
      }

      if (permData.permissions.length === 0) {
        return {
          granted: false,
          reason: 'User has no effective permissions (all denied or no permissions assigned)',
          userRoles: permData.roleIds,
          matchedPermissions: [],
          tenantId,
          userId,
        };
      }

      // Check specific permission (with wildcard + inheritance support)
      if (permissionCode) {
        let hasPermission = hasPermissionWithInheritance(permData.permissionCodes, permissionCode);
        const matchedPermissions = hasPermission
          ? this.findMatchedPermissions(permData.permissionCodes, permissionCode)
          : [];

        // Branch-level access check
        let branchAccessReason = '';
        if (hasPermission && branchId) {
          const hasBranchAccess = await this.checkBranchAccess(userId, tenantId, branchId);
          if (!hasBranchAccess) {
            hasPermission = false;
            branchAccessReason = ` (denied: user does not have access to branch ${branchId})`;
          } else {
            branchAccessReason = ` (branch access granted for ${branchId})`;
          }
        }

        return {
          granted: hasPermission,
          reason: hasPermission
            ? matchedPermissions.length > 0
              ? `Permission granted via: ${matchedPermissions.join(', ')}${branchAccessReason}`
              : `Permission granted${branchAccessReason}`
            : branchAccessReason
              ? `Permission not found in effective permissions${branchAccessReason}`
              : 'Permission not found in effective permissions',
          userRoles: permData.roleIds,
          matchedPermissions,
          effectiveAgiLevel: hasPermission
            ? this.getEffectiveAgiLevel(permData.permissions, permissionCode)
            : AgiAccessLevel.NO_ACCESS,
          tenantId,
          userId,
        };
      }

      // Check module access
      if (moduleCode) {
        const modulePermissions = permData.permissions.filter(p => p.moduleCode === moduleCode);
        const hasAccess = modulePermissions.length > 0;
        return {
          granted: hasAccess,
          reason: hasAccess ? 'Module access granted' : 'No permissions for this module',
          userRoles: permData.roleIds,
          matchedPermissions: modulePermissions.map(p => p.permissionCode),
          tenantId,
          userId,
        };
      }

      // Check action access
      if (actionCode) {
        const actionPermissions = permData.permissions.filter(p => p.actionCode === actionCode);
        const hasAccess = actionPermissions.length > 0;
        return {
          granted: hasAccess,
          reason: hasAccess ? 'Action access granted' : 'No permissions for this action',
          userRoles: permData.roleIds,
          matchedPermissions: actionPermissions.map(p => p.permissionCode),
          effectiveAgiLevel: hasAccess
            ? this.getEffectiveAgiLevel(permData.permissions, actionCode)
            : AgiAccessLevel.NO_ACCESS,
          tenantId,
          userId,
        };
      }

      // Check API endpoint access
      if (apiEndpoint) {
        const endpointPermissions = permData.permissions.filter(p => p.apiEndpoint === apiEndpoint);
        const hasAccess = endpointPermissions.length > 0;
        return {
          granted: hasAccess,
          reason: hasAccess ? 'API endpoint access granted' : 'No permissions for this endpoint',
          userRoles: permData.roleIds,
          matchedPermissions: endpointPermissions.map(p => p.permissionCode),
          tenantId,
          userId,
        };
      }

      // Check Socket.IO event access
      if (socketEvent) {
        const eventPermissions = permData.permissions.filter(p => p.socketEvent === socketEvent);
        const hasAccess = eventPermissions.length > 0;
        return {
          granted: hasAccess,
          reason: hasAccess ? 'Socket event access granted' : 'No permissions for this event',
          userRoles: permData.roleIds,
          matchedPermissions: eventPermissions.map(p => p.permissionCode),
          tenantId,
          userId,
        };
      }

      // No specific check requested - return general access info
      return {
        granted: permData.permissions.length > 0,
        reason: 'User has general permissions',
        userRoles: permData.roleIds,
        matchedPermissions: permData.permissionCodes,
        tenantId,
        userId,
      };
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
   * Load user's entire effective permission set (cached)
   *
   * Optimized: 2 DB queries on cache miss (was 3)
   * Query 1: fetchUserRoles (fast, single table, indexed)
   * Query 2: UNION ALL of role permissions + custom permissions (single roundtrip)
   * Cached in L1 (memory) + L2 (Redis) for 15 minutes with tag-based invalidation
   */
  async getEffectivePermissions(
    userId: string,
    tenantId: string
  ): Promise<EffectivePermissionData> {
    const cacheKey = `dpf:permset:${tenantId}:${userId}`;

    // Check cache (L1 in-memory first, then L2 Redis)
    const cached = await cacheService.get<EffectivePermissionData>(cacheKey, {
      priority: 'high',
    });
    if (cached) {
      logger.debug(`DPF: Permission set cache hit for user ${userId}`);
      return cached;
    }

    logger.debug(`DPF: Loading permission set for user ${userId} in tenant ${tenantId}`);

    // Query 1: Fetch user roles (fast, single table, indexed)
    const userRoles = await this.fetchUserRoles(userId, tenantId);
    const roleIds = userRoles.map(r => r.roleId);

    if (roleIds.length === 0) {
      const emptyData: EffectivePermissionData = {
        permissionCodes: [],
        roleIds: [],
        permissions: [],
      };
      await this.cachePermissionData(cacheKey, emptyData, tenantId, userId);
      return emptyData;
    }

    // Query 2: Single UNION ALL for role permissions + custom permissions
    const allPermissions = await this.fetchAllPermissions(userId, tenantId, roleIds);

    // Separate role permissions from custom permissions
    const rolePermissions: FlatPermission[] = [];
    const customGrants: FlatPermission[] = [];
    const deniedPermissionIds = new Set<string>();

    for (const row of allPermissions) {
      if (row.source === 'ROLE') {
        rolePermissions.push({
          id: row.permissionId,
          permissionCode: row.permissionCode,
          moduleCode: row.moduleCode,
          actionCode: row.actionCode,
          apiEndpoint: row.apiEndpoint,
          socketEvent: row.socketEvent,
          grantedAgiLevel: row.grantedAgiLevel,
          requiredAgiLevel: row.requiredAgiLevel,
        });
      } else if (row.source === 'CUSTOM') {
        if (row.permissionType === 'DENY') {
          deniedPermissionIds.add(row.permissionId);
        } else if (row.permissionType === 'GRANT') {
          customGrants.push({
            id: row.permissionId,
            permissionCode: row.permissionCode,
            moduleCode: row.moduleCode,
            actionCode: row.actionCode,
            apiEndpoint: row.apiEndpoint,
            socketEvent: row.socketEvent,
            grantedAgiLevel: null,
            requiredAgiLevel: row.requiredAgiLevel,
          });
        }
      }
    }

    // Apply formula: effectivePermissions = rolePerms + customGrants - customDenials
    const effectivePermissions: FlatPermission[] = [
      ...rolePermissions.filter(rp => !deniedPermissionIds.has(rp.id)),
      ...customGrants.filter(gp => !deniedPermissionIds.has(gp.id)),
    ];

    const data: EffectivePermissionData = {
      permissionCodes: effectivePermissions.map(p => p.permissionCode),
      roleIds,
      permissions: effectivePermissions,
    };

    await this.cachePermissionData(cacheKey, data, tenantId, userId);
    return data;
  }

  /**
   * Cache permission data with proper tags for invalidation
   */
  private async cachePermissionData(
    key: string,
    data: EffectivePermissionData,
    tenantId: string,
    userId: string
  ): Promise<void> {
    await cacheService.set(key, data, {
      ttl: this.PERM_CACHE_TTL,
      priority: 'high',
      tags: [
        'dpf-perms',
        `dpf-perms:tenant:${tenantId}`,
        `dpf-perms:user:${tenantId}:${userId}`,
      ],
    });
  }

  /**
   * Fetch user's active roles (flat query, minimal columns)
   */
  private async fetchUserRoles(userId: string, tenantId: string) {
    return db
      .select({
        id: dpfUserRoles.id,
        roleId: dpfUserRoles.roleId,
        assignedScope: dpfUserRoles.assignedScope,
      })
      .from(dpfUserRoles)
      .where(
        and(
          eq(dpfUserRoles.userId, userId),
          eq(dpfUserRoles.tenantId, tenantId),
          eq(dpfUserRoles.isActive, 'true')
        )
      );
  }

  /**
   * Unified permission query: UNION ALL of role permissions + custom permissions
   * Reduces 2 separate DB roundtrips to 1, parsing results in-memory
   */
  private async fetchAllPermissions(
    userId: string,
    tenantId: string,
    roleIds: string[]
  ): Promise<Array<{
    source: string;
    permissionId: string;
    permissionCode: string;
    moduleCode: string | null;
    actionCode: string | null;
    apiEndpoint: string | null;
    socketEvent: string | null;
    grantedAgiLevel: string | null;
    requiredAgiLevel: string | null;
    permissionType: string | null;
  }>> {
    const result = await db.execute(sql`
      SELECT
        'ROLE' as source,
        ${dpfPermissions.id} as permission_id,
        ${dpfPermissions.permissionCode} as permission_code,
        ${dpfModules.moduleCode} as module_code,
        ${dpfActions.actionCode} as action_code,
        ${dpfActions.apiEndpoint} as api_endpoint,
        ${dpfActions.socketEvent} as socket_event,
        ${dpfRolePermissions.grantedAgiLevel} as granted_agi_level,
        ${dpfModules.requiredAgiLevel} as required_agi_level,
        NULL as permission_type
      FROM ${dpfRolePermissions}
      INNER JOIN ${dpfPermissions} ON ${dpfRolePermissions.permissionId} = ${dpfPermissions.id}
      LEFT JOIN ${dpfModules} ON ${dpfPermissions.moduleId} = ${dpfModules.id}
      LEFT JOIN ${dpfActions} ON ${dpfPermissions.actionId} = ${dpfActions.id}
      WHERE ${dpfRolePermissions.tenantId} = ${tenantId}
        AND ${dpfRolePermissions.roleId} IN ${sql`(${sql.join(roleIds.map(id => sql`${id}`), sql`, `)})`}

      UNION ALL

      SELECT
        'CUSTOM' as source,
        ${dpfPermissions.id} as permission_id,
        ${dpfPermissions.permissionCode} as permission_code,
        ${dpfModules.moduleCode} as module_code,
        ${dpfActions.actionCode} as action_code,
        ${dpfActions.apiEndpoint} as api_endpoint,
        ${dpfActions.socketEvent} as socket_event,
        NULL as granted_agi_level,
        ${dpfModules.requiredAgiLevel} as required_agi_level,
        ${dpfUserCustomPermissions.permissionType} as permission_type
      FROM ${dpfUserCustomPermissions}
      INNER JOIN ${dpfPermissions} ON ${dpfUserCustomPermissions.permissionId} = ${dpfPermissions.id}
      LEFT JOIN ${dpfModules} ON ${dpfPermissions.moduleId} = ${dpfModules.id}
      LEFT JOIN ${dpfActions} ON ${dpfPermissions.actionId} = ${dpfActions.id}
      WHERE ${dpfUserCustomPermissions.userId} = ${userId}
        AND ${dpfUserCustomPermissions.tenantId} = ${tenantId}
        AND ${dpfUserCustomPermissions.isActive} = 'true'
    `);

    return (result.rows as Array<Record<string, unknown>>).map(row => ({
      source: row.source as string,
      permissionId: row.permission_id as string,
      permissionCode: row.permission_code as string,
      moduleCode: row.module_code as string | null,
      actionCode: row.action_code as string | null,
      apiEndpoint: row.api_endpoint as string | null,
      socketEvent: row.socket_event as string | null,
      grantedAgiLevel: row.granted_agi_level as string | null,
      requiredAgiLevel: row.required_agi_level as string | null,
      permissionType: row.permission_type as string | null,
    }));
  }

  /**
   * Get effective AGI level for a permission
   */
  private getEffectiveAgiLevel(
    permissions: FlatPermission[],
    permissionCodeOrAction: string
  ): AgiAccessLevel {
    const relevant = permissions.filter(
      p => p.permissionCode === permissionCodeOrAction || p.actionCode === permissionCodeOrAction
    );

    if (relevant.length === 0) return AgiAccessLevel.NO_ACCESS;

    const agiLevels = relevant
      .map(p => p.grantedAgiLevel || p.requiredAgiLevel)
      .filter(Boolean) as string[];

    if (agiLevels.length === 0) return AgiAccessLevel.READ_ONLY;

    const levelPriority: Record<string, number> = {
      [AgiAccessLevel.AUTONOMOUS]: 5,
      [AgiAccessLevel.AUTOMATE]: 4,
      [AgiAccessLevel.SUGGEST]: 3,
      [AgiAccessLevel.READ_ONLY]: 2,
      [AgiAccessLevel.NO_ACCESS]: 1,
    };

    return agiLevels.reduce((max, level) =>
      (levelPriority[level] || 0) > (levelPriority[max] || 0) ? level : max
    ) as AgiAccessLevel;
  }

  /**
   * Find which permissions matched (for audit trail)
   */
  private findMatchedPermissions(userPermissions: string[], requiredPermission: string): string[] {
    // Check exact match first
    if (userPermissions.includes(requiredPermission)) {
      return [requiredPermission];
    }

    // Check wildcard matches
    const matched: string[] = [];
    for (const userPerm of userPermissions) {
      if (matchWildcard(userPerm, requiredPermission)) {
        matched.push(userPerm);
      }
    }
    if (matched.length > 0) return matched;

    // Check full_control inheritance
    if (checkFullControlInheritance(userPermissions, requiredPermission)) {
      const parts = requiredPermission.split('.');
      const baseResource = parts.slice(0, -1).join('.');
      return [`${baseResource}.full_control`];
    }

    // Check hierarchy inheritance
    const hierarchy = parsePermissionHierarchy(requiredPermission);
    if (hierarchy.module && userPermissions.includes(hierarchy.module)) {
      return [hierarchy.module];
    }
    if (hierarchy.module && hierarchy.screen) {
      const screenPermission = `${hierarchy.module}:${hierarchy.screen}`;
      if (userPermissions.includes(screenPermission)) {
        return [screenPermission];
      }
    }

    return [];
  }

  /**
   * Check if user has access to a specific branch (cached separately, 10min TTL)
   */
  private async checkBranchAccess(
    userId: string,
    tenantId: string,
    branchId: string
  ): Promise<boolean> {
    const cacheKey = `dpf:branch:${tenantId}:${userId}:${branchId}`;

    const cached = await cacheService.get<boolean>(cacheKey, { priority: 'high' });
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // Get user's role
    const userRole = await db.query.dpfUserRoles.findFirst({
      where: and(
        eq(dpfUserRoles.userId, userId),
        eq(dpfUserRoles.tenantId, tenantId),
        eq(dpfUserRoles.isActive, 'true')
      ),
    });

    if (!userRole) {
      await this.cacheBranchAccess(cacheKey, false, tenantId, userId);
      return false;
    }

    // Check if user has access to this branch
    const branchAssignment = await db.query.dpfUserRoleBranches.findFirst({
      where: and(
        eq(dpfUserRoleBranches.userRoleId, userRole.id),
        eq(dpfUserRoleBranches.branchId, branchId),
        eq(dpfUserRoleBranches.tenantId, tenantId)
      ),
    });

    const hasAccess = branchAssignment !== undefined;
    await this.cacheBranchAccess(cacheKey, hasAccess, tenantId, userId);
    return hasAccess;
  }

  /**
   * Cache branch access with proper tags
   */
  private async cacheBranchAccess(
    key: string,
    value: boolean,
    tenantId: string,
    userId: string
  ): Promise<void> {
    await cacheService.set(key, value, {
      ttl: this.BRANCH_CACHE_TTL,
      priority: 'high',
      tags: [
        'dpf-branch',
        `dpf-branch:tenant:${tenantId}`,
        `dpf-branch:user:${tenantId}:${userId}`,
      ],
    });
  }

  /**
   * Invalidate all permission caches for a user
   */
  async invalidateUserPermissions(userId: string, tenantId: string): Promise<void> {
    await cacheService.invalidateByTags([`dpf-perms:user:${tenantId}:${userId}`]);
    logger.info(`✅ DPF: Invalidated permission cache for user ${userId}`);
  }

  /**
   * Invalidate all permission caches for a tenant
   */
  async invalidateTenantPermissions(tenantId: string): Promise<void> {
    await cacheService.invalidateByTags([`dpf-perms:tenant:${tenantId}`]);
    logger.info(`✅ DPF: Invalidated all permission caches for tenant ${tenantId}`);
  }

  /**
   * Invalidate branch access cache for a user
   */
  async invalidateUserBranchCache(userId: string, tenantId: string): Promise<void> {
    await cacheService.invalidateByTags([`dpf-branch:user:${tenantId}:${userId}`]);
    logger.info(`✅ DPF: Invalidated branch access cache for user ${userId}`);
  }

  /**
   * Bulk check multiple permissions (optimized - uses cached permission set)
   */
  async checkMultiplePermissions(
    userId: string,
    tenantId: string,
    permissionCodes: string[]
  ): Promise<Record<string, boolean>> {
    const permData = await this.getEffectivePermissions(userId, tenantId);

    if (permData.roleIds.length === 0) {
      return permissionCodes.reduce((acc, code) => {
        acc[code] = false;
        return acc;
      }, {} as Record<string, boolean>);
    }

    const results: Record<string, boolean> = {};
    for (const code of permissionCodes) {
      results[code] = hasPermissionWithInheritance(permData.permissionCodes, code);
    }
    return results;
  }
}

export const dpfEngine = new DPFEngine();
