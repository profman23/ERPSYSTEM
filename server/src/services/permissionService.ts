/**
 * Permission Service - Permission management and assignment
 * Enforces tenant isolation via AsyncLocalStorage context
 */

import { db } from '../db';
import { dpfPermissions } from '../db/schemas/dpfPermissions';
import { dpfRolePermissions } from '../db/schemas/dpfRolePermissions';
import { dpfModules } from '../db/schemas/dpfModules';
import { dpfScreens } from '../db/schemas/dpfScreens';
import { dpfActions } from '../db/schemas/dpfActions';
import { eq, and, inArray, asc } from 'drizzle-orm';
import { cacheService } from '../services/CacheService';
import type { DPFPermission, PermissionMatrixModule, AssignPermissionsInput } from '../../../types/dpf';

/**
 * CRITICAL: Tenant ID must be explicitly passed from HTTP request context
 * Services NEVER access AsyncLocalStorage directly - this prevents context leaks
 */

export interface PermissionMatrixOptions {
  systemOnly?: boolean; // If true, returns only SYSTEM modules (platform-level)
  tenantOnly?: boolean; // If true, returns only tenant modules (non-system)
}

export class PermissionService {
  /**
   * Get all permissions for current tenant (organized by module → screen → action)
   * @param tenantId - Tenant ID
   * @param options - Filter options (systemOnly, tenantOnly)
   */
  static async getPermissionMatrix(
    tenantId: string,
    options: PermissionMatrixOptions = {}
  ): Promise<PermissionMatrixModule[]> {
    const { systemOnly, tenantOnly } = options;

    // Build module filter conditions
    const moduleConditions = [
      eq(dpfModules.tenantId, tenantId),
      eq(dpfModules.isActive, 'true'),
    ];

    // Filter by system/tenant modules if specified
    if (systemOnly) {
      moduleConditions.push(eq(dpfModules.isSystemModule, 'true'));
    } else if (tenantOnly) {
      moduleConditions.push(eq(dpfModules.isSystemModule, 'false'));
    }

    const [modules, screens, actions, permissions] = await Promise.all([
      db.query.dpfModules.findMany({
        where: and(...moduleConditions),
      }),
      db.query.dpfScreens.findMany({
        where: and(eq(dpfScreens.tenantId, tenantId), eq(dpfScreens.isActive, 'true')),
      }),
      db.query.dpfActions.findMany({
        where: and(eq(dpfActions.tenantId, tenantId), eq(dpfActions.isActive, 'true')),
      }),
      db.query.dpfPermissions.findMany({
        where: and(eq(dpfPermissions.tenantId, tenantId), eq(dpfPermissions.isActive, 'true')),
      }),
    ]);

    const matrix: PermissionMatrixModule[] = modules.map((module) => {
      const moduleScreens = screens.filter((s) => s.moduleId === module.id);
      const modulePermissions = permissions.filter((p) => p.moduleId === module.id && !p.screenId && !p.actionId);

      return {
        module,
        modulePermissions,
        screens: moduleScreens.map((screen) => {
          const screenActions = actions.filter((a) => a.screenId === screen.id);
          const screenPermissions = permissions.filter(
            (p) => p.screenId === screen.id && p.moduleId === module.id && !p.actionId
          );
          const actionPermissions = permissions.filter((p) =>
            screenActions.some((a) => a.id === p.actionId)
          );

          return {
            screen,
            actions: screenActions,
            screenPermissions,
            actionPermissions,
          };
        }),
      };
    });

    return matrix;
  }

  /**
   * Get permissions assigned to a specific role
   */
  static async getRolePermissions(tenantId: string, roleId: string): Promise<string[]> {

    const rolePermissions = await db.query.dpfRolePermissions.findMany({
      where: and(eq(dpfRolePermissions.tenantId, tenantId), eq(dpfRolePermissions.roleId, roleId)),
    });

    return rolePermissions.map((rp) => rp.permissionId);
  }

  /**
   * Assign permissions to a role (replaces existing permissions)
   * SECURITY: Validates all permission IDs belong to tenant before assignment
   */
  static async assignPermissionsToRole(tenantId: string, input: AssignPermissionsInput): Promise<{ success: boolean }> {
    const { roleId, permissionIds } = input;

    if (permissionIds.length > 0) {
      const validPermissions = await db.query.dpfPermissions.findMany({
        where: and(
          eq(dpfPermissions.tenantId, tenantId),
          inArray(dpfPermissions.id, permissionIds)
        ),
      });

      if (validPermissions.length !== permissionIds.length) {
        throw new Error('Invalid permission IDs: some permissions do not belong to this tenant');
      }
    }

    await db
      .delete(dpfRolePermissions)
      .where(and(eq(dpfRolePermissions.tenantId, tenantId), eq(dpfRolePermissions.roleId, roleId)));

    if (permissionIds.length > 0) {
      await db.insert(dpfRolePermissions).values(
        permissionIds.map((permissionId) => ({
          tenantId,
          roleId,
          permissionId,
        }))
      );
    }

    const cacheKey = `permissions:role:${roleId}`;
    await cacheService.invalidatePattern(`${cacheKey}*`);

    return { success: true };
  }

  /**
   * Get all permissions (flat list)
   */
  static async getAllPermissions(tenantId: string): Promise<DPFPermission[]> {

    const permissions = await db.query.dpfPermissions.findMany({
      where: and(eq(dpfPermissions.tenantId, tenantId), eq(dpfPermissions.isActive, 'true')),
    });

    return permissions;
  }
}
