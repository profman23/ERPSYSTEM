/**
 * DPF Permission Middleware (SAP B1 Style)
 * Authorization levels: 0=None, 1=ReadOnly, 2=Full
 *
 * IMPORTANT: Only super_admin users bypass permission checks.
 * All other SYSTEM users (with accessScope='system') are subject to permission checks
 * based on their assigned roles in the SYSTEM tenant.
 */

import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';
import { AuthorizationLevel } from './dpfTypes';
import logger from '../config/logger';
import { TenantContext } from '../core/tenant/tenantContext';
import { db } from '../db';
import { tenants, dpfRoles, dpfUserRoles, dpfRoleScreenAuthorizations, users } from '../db/schemas';
import { eq, and, inArray } from 'drizzle-orm';

// Cache SYSTEM tenant ID to avoid repeated DB queries
let cachedSystemTenantId: string | null = null;

/**
 * Get SYSTEM tenant ID (cached)
 */
async function getSystemTenantId(): Promise<string | null> {
  if (cachedSystemTenantId) return cachedSystemTenantId;

  const systemTenant = await db.query.tenants.findFirst({
    where: eq(tenants.code, 'SYSTEM'),
  });

  if (systemTenant) {
    cachedSystemTenantId = systemTenant.id;
  }

  return cachedSystemTenantId;
}

/**
 * Get user's authorization level for a specific screen
 * Returns the highest authorization level from all assigned roles
 */
async function getUserScreenAuthorization(
  userId: string,
  tenantId: string,
  screenCode: string
): Promise<AuthorizationLevel> {
  try {
    // Get user's roles in this tenant
    const userRoles = await db.query.dpfUserRoles.findMany({
      where: and(
        eq(dpfUserRoles.userId, userId),
        eq(dpfUserRoles.tenantId, tenantId),
        eq(dpfUserRoles.isActive, 'true')
      ),
    });

    if (userRoles.length === 0) {
      return AuthorizationLevel.NONE;
    }

    const roleIds = userRoles.map(ur => ur.roleId);

    // Get authorization levels for this screen from all user's roles
    const authorizations = await db.query.dpfRoleScreenAuthorizations.findMany({
      where: and(
        inArray(dpfRoleScreenAuthorizations.roleId, roleIds),
        eq(dpfRoleScreenAuthorizations.screenCode, screenCode)
      ),
    });

    if (authorizations.length === 0) {
      return AuthorizationLevel.NONE;
    }

    // Return the highest authorization level
    const maxLevel = Math.max(...authorizations.map(a => a.authorizationLevel));
    return maxLevel as AuthorizationLevel;
  } catch (error) {
    logger.error(`❌ DPF: Error getting user screen authorization:`, error);
    return AuthorizationLevel.NONE;
  }
}

/**
 * Get all user's screen authorizations
 * Returns a map of screenCode -> authorizationLevel
 */
export async function getUserAllScreenAuthorizations(
  userId: string,
  tenantId: string
): Promise<Record<string, AuthorizationLevel>> {
  try {
    // Get user's roles in this tenant
    const userRoles = await db.query.dpfUserRoles.findMany({
      where: and(
        eq(dpfUserRoles.userId, userId),
        eq(dpfUserRoles.tenantId, tenantId),
        eq(dpfUserRoles.isActive, 'true')
      ),
    });

    if (userRoles.length === 0) {
      logger.warn(`⚠️ DPF: No active dpfUserRoles found for userId=${userId} tenantId=${tenantId}. User has no role assigned.`);
      return {};
    }

    const roleIds = userRoles.map(ur => ur.roleId);
    logger.info(`🔍 DPF: User ${userId} has ${userRoles.length} role(s): ${roleIds.join(', ')}`);

    // Get all authorization levels for all screens from all user's roles
    const authorizations = await db.query.dpfRoleScreenAuthorizations.findMany({
      where: inArray(dpfRoleScreenAuthorizations.roleId, roleIds),
    });

    if (authorizations.length === 0) {
      logger.warn(`⚠️ DPF: No screen authorizations found for roles [${roleIds.join(', ')}]. Role may have no screens configured.`);
    }

    // Build map with highest authorization level per screen
    const result: Record<string, AuthorizationLevel> = {};
    for (const auth of authorizations) {
      const current = result[auth.screenCode] || AuthorizationLevel.NONE;
      if (auth.authorizationLevel > current) {
        result[auth.screenCode] = auth.authorizationLevel as AuthorizationLevel;
      }
    }

    return result;
  } catch (error) {
    logger.error(`❌ DPF: Error getting user all screen authorizations:`, error);
    return {};
  }
}

/**
 * Express middleware for screen-level permission checking (SAP B1 style)
 *
 * @param screenCode - The screen code to check authorization for
 * @param requiredLevel - Minimum required authorization level ('read' or 'write')
 *
 * Usage:
 *   app.get('/api/tenants', requireScreenAuth('SYSTEM_TENANT_LIST', 'read'), handler)
 *   app.post('/api/tenants', requireScreenAuth('SYSTEM_TENANT_LIST', 'write'), handler)
 */
export function requireScreenAuth(screenCode: string, requiredLevel: 'read' | 'write' = 'read') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const tenantContext = TenantContext.getContext();

      if (!user) {
        logger.warn(`⚠️ DPF: Authorization check failed - no user context`);
        return res.status(401).json({
          success: false,
          message: 'Unauthorized. Please authenticate first.',
        });
      }

      logger.info(`🔍 DPF: Checking user ${user.userId} role='${user.role}' for screen ${screenCode} (${requiredLevel})`);

      // super_admin bypasses all permission checks
      if (user.role === 'super_admin') {
        logger.info(`✅ DPF: Super Admin ${user.userId} bypassing authorization check for ${screenCode}`);
        (req as any).authorization = {
          screenCode,
          level: AuthorizationLevel.FULL,
          isSuperAdmin: true,
        };
        return next();
      }

      // tenant_admin has full access to all tenant-level screens
      if (user.role === 'tenant_admin') {
        logger.info(`✅ DPF: Tenant Admin ${user.userId} bypassing authorization check for ${screenCode}`);
        (req as any).authorization = {
          screenCode,
          level: AuthorizationLevel.FULL,
          isTenantAdmin: true,
        };
        return next();
      }

      // Determine which tenant to check authorization against
      let targetTenantId: string | null = null;

      if (user.accessScope === 'system' || tenantContext?.accessScope === 'system') {
        // SYSTEM users check authorization against SYSTEM tenant
        targetTenantId = await getSystemTenantId();
        if (!targetTenantId) {
          logger.error(`❌ DPF: SYSTEM tenant not found for authorization check`);
          return res.status(500).json({
            success: false,
            message: 'System configuration error. SYSTEM tenant not found.',
          });
        }
      } else {
        // Regular tenant users use their tenant context
        if (!tenantContext?.tenantId) {
          logger.warn(`⚠️ DPF: Authorization check failed - no tenant context`);
          return res.status(401).json({
            success: false,
            message: 'Unauthorized. Tenant context required.',
          });
        }
        targetTenantId = tenantContext.tenantId;
      }

      // Get user's authorization level for this screen
      const authLevel = await getUserScreenAuthorization(user.userId, targetTenantId, screenCode);

      // Check if user has required authorization level
      const minRequired = requiredLevel === 'read' ? AuthorizationLevel.READ_ONLY : AuthorizationLevel.FULL;

      if (authLevel < minRequired) {
        const levelName = authLevel === AuthorizationLevel.NONE ? 'No Authorization' :
                         authLevel === AuthorizationLevel.READ_ONLY ? 'Read Only' : 'Full';
        const requiredName = requiredLevel === 'read' ? 'Read Only' : 'Full Authorization';

        logger.warn(
          `⚠️ DPF: Authorization denied for user ${user.userId} - screen ${screenCode}: has ${levelName}, needs ${requiredName}`
        );
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to perform this action.',
          screen: screenCode,
          currentLevel: levelName,
          requiredLevel: requiredName,
        });
      }

      // Authorization granted
      (req as any).authorization = {
        screenCode,
        level: authLevel,
        isSystemUser: user.accessScope === 'system',
      };

      logger.info(`✅ DPF: Authorization granted for user ${user.userId} - screen ${screenCode} (level ${authLevel})`);
      next();
    } catch (error) {
      logger.error(`❌ DPF: Authorization middleware error:`, error);
      res.status(500).json({
        success: false,
        message: 'Authorization check failed',
      });
    }
  };
}

/**
 * Legacy middleware for backward compatibility
 * Maps old permission codes to screen codes
 *
 * @deprecated Use requireScreenAuth instead
 */
export function requirePermission(permissionCode: string) {
  // Map permission codes to screen codes
  // Format: "module.action" -> screen code
  const screenMap: Record<string, { screenCode: string; level: 'read' | 'write' }> = {
    // System Tenants
    'system.tenants.view': { screenCode: 'SYSTEM_TENANT_LIST', level: 'read' },
    'system.tenants.create': { screenCode: 'SYSTEM_TENANT_LIST', level: 'write' },
    'system.tenants.update': { screenCode: 'SYSTEM_TENANT_LIST', level: 'write' },
    'system.tenants.full_control': { screenCode: 'SYSTEM_TENANT_LIST', level: 'write' },
    // System Users
    'system.users.view': { screenCode: 'SYSTEM_USER_LIST', level: 'read' },
    'system.users.create': { screenCode: 'SYSTEM_USER_LIST', level: 'write' },
    'system.users.full_control': { screenCode: 'SYSTEM_USER_LIST', level: 'write' },
    // System Roles
    'system.roles.view': { screenCode: 'SYSTEM_ROLE_LIST', level: 'read' },
    'system.roles.create': { screenCode: 'SYSTEM_ROLE_LIST', level: 'write' },
    'system.roles.full_control': { screenCode: 'SYSTEM_ROLE_LIST', level: 'write' },
    // System Panel Tenants (SYSTEM_TENANT_LIST screen)
    'tenants.view': { screenCode: 'SYSTEM_TENANT_LIST', level: 'read' },
    'tenants.create': { screenCode: 'SYSTEM_TENANT_LIST', level: 'write' },
    'tenants.update': { screenCode: 'SYSTEM_TENANT_LIST', level: 'write' },
    'tenants.full_control': { screenCode: 'SYSTEM_TENANT_LIST', level: 'write' },
    // Admin Users
    'users.view': { screenCode: 'USERS', level: 'read' },
    'users.create': { screenCode: 'USERS', level: 'write' },
    'users.assign_role': { screenCode: 'USERS', level: 'write' },
    'users.full_control': { screenCode: 'USERS', level: 'write' },
    // Admin Roles
    'roles.view': { screenCode: 'ROLES', level: 'read' },
    'roles.create': { screenCode: 'ROLES', level: 'write' },
    'roles.update': { screenCode: 'ROLES', level: 'write' },
    'roles.full_control': { screenCode: 'ROLES', level: 'write' },
    // Permissions management
    'permissions.view': { screenCode: 'ROLES', level: 'read' },
    'permissions.assign': { screenCode: 'ROLES', level: 'write' },
    // DPF Modules
    'dpf.modules.view': { screenCode: 'SYSTEM_DPF_MANAGER', level: 'read' },
    'dpf.modules.create': { screenCode: 'SYSTEM_DPF_MANAGER', level: 'write' },
    'dpf.modules.update': { screenCode: 'SYSTEM_DPF_MANAGER', level: 'write' },
    'dpf.modules.delete': { screenCode: 'SYSTEM_DPF_MANAGER', level: 'write' },
    // DPF Screens
    'dpf.screens.view': { screenCode: 'SYSTEM_DPF_MANAGER', level: 'read' },
    'dpf.screens.create': { screenCode: 'SYSTEM_DPF_MANAGER', level: 'write' },
    'dpf.screens.update': { screenCode: 'SYSTEM_DPF_MANAGER', level: 'write' },
    'dpf.screens.delete': { screenCode: 'SYSTEM_DPF_MANAGER', level: 'write' },
    // DPF Actions
    'dpf.actions.view': { screenCode: 'SYSTEM_DPF_MANAGER', level: 'read' },
    'dpf.actions.create': { screenCode: 'SYSTEM_DPF_MANAGER', level: 'write' },
    'dpf.actions.update': { screenCode: 'SYSTEM_DPF_MANAGER', level: 'write' },
    'dpf.actions.delete': { screenCode: 'SYSTEM_DPF_MANAGER', level: 'write' },
    // DPF Permissions
    'dpf.permissions.view': { screenCode: 'SYSTEM_DPF_MANAGER', level: 'read' },
    'dpf.permissions.assign': { screenCode: 'SYSTEM_DPF_MANAGER', level: 'write' },
    // DPF User Roles & Branches
    'dpf.user_roles.view': { screenCode: 'USERS', level: 'read' },
    'dpf.user_roles.manage_branches': { screenCode: 'USERS', level: 'write' },
    'dpf.branches.view_users': { screenCode: 'BRANCHES', level: 'read' },
  };

  const mapping = screenMap[permissionCode];
  if (mapping) {
    return requireScreenAuth(mapping.screenCode, mapping.level);
  }

  // Security: deny access for unknown permission codes instead of silently granting
  logger.error(`❌ DPF: Unknown permission code "${permissionCode}" - denying access. Add mapping to screenMap or use requireScreenAuth directly.`);
  return (req: Request, res: Response) => {
    res.status(403).json({
      success: false,
      message: 'Access denied. Permission configuration error.',
      code: 'INVALID_PERMISSION_CODE',
    });
  };
}

/**
 * Socket.IO middleware for event permission checking
 */
export async function checkSocketPermission(
  socket: Socket,
  eventName: string
): Promise<boolean> {
  try {
    const user = socket.data.user;
    if (!user) {
      logger.warn(`⚠️ DPF: Socket permission check - no user context`);
      return false;
    }

    // For now, allow all authenticated users for socket events
    // TODO: Implement screen-based socket event authorization
    return true;
  } catch (error) {
    logger.error(`❌ DPF: Socket permission check error:`, error);
    return false;
  }
}

/**
 * Check screen authorization (for UI navigation)
 */
export async function checkScreenAccess(
  userId: string,
  tenantId: string,
  screenCode: string,
  requiredLevel: 'read' | 'write' = 'read'
): Promise<boolean> {
  try {
    // Check if user is super_admin or tenant_admin — they bypass DPF checks
    // (matches requireScreenAuth middleware behavior)
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true },
    });

    if (user?.role === 'super_admin' || user?.role === 'tenant_admin') {
      return true;
    }

    const authLevel = await getUserScreenAuthorization(userId, tenantId, screenCode);
    const minRequired = requiredLevel === 'read' ? AuthorizationLevel.READ_ONLY : AuthorizationLevel.FULL;
    return authLevel >= minRequired;
  } catch (error) {
    logger.error(`❌ DPF: Screen access check error:`, error);
    return false;
  }
}

/**
 * Check module access (for UI navigation)
 * Returns true if user has any authorization (read or full) to any screen in the module
 */
export async function checkModuleAccess(
  userId: string,
  tenantId: string,
  moduleCode: string
): Promise<boolean> {
  try {
    // Get all user's screen authorizations
    const authorizations = await getUserAllScreenAuthorizations(userId, tenantId);

    // Check if any screen in the module has at least read access
    // This would need to be improved to actually check module-screen mapping
    return Object.values(authorizations).some(level => level >= AuthorizationLevel.READ_ONLY);
  } catch (error) {
    logger.error(`❌ DPF: Module access check error:`, error);
    return false;
  }
}

/**
 * Get user's accessible modules (for UI menu generation)
 */
export async function getUserAccessibleModules(
  userId: string,
  tenantId: string
): Promise<string[]> {
  try {
    logger.debug(`DPF: Getting accessible modules for user ${userId}`);
    // TODO: Implement based on screen authorizations
    return [];
  } catch (error) {
    logger.error(`❌ DPF: Get accessible modules error:`, error);
    return [];
  }
}

/**
 * Bulk screen authorization check helper (for UI state management)
 */
export async function checkMultipleScreenAuthorizations(
  userId: string,
  tenantId: string,
  screenCodes: string[]
): Promise<Record<string, AuthorizationLevel>> {
  const result: Record<string, AuthorizationLevel> = {};
  const allAuths = await getUserAllScreenAuthorizations(userId, tenantId);

  for (const code of screenCodes) {
    result[code] = allAuths[code] || AuthorizationLevel.NONE;
  }

  return result;
}
