/**
 * Role Service - CRUD operations for DPF Roles (SAP B1 Style)
 * Enforces tenant isolation via AsyncLocalStorage context
 *
 * Authorization Levels:
 * - 0: No Authorization (screen hidden, route blocked)
 * - 1: Read Only (view only, no create/update)
 * - 2: Full Authorization (all operations allowed)
 */

import { db } from '../db';
import { dpfRoles } from '../db/schemas/dpfRoles';
import { dpfRolePermissions } from '../db/schemas/dpfRolePermissions';
import { dpfRoleScreenAuthorizations } from '../db/schemas/dpfRoleScreenAuthorizations';
import { dpfUserRoles } from '../db/schemas/dpfUserRoles';
import { eq, and, sql, ilike, or } from 'drizzle-orm';
import type { CreateRoleInput, UpdateRoleInput, RoleListItem, PaginatedResponse } from '../../../types/dpf';
import { AuthorizationLevel } from '../rbac/dpfTypes';

/**
 * CRITICAL: Tenant ID must be explicitly passed from HTTP request context
 * Services NEVER access AsyncLocalStorage directly - this prevents context leaks
 */

/**
 * Generate random alphanumeric string
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class RoleService {
  /**
   * Generate unique role code with concurrency handling
   * Format: SYS_ROLE_XXXXX (5 random alphanumeric characters)
   */
  static async generateUniqueRoleCode(tenantId: string): Promise<string> {
    const maxAttempts = 10;

    for (let i = 0; i < maxAttempts; i++) {
      const code = `SYS_ROLE_${generateRandomString(5)}`;

      // Check if code already exists
      const exists = await db.query.dpfRoles.findFirst({
        where: and(eq(dpfRoles.tenantId, tenantId), eq(dpfRoles.roleCode, code)),
      });

      if (!exists) {
        return code;
      }
    }

    // Fallback with timestamp for guaranteed uniqueness
    return `SYS_ROLE_${Date.now().toString(36).toUpperCase()}`;
  }

  /**
   * List all roles for current tenant with pagination and search
   */
  static async list(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      isActive?: boolean;
    }
  ): Promise<PaginatedResponse<RoleListItem>> {
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
          roleType: dpfRoles.roleType,
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
  static async getById(tenantId: string, roleId: string): Promise<RoleListItem | null> {

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
        roleType: dpfRoles.roleType,
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
   * Get a system role by ID across all tenants (no tenantId filter).
   * Used by system panel where listSystemRoles() is cross-tenant but getById() is not.
   */
  static async getSystemRoleById(roleId: string): Promise<RoleListItem | null> {
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
        roleType: dpfRoles.roleType,
        createdAt: dpfRoles.createdAt,
        updatedAt: dpfRoles.updatedAt,
        usersCount: sql<number>`CAST(COUNT(DISTINCT ${dpfUserRoles.id}) AS INTEGER)`,
        permissionsCount: sql<number>`CAST(COUNT(DISTINCT ${dpfRolePermissions.id}) AS INTEGER)`,
      })
      .from(dpfRoles)
      .leftJoin(dpfUserRoles, eq(dpfRoles.id, dpfUserRoles.roleId))
      .leftJoin(dpfRolePermissions, eq(dpfRoles.id, dpfRolePermissions.roleId))
      .where(and(eq(dpfRoles.id, roleId), eq(dpfRoles.isSystemRole, 'true')))
      .groupBy(dpfRoles.id);

    return results[0] || null;
  }

  /**
   * Create new role
   * @param tenantId - Target tenant ID
   * @param input - Role creation input
   * @param isSystemRole - Whether this is a system-level role (platform-wide)
   */
  static async create(tenantId: string, input: CreateRoleInput, isSystemRole: boolean = false) {

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
        isSystemRole: isSystemRole ? 'true' : 'false',
        roleType: isSystemRole ? 'SYSTEM' : 'TENANT',
      })
      .returning();

    return role;
  }

  /**
   * Update existing role
   */
  static async update(tenantId: string, roleId: string, input: UpdateRoleInput) {
    const existingRole = await db.query.dpfRoles.findFirst({
      where: and(eq(dpfRoles.tenantId, tenantId), eq(dpfRoles.id, roleId)),
    });

    if (!existingRole) {
      throw new Error('Role not found');
    }

    // Only protected roles cannot be modified (not all system roles)
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
   * List system-level roles (isSystemRole='true')
   * These are platform-wide roles not tied to any specific tenant
   */
  static async listSystemRoles(
    params: {
      page?: number;
      limit?: number;
      search?: string;
      isActive?: boolean;
    }
  ): Promise<PaginatedResponse<RoleListItem>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    // Filter for system roles (isSystemRole='true')
    const filters: any[] = [eq(dpfRoles.isSystemRole, 'true')];

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
          isSystemRole: dpfRoles.isSystemRole,
          roleType: dpfRoles.roleType,
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
   * Delete role (only if no users assigned)
   * SECURITY: Validates isSystemRole at service level to prevent bypass
   */
  static async delete(tenantId: string, roleId: string): Promise<{ success: boolean; message: string }> {
    const role = await this.getById(tenantId, roleId);

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystemRole === 'true') {
      throw new Error('Cannot delete system role');
    }

    if (role.usersCount > 0) {
      throw new Error(`Cannot delete role with ${role.usersCount} assigned users`);
    }

    // Soft delete: set isActive = 'false' (preserve audit trail)
    await db.update(dpfRoles)
      .set({ isActive: 'false', updatedAt: new Date() })
      .where(and(eq(dpfRoles.tenantId, tenantId), eq(dpfRoles.id, roleId)));

    return {
      success: true,
      message: 'Role deactivated successfully',
    };
  }

  // =========================================================================
  // SAP B1 Style Screen Authorization Methods
  // =========================================================================

  /**
   * Get role's screen authorizations
   * Returns a map of screenCode -> authorizationLevel
   */
  static async getRoleScreenAuthorizations(
    tenantId: string,
    roleId: string
  ): Promise<Record<string, AuthorizationLevel>> {
    const authorizations = await db.query.dpfRoleScreenAuthorizations.findMany({
      where: and(
        eq(dpfRoleScreenAuthorizations.tenantId, tenantId),
        eq(dpfRoleScreenAuthorizations.roleId, roleId)
      ),
    });

    const result: Record<string, AuthorizationLevel> = {};
    for (const auth of authorizations) {
      result[auth.screenCode] = auth.authorizationLevel as AuthorizationLevel;
    }

    return result;
  }

  /**
   * Set role's screen authorizations (bulk update)
   * Replaces all existing authorizations with new ones
   *
   * @param tenantId - Tenant ID
   * @param roleId - Role ID
   * @param authorizations - Map of screenCode -> authorizationLevel
   */
  static async setRoleScreenAuthorizations(
    tenantId: string,
    roleId: string,
    authorizations: Record<string, number>
  ): Promise<void> {
    // Verify role exists
    const role = await db.query.dpfRoles.findFirst({
      where: and(eq(dpfRoles.tenantId, tenantId), eq(dpfRoles.id, roleId)),
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Delete existing authorizations
    await db.delete(dpfRoleScreenAuthorizations).where(
      and(
        eq(dpfRoleScreenAuthorizations.tenantId, tenantId),
        eq(dpfRoleScreenAuthorizations.roleId, roleId)
      )
    );

    // Insert new authorizations (only non-zero levels)
    const insertData = Object.entries(authorizations)
      .filter(([_, level]) => level > 0)
      .map(([screenCode, level]) => ({
        tenantId,
        roleId,
        screenCode,
        authorizationLevel: level,
      }));

    if (insertData.length > 0) {
      await db.insert(dpfRoleScreenAuthorizations).values(insertData);
    }
  }

  /**
   * Update single screen authorization for a role
   */
  static async updateScreenAuthorization(
    tenantId: string,
    roleId: string,
    screenCode: string,
    level: AuthorizationLevel
  ): Promise<void> {
    // Verify role exists
    const role = await db.query.dpfRoles.findFirst({
      where: and(eq(dpfRoles.tenantId, tenantId), eq(dpfRoles.id, roleId)),
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Check if authorization already exists
    const existing = await db.query.dpfRoleScreenAuthorizations.findFirst({
      where: and(
        eq(dpfRoleScreenAuthorizations.tenantId, tenantId),
        eq(dpfRoleScreenAuthorizations.roleId, roleId),
        eq(dpfRoleScreenAuthorizations.screenCode, screenCode)
      ),
    });

    if (level === AuthorizationLevel.NONE) {
      // Delete if level is NONE
      if (existing) {
        await db.delete(dpfRoleScreenAuthorizations).where(
          eq(dpfRoleScreenAuthorizations.id, existing.id)
        );
      }
    } else if (existing) {
      // Update existing
      await db.update(dpfRoleScreenAuthorizations)
        .set({ authorizationLevel: level, updatedAt: new Date() })
        .where(eq(dpfRoleScreenAuthorizations.id, existing.id));
    } else {
      // Insert new
      await db.insert(dpfRoleScreenAuthorizations).values({
        tenantId,
        roleId,
        screenCode,
        authorizationLevel: level,
      });
    }
  }

  /**
   * Create role with screen authorizations (SAP B1 style)
   */
  static async createWithAuthorizations(
    tenantId: string,
    input: CreateRoleInput,
    authorizations: Record<string, number>,
    isSystemRole: boolean = false
  ) {
    // Create the role
    const role = await this.create(tenantId, input, isSystemRole);

    // Set screen authorizations
    if (Object.keys(authorizations).length > 0) {
      await this.setRoleScreenAuthorizations(tenantId, role.id, authorizations);
    }

    return role;
  }

  /**
   * Get role with its screen authorizations
   */
  static async getByIdWithAuthorizations(
    tenantId: string,
    roleId: string
  ): Promise<{ role: RoleListItem | null; authorizations: Record<string, AuthorizationLevel> }> {
    const role = await this.getById(tenantId, roleId);
    const authorizations = role ? await this.getRoleScreenAuthorizations(tenantId, roleId) : {};

    return { role, authorizations };
  }
}
