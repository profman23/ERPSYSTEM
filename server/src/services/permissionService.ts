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
import { eq, and, inArray } from 'drizzle-orm';
import { tenantContext } from '../middleware/tenantLoader';
import { CacheService } from '../services/CacheService';
import type { DPFPermission, PermissionMatrixModule, AssignPermissionsInput } from '../../../types/dpf';

function getTenantContext() {
  const context = tenantContext.getStore();
  if (!context || !context.tenantId) {
    throw new Error('Tenant context not found');
  }
  return context;
}

export class PermissionService {
  /**
   * Get all permissions for current tenant (organized by module → screen → action)
   */
  static async getPermissionMatrix(): Promise<PermissionMatrixModule[]> {
    const { tenantId } = getTenantContext();

    const [modules, screens, actions, permissions] = await Promise.all([
      db.query.dpfModules.findMany({
        where: and(eq(dpfModules.tenantId, tenantId), eq(dpfModules.isActive, 'true')),
        orderBy: (modules, { asc }) => [asc(modules.displayOrder)],
      }),
      db.query.dpfScreens.findMany({
        where: and(eq(dpfScreens.tenantId, tenantId), eq(dpfScreens.isActive, 'true')),
        orderBy: (screens, { asc }) => [asc(screens.displayOrder)],
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
  static async getRolePermissions(roleId: string): Promise<string[]> {
    const { tenantId } = getTenantContext();

    const rolePermissions = await db.query.dpfRolePermissions.findMany({
      where: and(eq(dpfRolePermissions.tenantId, tenantId), eq(dpfRolePermissions.roleId, roleId)),
    });

    return rolePermissions.map((rp) => rp.permissionId);
  }

  /**
   * Assign permissions to a role (replaces existing permissions)
   */
  static async assignPermissionsToRole(input: AssignPermissionsInput): Promise<{ success: boolean }> {
    const { tenantId } = getTenantContext();
    const { roleId, permissionIds } = input;

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
    await CacheService.invalidatePattern(`${cacheKey}*`);

    return { success: true };
  }

  /**
   * Get all permissions (flat list)
   */
  static async getAllPermissions(): Promise<DPFPermission[]> {
    const { tenantId } = getTenantContext();

    const permissions = await db.query.dpfPermissions.findMany({
      where: and(eq(dpfPermissions.tenantId, tenantId), eq(dpfPermissions.isActive, 'true')),
    });

    return permissions;
  }
}
