/**
 * User Role Service - User-to-Role assignment management
 * Enforces tenant isolation via AsyncLocalStorage context
 */

import { db } from '../db';
import { dpfUserRoles } from '../db/schemas/dpfUserRoles';
import { dpfRoles } from '../db/schemas/dpfRoles';
import { users } from '../db/schemas/users';
import { eq, and } from 'drizzle-orm';
import { CacheService } from '../services/CacheService';
import type { AssignRoleToUserInput, UserWithRole } from '../../../types/dpf';

/**
 * CRITICAL: Tenant ID and User ID must be explicitly passed from HTTP request context
 * Services NEVER access AsyncLocalStorage directly - this prevents context leaks
 */

export class UserRoleService {
  /**
   * Assign role to user
   */
  static async assignRoleToUser(
    tenantId: string,
    assignedBy: string,
    input: AssignRoleToUserInput
  ): Promise<{ success: boolean }> {
    const { userId, roleId, expiresAt } = input;

    const targetUser = await db.query.users.findFirst({
      where: and(eq(users.tenantId, tenantId), eq(users.id, userId)),
    });

    if (!targetUser) {
      throw new Error('User not found');
    }

    const role = await db.query.dpfRoles.findFirst({
      where: and(eq(dpfRoles.tenantId, tenantId), eq(dpfRoles.id, roleId)),
    });

    if (!role) {
      throw new Error('Role not found');
    }

    await db
      .delete(dpfUserRoles)
      .where(and(eq(dpfUserRoles.tenantId, tenantId), eq(dpfUserRoles.userId, userId)));

    await db.insert(dpfUserRoles).values({
      tenantId,
      userId,
      roleId,
      assignedBy,
      expiresAt,
    });

    const cacheKey = `permissions:user:${userId}`;
    await CacheService.invalidatePattern(`${cacheKey}*`);

    return { success: true };
  }

  /**
   * Remove role from user
   */
  static async removeRoleFromUser(tenantId: string, userId: string): Promise<{ success: boolean }> {

    await db
      .delete(dpfUserRoles)
      .where(and(eq(dpfUserRoles.tenantId, tenantId), eq(dpfUserRoles.userId, userId)));

    const cacheKey = `permissions:user:${userId}`;
    await CacheService.invalidatePattern(`${cacheKey}*`);

    return { success: true };
  }

  /**
   * Get users with their assigned roles
   */
  static async getUsersWithRoles(tenantId: string): Promise<UserWithRole[]> {

    const usersWithRoles = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        roleId: dpfRoles.id,
        roleName: dpfRoles.roleName,
        roleCode: dpfRoles.roleCode,
        assignedAt: dpfUserRoles.assignedAt,
        expiresAt: dpfUserRoles.expiresAt,
      })
      .from(users)
      .leftJoin(dpfUserRoles, eq(users.id, dpfUserRoles.userId))
      .leftJoin(dpfRoles, eq(dpfUserRoles.roleId, dpfRoles.id))
      .where(eq(users.tenantId, tenantId));

    return usersWithRoles.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.roleId
        ? {
            id: u.roleId,
            roleName: u.roleName!,
            roleCode: u.roleCode!,
            tenantId,
            roleNameAr: undefined,
            description: undefined,
            descriptionAr: undefined,
            isProtected: 'false',
            isDefault: 'false',
            isActive: 'true',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : undefined,
      assignedAt: u.assignedAt || undefined,
      expiresAt: u.expiresAt || undefined,
    }));
  }

  /**
   * Get user's current role
   */
  static async getUserRole(tenantId: string, userId: string) {

    const userRole = await db.query.dpfUserRoles.findFirst({
      where: and(eq(dpfUserRoles.tenantId, tenantId), eq(dpfUserRoles.userId, userId)),
      with: {
        role: true,
      },
    });

    return userRole;
  }
}
