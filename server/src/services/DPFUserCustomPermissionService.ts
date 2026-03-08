/**
 * DPF User Custom Permission Service
 * Handles user-specific permission overrides (GRANT/DENY)
 */

import { db } from '../db';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import {
  dpfUserCustomPermissions,
  dpfPermissions,
  dpfModules,
  dpfScreens,
  dpfActions,
  users,
} from '../db/schemas';
import {
  GrantPermissionInput,
  DenyPermissionInput,
  BulkGrantPermissionsInput,
  ListCustomPermissionsQuery,
  UpdateCustomPermissionInput,
} from '../validations/dpfUserCustomPermissionValidation';
import { dpfEngine } from '../rbac/dpfEngine';

export class DPFUserCustomPermissionService {
  /**
   * List custom permissions with pagination and filters
   */
  static async list(tenantId: string, params: ListCustomPermissionsQuery) {
    const { page = 1, limit = 20, userId, permissionType, isActive } = params;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(dpfUserCustomPermissions.tenantId, tenantId)];

    if (userId) {
      conditions.push(eq(dpfUserCustomPermissions.userId, userId));
    }
    if (permissionType) {
      conditions.push(eq(dpfUserCustomPermissions.permissionType, permissionType));
    }
    if (isActive) {
      conditions.push(eq(dpfUserCustomPermissions.isActive, isActive));
    }

    // Fetch custom permissions with joined data
    const customPermissions = await db
      .select({
        customPermission: dpfUserCustomPermissions,
        permission: dpfPermissions,
        module: dpfModules,
        screen: dpfScreens,
        action: dpfActions,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
        assignedByUser: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(dpfUserCustomPermissions)
      .leftJoin(dpfPermissions, eq(dpfUserCustomPermissions.permissionId, dpfPermissions.id))
      .leftJoin(dpfModules, eq(dpfPermissions.moduleId, dpfModules.id))
      .leftJoin(dpfScreens, eq(dpfPermissions.screenId, dpfScreens.id))
      .leftJoin(dpfActions, eq(dpfPermissions.actionId, dpfActions.id))
      .leftJoin(users, eq(dpfUserCustomPermissions.userId, users.id))
      .leftJoin(
        sql`${users} AS assigned_by_user`,
        eq(dpfUserCustomPermissions.assignedBy, sql`assigned_by_user.id`)
      )
      .where(and(...conditions))
      .orderBy(desc(dpfUserCustomPermissions.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dpfUserCustomPermissions)
      .where(and(...conditions));

    return {
      data: customPermissions.map((cp) => ({
        ...cp.customPermission,
        isActive: cp.customPermission.isActive === 'true',
        permission: cp.permission
          ? {
              ...cp.permission,
              isActive: cp.permission.isActive === 'true',
            }
          : null,
        module: cp.module
          ? {
              ...cp.module,
              isActive: cp.module.isActive === 'true',
              isSystemModule: cp.module.isSystemModule === 'true',
            }
          : null,
        screen: cp.screen
          ? {
              ...cp.screen,
              isActive: cp.screen.isActive === 'true',
            }
          : null,
        action: cp.action
          ? {
              ...cp.action,
              isActive: cp.action.isActive === 'true',
              isDestructive: cp.action.isDestructive === 'true',
            }
          : null,
        user: cp.user,
        assignedByUser: cp.assignedByUser,
      })),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Grant a custom permission to a user
   */
  static async grantPermission(
    tenantId: string,
    assignedBy: string,
    input: GrantPermissionInput
  ) {
    const { userId, permissionId, reason, expiresAt } = input;

    // Validate user exists and belongs to tenant
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

    if (!user) {
      throw new Error('User not found or does not belong to this tenant');
    }

    // Validate permission exists and belongs to tenant
    const [permission] = await db
      .select()
      .from(dpfPermissions)
      .where(and(eq(dpfPermissions.id, permissionId), eq(dpfPermissions.tenantId, tenantId)));

    if (!permission) {
      throw new Error('Permission not found or does not belong to this tenant');
    }

    // Check if already granted
    const existing = await db
      .select()
      .from(dpfUserCustomPermissions)
      .where(
        and(
          eq(dpfUserCustomPermissions.tenantId, tenantId),
          eq(dpfUserCustomPermissions.userId, userId),
          eq(dpfUserCustomPermissions.permissionId, permissionId),
          eq(dpfUserCustomPermissions.permissionType, 'GRANT'),
          eq(dpfUserCustomPermissions.isActive, 'true')
        )
      );

    if (existing.length > 0) {
      throw new Error('Permission already granted to this user');
    }

    // Grant permission
    const [customPermission] = await db
      .insert(dpfUserCustomPermissions)
      .values({
        tenantId,
        userId,
        permissionId,
        permissionType: 'GRANT',
        assignedBy,
        assignedAt: new Date(),
        reason,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: 'true',
      })
      .returning();

    // Invalidate user permissions cache
    await dpfEngine.invalidateUserPermissions(userId, tenantId);

    return {
      ...customPermission,
      isActive: customPermission.isActive === 'true',
    };
  }

  /**
   * Deny a permission for a user (override role permission)
   */
  static async denyPermission(tenantId: string, assignedBy: string, input: DenyPermissionInput) {
    const { userId, permissionId, reason, expiresAt } = input;

    // Validate user exists
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

    if (!user) {
      throw new Error('User not found or does not belong to this tenant');
    }

    // Validate permission exists
    const [permission] = await db
      .select()
      .from(dpfPermissions)
      .where(and(eq(dpfPermissions.id, permissionId), eq(dpfPermissions.tenantId, tenantId)));

    if (!permission) {
      throw new Error('Permission not found or does not belong to this tenant');
    }

    // Check if already denied
    const existing = await db
      .select()
      .from(dpfUserCustomPermissions)
      .where(
        and(
          eq(dpfUserCustomPermissions.tenantId, tenantId),
          eq(dpfUserCustomPermissions.userId, userId),
          eq(dpfUserCustomPermissions.permissionId, permissionId),
          eq(dpfUserCustomPermissions.permissionType, 'DENY'),
          eq(dpfUserCustomPermissions.isActive, 'true')
        )
      );

    if (existing.length > 0) {
      throw new Error('Permission already denied for this user');
    }

    // Deny permission
    const [customPermission] = await db
      .insert(dpfUserCustomPermissions)
      .values({
        tenantId,
        userId,
        permissionId,
        permissionType: 'DENY',
        assignedBy,
        assignedAt: new Date(),
        reason,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: 'true',
      })
      .returning();

    // Invalidate user permissions cache
    await dpfEngine.invalidateUserPermissions(userId, tenantId);

    return {
      ...customPermission,
      isActive: customPermission.isActive === 'true',
    };
  }

  /**
   * Bulk grant multiple permissions to a user
   */
  static async bulkGrantPermissions(
    tenantId: string,
    assignedBy: string,
    input: BulkGrantPermissionsInput
  ) {
    const { userId, permissionIds, reason, expiresAt } = input;

    // Validate user exists
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

    if (!user) {
      throw new Error('User not found or does not belong to this tenant');
    }

    // Validate all permissions exist and belong to tenant
    const permissions = await db
      .select()
      .from(dpfPermissions)
      .where(
        and(
          eq(dpfPermissions.tenantId, tenantId),
          sql`${dpfPermissions.id} IN (${sql.join(
            permissionIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        )
      );

    if (permissions.length !== permissionIds.length) {
      throw new Error('Some permissions not found or do not belong to this tenant');
    }

    // Get already granted permissions to avoid duplicates
    const existingGrants = await db
      .select()
      .from(dpfUserCustomPermissions)
      .where(
        and(
          eq(dpfUserCustomPermissions.tenantId, tenantId),
          eq(dpfUserCustomPermissions.userId, userId),
          eq(dpfUserCustomPermissions.permissionType, 'GRANT'),
          eq(dpfUserCustomPermissions.isActive, 'true'),
          sql`${dpfUserCustomPermissions.permissionId} IN (${sql.join(
            permissionIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        )
      );

    const existingPermissionIds = new Set(existingGrants.map((g) => g.permissionId));
    const newPermissionIds = permissionIds.filter((id) => !existingPermissionIds.has(id));

    if (newPermissionIds.length === 0) {
      throw new Error('All permissions are already granted to this user');
    }

    // Insert new grants
    const values = newPermissionIds.map((permissionId) => ({
      tenantId,
      userId,
      permissionId,
      permissionType: 'GRANT' as const,
      assignedBy,
      assignedAt: new Date(),
      reason,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: 'true' as const,
    }));

    const customPermissions = await db
      .insert(dpfUserCustomPermissions)
      .values(values)
      .returning();

    // Invalidate user permissions cache
    await dpfEngine.invalidateUserPermissions(userId, tenantId);

    return {
      granted: customPermissions.length,
      skipped: existingPermissionIds.size,
      permissions: customPermissions.map((cp) => ({
        ...cp,
        isActive: cp.isActive === 'true',
      })),
    };
  }

  /**
   * Revoke a custom permission (deactivate)
   */
  static async revokeCustomPermission(tenantId: string, customPermissionId: string) {
    const [customPermission] = await db
      .select()
      .from(dpfUserCustomPermissions)
      .where(
        and(
          eq(dpfUserCustomPermissions.id, customPermissionId),
          eq(dpfUserCustomPermissions.tenantId, tenantId)
        )
      );

    if (!customPermission) {
      throw new Error('Custom permission not found');
    }

    const [updated] = await db
      .update(dpfUserCustomPermissions)
      .set({
        isActive: 'false',
        updatedAt: new Date(),
      })
      .where(eq(dpfUserCustomPermissions.id, customPermissionId))
      .returning();

    // Invalidate user permissions cache
    await dpfEngine.invalidateUserPermissions(customPermission.userId, tenantId);

    return {
      ...updated,
      isActive: updated.isActive === 'true',
    };
  }

  /**
   * Update a custom permission
   */
  static async updateCustomPermission(
    tenantId: string,
    customPermissionId: string,
    input: UpdateCustomPermissionInput
  ) {
    const [customPermission] = await db
      .select()
      .from(dpfUserCustomPermissions)
      .where(
        and(
          eq(dpfUserCustomPermissions.id, customPermissionId),
          eq(dpfUserCustomPermissions.tenantId, tenantId)
        )
      );

    if (!customPermission) {
      throw new Error('Custom permission not found');
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }
    if (input.reason !== undefined) {
      updateData.reason = input.reason;
    }
    if (input.expiresAt !== undefined) {
      updateData.expiresAt = new Date(input.expiresAt);
    }

    const [updated] = await db
      .update(dpfUserCustomPermissions)
      .set(updateData)
      .where(eq(dpfUserCustomPermissions.id, customPermissionId))
      .returning();

    // Invalidate user permissions cache
    await dpfEngine.invalidateUserPermissions(customPermission.userId, tenantId);

    return {
      ...updated,
      isActive: updated.isActive === 'true',
    };
  }

  /**
   * Get user's custom permissions (both GRANT and DENY)
   */
  static async getUserCustomPermissions(tenantId: string, userId: string) {
    const customPermissions = await db
      .select({
        customPermission: dpfUserCustomPermissions,
        permission: dpfPermissions,
        module: dpfModules,
        screen: dpfScreens,
        action: dpfActions,
      })
      .from(dpfUserCustomPermissions)
      .leftJoin(dpfPermissions, eq(dpfUserCustomPermissions.permissionId, dpfPermissions.id))
      .leftJoin(dpfModules, eq(dpfPermissions.moduleId, dpfModules.id))
      .leftJoin(dpfScreens, eq(dpfPermissions.screenId, dpfScreens.id))
      .leftJoin(dpfActions, eq(dpfPermissions.actionId, dpfActions.id))
      .where(
        and(
          eq(dpfUserCustomPermissions.tenantId, tenantId),
          eq(dpfUserCustomPermissions.userId, userId),
          eq(dpfUserCustomPermissions.isActive, 'true')
        )
      )
      .orderBy(desc(dpfUserCustomPermissions.createdAt));

    const grants = customPermissions
      .filter((cp) => cp.customPermission.permissionType === 'GRANT')
      .map((cp) => ({
        ...cp.customPermission,
        isActive: cp.customPermission.isActive === 'true',
        permission: cp.permission,
        module: cp.module,
        screen: cp.screen,
        action: cp.action,
      }));

    const denials = customPermissions
      .filter((cp) => cp.customPermission.permissionType === 'DENY')
      .map((cp) => ({
        ...cp.customPermission,
        isActive: cp.customPermission.isActive === 'true',
        permission: cp.permission,
        module: cp.module,
        screen: cp.screen,
        action: cp.action,
      }));

    return {
      grants,
      denials,
      total: customPermissions.length,
    };
  }

  /**
   * Get user's effective permissions (role + custom)
   */
  static async getUserEffectivePermissions(tenantId: string, userId: string) {
    // This will use the dpfEngine to calculate effective permissions
    // For now, return summary
    const customPermissions = await this.getUserCustomPermissions(tenantId, userId);

    return {
      customGrants: customPermissions.grants.length,
      customDenials: customPermissions.denials.length,
      grants: customPermissions.grants,
      denials: customPermissions.denials,
    };
  }
}
