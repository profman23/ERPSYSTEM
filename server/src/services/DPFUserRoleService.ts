/**
 * DPF User-Role Service - User-role assignment wrapper
 * Wraps existing userRoleService + adds enhanced operations
 * Enforces tenant isolation via explicit tenantId parameter
 * Model: ONE ROLE PER USER
 */

import { db } from '../db';
import { dpfUserRoles } from '../db/schemas/dpfUserRoles';
import { dpfRoles } from '../db/schemas/dpfRoles';
import { users } from '../db/schemas/users';
import { dpfPermissions } from '../db/schemas/dpfPermissions';
import { dpfRolePermissions } from '../db/schemas/dpfRolePermissions';
import { businessLines } from '../db/schemas/businessLines';
import { branches } from '../db/schemas/branches';
import { eq, and, inArray, count, sql, or, like } from 'drizzle-orm';
import { cacheService } from './CacheService';
import { UserRoleService } from './userRoleService';
import type {
  AssignRoleInput,
  ListUsersWithRolesInput,
  BulkAssignRoleInput,
} from '../validations/dpfUserRoleValidation';

/**
 * CRITICAL: Tenant ID must be explicitly passed from HTTP request context
 * Services NEVER access AsyncLocalStorage directly - this prevents context leaks
 */

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserWithRole {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    id: string;
    roleCode: string;
    roleName: string;
    assignedAt: Date;
    assignedBy: string | null;
    assignedScope: string;
    businessLineId: string | null;
    branchId: string | null;
    expiresAt: Date | null;
    isActive: string;
  } | null;
}

export class DPFUserRoleService {
  /**
   * Assign role to user (replaces existing role - ONE ROLE PER USER model)
   * Uses existing userRoleService
   * For SYSTEM tenant: allows assigning roles to SYSTEM users (users without tenantId)
   */
  static async assignRole(
    tenantId: string,
    assignedBy: string,
    input: AssignRoleInput,
    isSystemTenant: boolean = false
  ): Promise<{ success: boolean }> {
    const { userId, roleId, assignedScope, businessLineId, branchId, expiresAt } = input;

    // Validate role belongs to tenant
    const role = await db.query.dpfRoles.findFirst({
      where: and(eq(dpfRoles.id, roleId), eq(dpfRoles.tenantId, tenantId)),
    });

    if (!role) {
      throw new Error('Role not found or does not belong to this tenant');
    }

    // Validate role is active
    if (role.isActive === 'false') {
      throw new Error('Cannot assign inactive role');
    }

    // Validate user belongs to tenant (or is a SYSTEM user for SYSTEM tenant)
    let user;
    if (isSystemTenant) {
      // For SYSTEM tenant, find user by ID regardless of tenantId
      user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
    } else {
      user = await db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.tenantId, tenantId)),
      });
    }

    if (!user) {
      throw new Error('User not found or does not belong to this tenant');
    }

    // Validate businessLineId if provided
    if (businessLineId) {
      const businessLine = await db.query.businessLines.findFirst({
        where: and(
          eq(businessLines.id, businessLineId),
          eq(businessLines.tenantId, tenantId)
        ),
      });
      if (!businessLine) {
        throw new Error('Business line not found or does not belong to this tenant');
      }
    }

    // Validate branchId if provided
    if (branchId) {
      const branch = await db.query.branches.findFirst({
        where: and(
          eq(branches.id, branchId),
          eq(branches.tenantId, tenantId)
        ),
      });
      if (!branch) {
        throw new Error('Branch not found or does not belong to this tenant');
      }
    }

    // Use existing UserRoleService to assign role (handles removal of previous role)
    const result = await UserRoleService.assignRoleToUser(tenantId, assignedBy, {
      userId,
      roleId,
      assignedScope: assignedScope || 'GLOBAL',
      businessLineId: businessLineId || null,
      branchId: branchId || null,
      expiresAt: expiresAt || undefined,
    }, isSystemTenant);

    // Invalidate cache
    await this.invalidateCache(tenantId, userId);

    return result ?? { success: true };
  }

  /**
   * Remove role from user
   * Uses existing userRoleService
   * For SYSTEM tenant: allows removing roles from SYSTEM users (users without tenantId)
   */
  static async removeRole(tenantId: string, userId: string, isSystemTenant: boolean = false): Promise<void> {
    // Validate user belongs to tenant (or is a SYSTEM user for SYSTEM tenant)
    let user;
    if (isSystemTenant) {
      user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
    } else {
      user = await db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.tenantId, tenantId)),
      });
    }

    if (!user) {
      throw new Error('User not found or does not belong to this tenant');
    }

    // Use existing UserRoleService to remove role
    await UserRoleService.removeRoleFromUser(tenantId, userId, isSystemTenant);

    // Invalidate cache
    await this.invalidateCache(tenantId, userId);
  }

  /**
   * Get user's current role
   * L1 Cache: 60s TTL
   * For SYSTEM tenant: queries by userId only (not tenantId constraint)
   */
  static async getUserRole(
    tenantId: string,
    userId: string,
    isSystemTenant: boolean = false
  ): Promise<typeof dpfUserRoles.$inferSelect | null> {
    const cacheKey = `dpf:user-role:${tenantId}:${userId}`;
    const cached = await cacheService.get<typeof dpfUserRoles.$inferSelect>(cacheKey);
    if (cached) {
      return cached;
    }

    let userRole;
    if (isSystemTenant) {
      // For SYSTEM tenant, query by userId only
      userRole = await db.query.dpfUserRoles.findFirst({
        where: and(
          eq(dpfUserRoles.userId, userId),
          eq(dpfUserRoles.isActive, 'true')
        ),
        with: {
          role: true,
        },
      });
    } else {
      userRole = await db.query.dpfUserRoles.findFirst({
        where: and(
          eq(dpfUserRoles.tenantId, tenantId),
          eq(dpfUserRoles.userId, userId),
          eq(dpfUserRoles.isActive, 'true')
        ),
        with: {
          role: true,
        },
      });
    }

    if (userRole) {
      await cacheService.set(cacheKey, userRole, 60);
    }

    return userRole || null;
  }

  /**
   * Get users with a specific role
   * L2 Cache: 10min TTL
   */
  static async getUsersWithRole(tenantId: string, roleId: string): Promise<UserWithRole[]> {
    const cacheKey = `dpf:role-users:${tenantId}:${roleId}`;
    const cached = await cacheService.get<UserWithRole[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Validate role belongs to tenant
    const role = await db.query.dpfRoles.findFirst({
      where: and(eq(dpfRoles.id, roleId), eq(dpfRoles.tenantId, tenantId)),
    });

    if (!role) {
      throw new Error('Role not found or does not belong to this tenant');
    }

    // Get all active user-role assignments for this role
    const userRoles = await db.query.dpfUserRoles.findMany({
      where: and(
        eq(dpfUserRoles.tenantId, tenantId),
        eq(dpfUserRoles.roleId, roleId),
        eq(dpfUserRoles.isActive, 'true')
      ),
      with: {
        user: true,
        role: true,
      },
    });

    const result: UserWithRole[] = userRoles.map((ur) => ({
      id: ur.user.id,
      email: ur.user.email,
      firstName: ur.user.firstName || '',
      lastName: ur.user.lastName || '',
      role: {
        id: ur.role.id,
        roleCode: ur.role.roleCode,
        roleName: ur.role.roleName,
        assignedAt: ur.createdAt,
        assignedBy: ur.assignedBy,
        assignedScope: ur.assignedScope,
        businessLineId: ur.businessLineId,
        branchId: ur.branchId,
        expiresAt: ur.expiresAt,
        isActive: ur.isActive,
      },
    }));

    await cacheService.set(cacheKey, result, 600);
    return result;
  }

  /**
   * List users with their roles (pagination + filtering)
   * L2 Cache: 10min TTL
   */
  static async listUsersWithRoles(
    tenantId: string,
    params: ListUsersWithRolesInput
  ): Promise<PaginatedResponse<UserWithRole>> {
    const {
      page = 1,
      limit = 20,
      search,
      roleId,
      isActive,
      assignedScope,
      businessLineId,
      branchId,
      sortBy = 'assignedAt',
      sortOrder = 'desc',
    } = params;
    const offset = (page - 1) * limit;

    // Build cache key
    const cacheKey = `dpf:users-with-roles:list:${tenantId}:${JSON.stringify(params)}`;

    // Check L2 cache
    const cached = await cacheService.get<PaginatedResponse<UserWithRole>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build WHERE conditions for user-roles
    const conditions = [eq(dpfUserRoles.tenantId, tenantId)];

    if (isActive) {
      conditions.push(eq(dpfUserRoles.isActive, isActive));
    }

    if (roleId) {
      conditions.push(eq(dpfUserRoles.roleId, roleId));
    }

    if (assignedScope) {
      conditions.push(eq(dpfUserRoles.assignedScope, assignedScope));
    }

    if (businessLineId) {
      conditions.push(eq(dpfUserRoles.businessLineId, businessLineId));
    }

    if (branchId) {
      conditions.push(eq(dpfUserRoles.branchId, branchId));
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(dpfUserRoles)
      .where(and(...conditions));

    // Get paginated data with user and role details
    const userRoles = await db.query.dpfUserRoles.findMany({
      where: and(...conditions),
      with: {
        user: true,
        role: true,
      },
      limit,
      offset,
    });

    // Apply search filter (post-query for simplicity)
    let filteredUserRoles = userRoles;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUserRoles = userRoles.filter(
        (ur) =>
          ur.user.email.toLowerCase().includes(searchLower) ||
          (ur.user.firstName && ur.user.firstName.toLowerCase().includes(searchLower)) ||
          (ur.user.lastName && ur.user.lastName.toLowerCase().includes(searchLower))
      );
    }

    const data: UserWithRole[] = filteredUserRoles.map((ur) => ({
      id: ur.user.id,
      email: ur.user.email,
      firstName: ur.user.firstName || '',
      lastName: ur.user.lastName || '',
      role: {
        id: ur.role.id,
        roleCode: ur.role.roleCode,
        roleName: ur.role.roleName,
        assignedAt: ur.createdAt,
        assignedBy: ur.assignedBy,
        assignedScope: ur.assignedScope,
        businessLineId: ur.businessLineId,
        branchId: ur.branchId,
        expiresAt: ur.expiresAt,
        isActive: ur.isActive,
      },
    }));

    const result: PaginatedResponse<UserWithRole> = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache for 10 minutes
    await cacheService.set(cacheKey, result, 600);

    return result;
  }

  /**
   * Bulk assign role to multiple users
   */
  static async bulkAssignRole(
    tenantId: string,
    assignedBy: string,
    input: BulkAssignRoleInput
  ): Promise<{ success: boolean; assignedCount: number }> {
    const { roleId, userIds, assignedScope, businessLineId, branchId, expiresAt } = input;

    // Validate role belongs to tenant
    const role = await db.query.dpfRoles.findFirst({
      where: and(eq(dpfRoles.id, roleId), eq(dpfRoles.tenantId, tenantId)),
    });

    if (!role) {
      throw new Error('Role not found or does not belong to this tenant');
    }

    if (role.isActive === 'false') {
      throw new Error('Cannot assign inactive role');
    }

    // Validate all users belong to tenant
    const usersToAssign = await db.query.users.findMany({
      where: and(eq(users.tenantId, tenantId), inArray(users.id, userIds)),
    });

    if (usersToAssign.length !== userIds.length) {
      throw new Error('Some users not found or do not belong to this tenant');
    }

    // Assign role to each user
    const assignments = userIds.map((userId) =>
      this.assignRole(tenantId, assignedBy, {
        userId,
        roleId,
        assignedScope,
        businessLineId,
        branchId,
        expiresAt,
      })
    );

    await Promise.all(assignments);

    return {
      success: true,
      assignedCount: userIds.length,
    };
  }

  /**
   * Get user's effective permissions (via role)
   * L2 Cache: 5min TTL
   */
  static async getUserPermissions(
    tenantId: string,
    userId: string
  ): Promise<typeof dpfPermissions.$inferSelect[]> {
    const cacheKey = `dpf:user-permissions:${tenantId}:${userId}`;
    const cached = await cacheService.get<typeof dpfPermissions.$inferSelect[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get user's active role
    const userRole = await this.getUserRole(tenantId, userId);

    if (!userRole) {
      return [];
    }

    // Get role's permissions
    const rolePermissions = await db.query.dpfRolePermissions.findMany({
      where: and(
        eq(dpfRolePermissions.tenantId, tenantId),
        eq(dpfRolePermissions.roleId, userRole.roleId)
      ),
      with: {
        permission: true,
      },
    });

    const permissions = rolePermissions.map((rp) => rp.permission);

    // Cache for 5 minutes
    await cacheService.set(cacheKey, permissions, 300);

    return permissions;
  }

  /**
   * Get user's tenant ID - used by SYSTEM users to determine tenant context
   * Returns null if user not found
   */
  static async getUserTenantId(userId: string): Promise<string | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { tenantId: true },
    });

    return user?.tenantId || null;
  }

  /**
   * Invalidate user-role caches
   */
  private static async invalidateCache(tenantId: string, userId?: string): Promise<void> {
    if (userId) {
      // Invalidate specific user cache
      await cacheService.del(`dpf:user-role:${tenantId}:${userId}`);
      await cacheService.del(`dpf:user-permissions:${tenantId}:${userId}`);
    }

    // Invalidate list cache
    await cacheService.invalidatePattern(`dpf:users-with-roles:list:${tenantId}:*`);

    // Invalidate role-users cache
    await cacheService.invalidatePattern(`dpf:role-users:${tenantId}:*`);

    // Invalidate permission engine cache for this user
    if (userId) {
      await cacheService.invalidatePattern(`dpf:perm:${tenantId}:${userId}:*`);
    }
  }
}
