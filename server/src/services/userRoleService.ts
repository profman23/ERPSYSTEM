/**
 * User Role Service - User-to-Role assignment management
 * Enforces tenant isolation via AsyncLocalStorage context
 */

import { db } from '../db';
import { dpfUserRoles } from '../db/schemas/dpfUserRoles';
import { dpfRoles } from '../db/schemas/dpfRoles';
import { users } from '../db/schemas/users';
import { eq, and } from 'drizzle-orm';
import { tenantContext } from '../middleware/tenantLoader';
import { authContext } from '../middleware/authMiddleware';
import { CacheService } from '../services/CacheService';
import type { AssignRoleToUserInput, UserWithRole } from '../../../types/dpf';

function getTenantContext() {
  const context = tenantContext.getStore();
  if (!context || !context.tenantId) {
    throw new Error('Tenant context not found');
  }
  return context;
}

function getAuthContext() {
  const context = authContext.getStore();
  if (!context || !context.user) {
    throw new Error('Auth context not found');
  }
  return context;
}

export class UserRoleService {
  /**
   * Assign role to user
   */
  static async assignRoleToUser(input: AssignRoleToUserInput): Promise<{ success: boolean }> {
    const { tenantId } = getTenantContext();
    const { user } = getAuthContext();
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
      assignedBy: user.id,
      expiresAt,
    });

    const cacheKey = `permissions:user:${userId}`;
    await CacheService.invalidatePattern(`${cacheKey}*`);

    return { success: true };
  }

  /**
   * Remove role from user
   */
  static async removeRoleFromUser(userId: string): Promise<{ success: boolean }> {
    const { tenantId } = getTenantContext();

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
  static async getUsersWithRoles(): Promise<UserWithRole[]> {
    const { tenantId } = getTenantContext();

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
  static async getUserRole(userId: string) {
    const { tenantId } = getTenantContext();

    const userRole = await db.query.dpfUserRoles.findFirst({
      where: and(eq(dpfUserRoles.tenantId, tenantId), eq(dpfUserRoles.userId, userId)),
      with: {
        role: true,
      },
    });

    return userRole;
  }
}
