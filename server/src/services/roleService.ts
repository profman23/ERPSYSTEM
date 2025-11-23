/**
 * Role Service - CRUD operations for DPF Roles
 * Enforces tenant isolation via AsyncLocalStorage context
 */

import { db } from '../db';
import { dpfRoles } from '../db/schemas/dpfRoles';
import { dpfRolePermissions } from '../db/schemas/dpfRolePermissions';
import { dpfUserRoles } from '../db/schemas/dpfUserRoles';
import { eq, and, sql, ilike, or } from 'drizzle-orm';
import { tenantContext } from '../middleware/tenantLoader';
import type { CreateRoleInput, UpdateRoleInput, RoleListItem, PaginatedResponse } from '../../../types/dpf';

function getTenantContext() {
  const context = tenantContext.getStore();
  if (!context || !context.tenantId) {
    throw new Error('Tenant context not found');
  }
  return context;
}

export class RoleService {
  /**
   * List all roles for current tenant with pagination and search
   */
  static async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<PaginatedResponse<RoleListItem>> {
    const { tenantId } = getTenantContext();
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    const filters: any[] = [eq(dpfRoles.tenantId, tenantId)];

    if (params.search) {
      filters.push(
        or(
          ilike(dpfRoles.roleName, `%${params.search}%`),
          ilike(dpfRoles.roleCode, `%${params.search}%`),
          ilike(dpfRoles.description, `%${params.search}%`)
        )!
      );
    }

    if (params.isActive !== undefined) {
      filters.push(eq(dpfRoles.isActive, params.isActive ? 'true' : 'false'));
    }

    const [roles, totalResult] = await Promise.all([
      db
        .select({
          id: dpfRoles.id,
          tenantId: dpfRoles.tenantId,
          roleCode: dpfRoles.roleCode,
          roleName: dpfRoles.roleName,
          roleNameAr: dpfRoles.roleNameAr,
          description: dpfRoles.description,
          descriptionAr: dpfRoles.descriptionAr,
          isProtected: dpfRoles.isProtected,
          isDefault: dpfRoles.isDefault,
          isActive: dpfRoles.isActive,
          createdAt: dpfRoles.createdAt,
          updatedAt: dpfRoles.updatedAt,
          usersCount: sql<number>`CAST(COUNT(DISTINCT ${dpfUserRoles.id}) AS INTEGER)`,
          permissionsCount: sql<number>`CAST(COUNT(DISTINCT ${dpfRolePermissions.id}) AS INTEGER)`,
        })
        .from(dpfRoles)
        .leftJoin(dpfUserRoles, eq(dpfRoles.id, dpfUserRoles.roleId))
        .leftJoin(dpfRolePermissions, eq(dpfRoles.id, dpfRolePermissions.roleId))
        .where(and(...filters))
        .groupBy(dpfRoles.id)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
        .from(dpfRoles)
        .where(and(...filters)),
    ]);

    const total = totalResult[0]?.count || 0;

    return {
      data: roles as RoleListItem[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single role by ID
   */
  static async getById(roleId: string): Promise<RoleListItem | null> {
    const { tenantId } = getTenantContext();

    const results = await db
      .select({
        id: dpfRoles.id,
        tenantId: dpfRoles.tenantId,
        roleCode: dpfRoles.roleCode,
        roleName: dpfRoles.roleName,
        roleNameAr: dpfRoles.roleNameAr,
        description: dpfRoles.description,
        descriptionAr: dpfRoles.descriptionAr,
        isProtected: dpfRoles.isProtected,
        isDefault: dpfRoles.isDefault,
        isActive: dpfRoles.isActive,
        createdAt: dpfRoles.createdAt,
        updatedAt: dpfRoles.updatedAt,
        usersCount: sql<number>`CAST(COUNT(DISTINCT ${dpfUserRoles.id}) AS INTEGER)`,
        permissionsCount: sql<number>`CAST(COUNT(DISTINCT ${dpfRolePermissions.id}) AS INTEGER)`,
      })
      .from(dpfRoles)
      .leftJoin(dpfUserRoles, eq(dpfRoles.id, dpfUserRoles.roleId))
      .leftJoin(dpfRolePermissions, eq(dpfRoles.id, dpfRolePermissions.roleId))
      .where(and(eq(dpfRoles.tenantId, tenantId), eq(dpfRoles.id, roleId)))
      .groupBy(dpfRoles.id);

    return results[0] || null;
  }

  /**
   * Create new role
   */
  static async create(input: CreateRoleInput) {
    const { tenantId } = getTenantContext();

    if (input.isDefault) {
      await db
        .update(dpfRoles)
        .set({ isDefault: 'false', updatedAt: new Date() })
        .where(and(eq(dpfRoles.tenantId, tenantId), eq(dpfRoles.isDefault, 'true')));
    }

    const [role] = await db
      .insert(dpfRoles)
      .values({
        tenantId,
        roleCode: input.roleCode,
        roleName: input.roleName,
        roleNameAr: input.roleNameAr,
        description: input.description,
        descriptionAr: input.descriptionAr,
        isProtected: 'false',
        isDefault: input.isDefault ? 'true' : 'false',
        isActive: 'true',
      })
      .returning();

    return role;
  }

  /**
   * Update existing role
   */
  static async update(roleId: string, input: UpdateRoleInput) {
    const { tenantId } = getTenantContext();

    const existingRole = await db.query.dpfRoles.findFirst({
      where: and(eq(dpfRoles.tenantId, tenantId), eq(dpfRoles.id, roleId)),
    });

    if (!existingRole) {
      throw new Error('Role not found');
    }

    if (existingRole.isProtected === 'true') {
      throw new Error('Cannot modify protected role');
    }

    if (input.isDefault) {
      await db
        .update(dpfRoles)
        .set({ isDefault: 'false', updatedAt: new Date() })
        .where(and(eq(dpfRoles.tenantId, tenantId), eq(dpfRoles.isDefault, 'true')));
    }

    const [updatedRole] = await db
      .update(dpfRoles)
      .set({
        roleName: input.roleName,
        roleNameAr: input.roleNameAr,
        description: input.description,
        descriptionAr: input.descriptionAr,
        isDefault: input.isDefault !== undefined ? (input.isDefault ? 'true' : 'false') : undefined,
        isActive: input.isActive !== undefined ? (input.isActive ? 'true' : 'false') : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(dpfRoles.tenantId, tenantId), eq(dpfRoles.id, roleId)))
      .returning();

    return updatedRole;
  }

  /**
   * Delete role (only if no users assigned)
   */
  static async delete(roleId: string): Promise<{ success: boolean; message: string }> {
    const { tenantId } = getTenantContext();

    const role = await this.getById(roleId);

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isProtected === 'true') {
      throw new Error('Cannot delete protected role');
    }

    if (role.usersCount > 0) {
      throw new Error(`Cannot delete role with ${role.usersCount} assigned users`);
    }

    await db.delete(dpfRolePermissions).where(
      and(eq(dpfRolePermissions.tenantId, tenantId), eq(dpfRolePermissions.roleId, roleId))
    );

    await db.delete(dpfRoles).where(and(eq(dpfRoles.tenantId, tenantId), eq(dpfRoles.id, roleId)));

    return {
      success: true,
      message: 'Role deleted successfully',
    };
  }
}
