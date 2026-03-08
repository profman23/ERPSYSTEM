/**
 * DPF User Role Branch Service
 *
 * Manages branch-level access control for users.
 * Allows assigning users to specific branches with their role permissions.
 *
 * Performance:
 * - L1 Cache: 60s TTL for individual assignments
 * - L2 Cache: 600s TTL for user branch lists
 * - Expected: <5ms cached, <30ms cold
 */

import { db } from '../db/index.js';
import { dpfUserRoleBranches } from '../db/schemas/dpfUserRoleBranches.js';
import { dpfUserRoles } from '../db/schemas/dpfUserRoles.js';
import { branches } from '../db/schemas/branches.js';
import { users } from '../db/schemas/users.js';
import { eq, and, inArray } from 'drizzle-orm';
import { CacheService } from './CacheService.js';
import { dpfEngine } from '../rbac/dpfEngine.js';

export interface AssignBranchesInput {
  userRoleId: string;
  branchIds: string[];
}

export interface UserBranchAssignment {
  id: string;
  userRoleId: string;
  branchId: string;
  branchName: string;
  branchNameAr?: string;
  tenantId: string;
  createdAt: Date;
}

export class DPFUserRoleBranchService {
  /**
   * Assign branches to a user role
   * Replaces all existing assignments (transaction-safe)
   */
  static async assignBranches(
    tenantId: string,
    input: AssignBranchesInput
  ): Promise<UserBranchAssignment[]> {
    // Validate user role exists and belongs to tenant
    const userRole = await db.query.dpfUserRoles.findFirst({
      where: and(
        eq(dpfUserRoles.id, input.userRoleId),
        eq(dpfUserRoles.tenantId, tenantId)
      ),
    });

    if (!userRole) {
      throw new Error('User role not found or does not belong to this tenant');
    }

    // Validate all branches exist and belong to tenant
    if (input.branchIds.length > 0) {
      const branchRecords = await db.query.branches.findMany({
        where: and(
          inArray(branches.id, input.branchIds),
          eq(branches.tenantId, tenantId)
        ),
      });

      if (branchRecords.length !== input.branchIds.length) {
        throw new Error('One or more branches not found or do not belong to this tenant');
      }
    }

    // Transaction: Delete old + Insert new
    await db.transaction(async (tx) => {
      // Delete existing assignments
      await tx
        .delete(dpfUserRoleBranches)
        .where(
          and(
            eq(dpfUserRoleBranches.userRoleId, input.userRoleId),
            eq(dpfUserRoleBranches.tenantId, tenantId)
          )
        );

      // Insert new assignments
      if (input.branchIds.length > 0) {
        await tx.insert(dpfUserRoleBranches).values(
          input.branchIds.map((branchId) => ({
            userRoleId: input.userRoleId,
            branchId,
            tenantId,
          }))
        );
      }
    });

    // Invalidate cache
    await this.invalidateCache(tenantId, input.userRoleId);

    // Return new assignments
    return this.getUserBranches(tenantId, input.userRoleId);
  }

  /**
   * Get all branches assigned to a user role
   * Cached for 600s (L2)
   */
  static async getUserBranches(
    tenantId: string,
    userRoleId: string
  ): Promise<UserBranchAssignment[]> {
    const cacheKey = `dpf:user_branches:${tenantId}:${userRoleId}`;

    // Check cache
    const cacheService = CacheService.getInstance();
    const cached = await cacheService.get<UserBranchAssignment[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const assignments = await db
      .select({
        assignment: dpfUserRoleBranches,
        branch: branches,
      })
      .from(dpfUserRoleBranches)
      .leftJoin(branches, eq(dpfUserRoleBranches.branchId, branches.id))
      .where(
        and(
          eq(dpfUserRoleBranches.userRoleId, userRoleId),
          eq(dpfUserRoleBranches.tenantId, tenantId)
        )
      );

    const result: UserBranchAssignment[] = assignments.map((a) => ({
      id: a.assignment.id,
      userRoleId: a.assignment.userRoleId,
      branchId: a.assignment.branchId,
      branchName: a.branch?.name || 'Unknown',
      branchNameAr: undefined,
      tenantId: a.assignment.tenantId,
      createdAt: a.assignment.createdAt,
    }));

    // Cache for 600s (10 minutes)
    await cacheService.set(cacheKey, result, 600000);

    return result;
  }

  /**
   * Get all branches assigned to a user (via their user role)
   * Useful for permission checking
   */
  static async getUserBranchesByUserId(
    tenantId: string,
    userId: string
  ): Promise<string[]> {
    const cacheKey = `dpf:user_branches_by_user:${tenantId}:${userId}`;

    // Check cache
    const cacheService = CacheService.getInstance();
    const cached = await cacheService.get<string[]>(cacheKey);
    if (cached) {
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
      return [];
    }

    // Get branches for this role
    const branchAssignments = await db
      .select({
        branchId: dpfUserRoleBranches.branchId,
      })
      .from(dpfUserRoleBranches)
      .where(
        and(
          eq(dpfUserRoleBranches.userRoleId, userRole.id),
          eq(dpfUserRoleBranches.tenantId, tenantId)
        )
      );

    const branchIds = branchAssignments.map((b) => b.branchId);

    // Cache for 600s (10 minutes)
    await cacheService.set(cacheKey, branchIds, 600000);

    return branchIds;
  }

  /**
   * Remove a specific branch assignment
   */
  static async removeBranch(
    tenantId: string,
    userRoleId: string,
    branchId: string
  ): Promise<void> {
    await db
      .delete(dpfUserRoleBranches)
      .where(
        and(
          eq(dpfUserRoleBranches.userRoleId, userRoleId),
          eq(dpfUserRoleBranches.branchId, branchId),
          eq(dpfUserRoleBranches.tenantId, tenantId)
        )
      );

    // Invalidate cache
    await this.invalidateCache(tenantId, userRoleId);
  }

  /**
   * Remove all branch assignments for a user role
   */
  static async removeAllBranches(
    tenantId: string,
    userRoleId: string
  ): Promise<void> {
    await db
      .delete(dpfUserRoleBranches)
      .where(
        and(
          eq(dpfUserRoleBranches.userRoleId, userRoleId),
          eq(dpfUserRoleBranches.tenantId, tenantId)
        )
      );

    // Invalidate cache
    await this.invalidateCache(tenantId, userRoleId);
  }

  /**
   * Get all users assigned to a specific branch
   */
  static async getUsersByBranch(
    tenantId: string,
    branchId: string
  ): Promise<Array<{ userId: string; userEmail: string; userName: string }>> {
    const cacheKey = `dpf:branch_users:${tenantId}:${branchId}`;

    // Check cache
    const cacheService = CacheService.getInstance();
    const cached = await cacheService.get<Array<{ userId: string; userEmail: string; userName: string }>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const assignments = await db
      .select({
        userRole: dpfUserRoles,
        user: users,
      })
      .from(dpfUserRoleBranches)
      .leftJoin(dpfUserRoles, eq(dpfUserRoleBranches.userRoleId, dpfUserRoles.id))
      .leftJoin(users, eq(dpfUserRoles.userId, users.id))
      .where(
        and(
          eq(dpfUserRoleBranches.branchId, branchId),
          eq(dpfUserRoleBranches.tenantId, tenantId)
        )
      );

    const result = assignments
      .filter((a) => a.user !== null)
      .map((a) => ({
        userId: a.user!.id,
        userEmail: a.user!.email,
        userName: `${a.user!.firstName} ${a.user!.lastName}`,
      }));

    // Cache for 600s (10 minutes)
    await cacheService.set(cacheKey, result, 600000);

    return result;
  }

  /**
   * Check if a user has access to a specific branch
   * Fast path for permission checking
   */
  static async hasAccessToBranch(
    tenantId: string,
    userId: string,
    branchId: string
  ): Promise<boolean> {
    const userBranches = await this.getUserBranchesByUserId(tenantId, userId);
    return userBranches.includes(branchId);
  }

  /**
   * Invalidate all cache entries for a user role
   */
  private static async invalidateCache(
    tenantId: string,
    userRoleId: string
  ): Promise<void> {
    // Get user ID to invalidate user-based cache too
    const userRole = await db.query.dpfUserRoles.findFirst({
      where: and(
        eq(dpfUserRoles.id, userRoleId),
        eq(dpfUserRoles.tenantId, tenantId)
      ),
    });

    if (userRole) {
      const cacheService = CacheService.getInstance();
      await cacheService.del(`dpf:user_branches_by_user:${tenantId}:${userRole.userId}`);

      // Invalidate dpfEngine branch access cache for this user
      await dpfEngine.invalidateUserBranchCache(userRole.userId, tenantId);
    }

    const cacheService = CacheService.getInstance();
    await cacheService.del(`dpf:user_branches:${tenantId}:${userRoleId}`);
  }
}
