/**
 * DPF Permission Service - Permission management wrapper
 * Wraps existing PermissionService + adds CRUD operations
 * Enforces tenant isolation via explicit tenantId parameter
 */

import { db } from '../db';
import { dpfPermissions } from '../db/schemas/dpfPermissions';
import { dpfRolePermissions } from '../db/schemas/dpfRolePermissions';
import { eq, and, or, like, count, sql, inArray } from 'drizzle-orm';
import { cacheService } from './CacheService';
import { PermissionService, PermissionMatrixOptions } from './permissionService';
import type { ListQueryInput, AssignPermissionsInput, RemovePermissionsInput } from '../validations/dpfPermissionValidation';

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

export class DPFPermissionService {
  /**
   * List permissions with pagination, filtering, and search
   * L2 Cache: 10min TTL
   */
  static async list(tenantId: string, params: ListQueryInput): Promise<PaginatedResponse<typeof dpfPermissions.$inferSelect>> {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      moduleId,
      screenId,
      actionId,
      permissionType,
      sortBy = 'permissionName',
      sortOrder: order = 'asc',
    } = params;
    const offset = (page - 1) * limit;

    // Build cache key
    const cacheKey = `dpf:permissions:list:${tenantId}:${JSON.stringify(params)}`;

    // Check L2 cache
    const cached = await cacheService.get<PaginatedResponse<typeof dpfPermissions.$inferSelect>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build WHERE conditions
    const conditions = [eq(dpfPermissions.tenantId, tenantId)];

    if (isActive) {
      conditions.push(eq(dpfPermissions.isActive, isActive));
    }

    if (moduleId) {
      conditions.push(eq(dpfPermissions.moduleId, moduleId));
    }

    if (screenId) {
      conditions.push(eq(dpfPermissions.screenId, screenId));
    }

    if (actionId) {
      conditions.push(eq(dpfPermissions.actionId, actionId));
    }

    if (permissionType) {
      conditions.push(eq(dpfPermissions.permissionType, permissionType));
    }

    if (search) {
      conditions.push(
        or(
          like(dpfPermissions.permissionCode, `%${search}%`),
          like(dpfPermissions.permissionName, `%${search}%`)
        )!
      );
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(dpfPermissions)
      .where(and(...conditions));

    // Get paginated data
    const data = await db.query.dpfPermissions.findMany({
      where: and(...conditions),
      orderBy: (fields, { asc, desc }) => {
        const column = fields[sortBy as keyof typeof fields];
        return column ? [order === 'asc' ? asc(column) : desc(column)] : [];
      },
      limit,
      offset,
    });

    const result: PaginatedResponse<typeof dpfPermissions.$inferSelect> = {
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
   * Get permission by ID
   * L1 Cache: 60s TTL
   */
  static async getById(tenantId: string, id: string): Promise<typeof dpfPermissions.$inferSelect | null> {
    const cacheKey = `dpf:permission:${tenantId}:${id}`;
    const cached = await cacheService.get<typeof dpfPermissions.$inferSelect>(cacheKey);
    if (cached) {
      return cached;
    }

    const permission = await db.query.dpfPermissions.findFirst({
      where: and(eq(dpfPermissions.id, id), eq(dpfPermissions.tenantId, tenantId)),
    });

    if (permission) {
      await cacheService.set(cacheKey, permission, 60);
    }

    return permission || null;
  }

  /**
   * Get permissions by module
   * L2 Cache: 10min TTL
   */
  static async getByModule(tenantId: string, moduleId: string): Promise<any[]> {
    const cacheKey = `dpf:permissions:module:${tenantId}:${moduleId}`;
    const cached = await cacheService.get<typeof dpfPermissions.$inferSelect[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const permissions = await db.query.dpfPermissions.findMany({
      where: and(
        eq(dpfPermissions.tenantId, tenantId),
        eq(dpfPermissions.moduleId, moduleId),
        eq(dpfPermissions.isActive, 'true')
      ),
    });

    await cacheService.set(cacheKey, permissions, 600);
    return permissions;
  }

  /**
   * Get permission matrix (hierarchical structure)
   * Uses existing PermissionService
   * L3 Cache: 60min TTL
   * @param tenantId - Tenant ID
   * @param options - Filter options (systemOnly, tenantOnly)
   */
  static async getMatrix(tenantId: string, options: PermissionMatrixOptions = {}): Promise<any> {
    const { systemOnly, tenantOnly } = options;
    const cacheKey = `dpf:matrix:${tenantId}:${systemOnly ? 'system' : tenantOnly ? 'tenant' : 'all'}`;
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const matrix = await PermissionService.getPermissionMatrix(tenantId, options);

    // Cache for 60 minutes
    await cacheService.set(cacheKey, matrix, 3600);

    return matrix;
  }

  /**
   * Get permissions assigned to a role
   * Uses existing PermissionService
   */
  static async getRolePermissions(tenantId: string, roleId: string): Promise<string[]> {
    return await PermissionService.getRolePermissions(tenantId, roleId);
  }

  /**
   * Assign permissions to a role (replaces existing)
   * Uses existing PermissionService + invalidates cache
   */
  static async assignPermissionsToRole(
    tenantId: string,
    input: AssignPermissionsInput
  ): Promise<{ success: boolean }> {
    const result = await PermissionService.assignPermissionsToRole(tenantId, input);

    // Invalidate cache
    await this.invalidateCache(tenantId);

    return result;
  }

  /**
   * Remove specific permissions from a role
   */
  static async removePermissionsFromRole(
    tenantId: string,
    roleId: string,
    permissionIds: string[]
  ): Promise<{ success: boolean }> {
    // Validate permissions belong to tenant
    if (permissionIds.length > 0) {
      const validPermissions = await db.query.dpfPermissions.findMany({
        where: and(eq(dpfPermissions.tenantId, tenantId), inArray(dpfPermissions.id, permissionIds)),
      });

      if (validPermissions.length !== permissionIds.length) {
        throw new Error('Invalid permission IDs: some permissions do not belong to this tenant');
      }
    }

    // Remove role-permission assignments
    await db
      .delete(dpfRolePermissions)
      .where(
        and(
          eq(dpfRolePermissions.tenantId, tenantId),
          eq(dpfRolePermissions.roleId, roleId),
          inArray(dpfRolePermissions.permissionId, permissionIds)
        )
      );

    // Invalidate cache
    await this.invalidateCache(tenantId);

    return { success: true };
  }

  /**
   * Get all permissions (flat list)
   * Uses existing PermissionService
   */
  static async getAll(tenantId: string): Promise<any[]> {
    const cacheKey = `dpf:permissions:all:${tenantId}`;
    const cached = await cacheService.get<typeof dpfPermissions.$inferSelect[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const permissions = await PermissionService.getAllPermissions(tenantId);

    // Cache for 10 minutes
    await cacheService.set(cacheKey, permissions, 600);

    return permissions;
  }

  /**
   * Get all permissions from SYSTEM tenant for SYSTEM users
   * Used when no tenantId is specified
   */
  static async getAllForSystem(): Promise<any[]> {
    const cacheKey = `dpf:permissions:all:system`;
    const cached = await cacheService.get<typeof dpfPermissions.$inferSelect[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get SYSTEM tenant ID from environment or use a constant
    const { db: dbConn } = await import('../db');
    const { tenants } = await import('../db/schemas');

    const systemTenant = await dbConn.query.tenants.findFirst({
      where: eq(tenants.code, 'SYSTEM'),
    });

    if (!systemTenant) {
      return [];
    }

    const permissions = await PermissionService.getAllPermissions(systemTenant.id);

    // Cache for 10 minutes
    await cacheService.set(cacheKey, permissions, 600);

    return permissions;
  }

  /**
   * Get permission matrix for SYSTEM users (system-level permissions)
   * Used when no tenantId is specified for SYSTEM scope users
   */
  static async getMatrixForSystem(options: PermissionMatrixOptions = {}): Promise<any> {
    const { systemOnly, tenantOnly } = options;
    const cacheKey = `dpf:matrix:system:${systemOnly ? 'system' : tenantOnly ? 'tenant' : 'all'}`;
    const cached = await cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get SYSTEM tenant ID
    const { db: dbConn } = await import('../db');
    const { tenants } = await import('../db/schemas');

    const systemTenant = await dbConn.query.tenants.findFirst({
      where: eq(tenants.code, 'SYSTEM'),
    });

    if (!systemTenant) {
      // Return empty matrix structure if no SYSTEM tenant found
      return { modules: [] };
    }

    const matrix = await PermissionService.getPermissionMatrix(systemTenant.id, { ...options, systemOnly: true });

    // Cache for 60 minutes
    await cacheService.set(cacheKey, matrix, 3600);

    return matrix;
  }

  /**
   * Invalidate permission caches
   */
  private static async invalidateCache(tenantId: string): Promise<void> {
    // Invalidate list cache
    await cacheService.invalidatePattern(`dpf:permissions:list:${tenantId}:*`);

    // Invalidate all permissions cache
    await cacheService.del(`dpf:permissions:all:${tenantId}`);

    // Invalidate permission matrix cache
    await cacheService.del(`dpf:matrix:${tenantId}`);

    // Invalidate module permissions cache
    await cacheService.invalidatePattern(`dpf:permissions:module:${tenantId}:*`);

    // Invalidate role permissions cache
    await cacheService.invalidatePattern(`permissions:role:*`);

    // Invalidate DPF engine permission checks
    await cacheService.invalidatePattern(`dpf:perm:${tenantId}:*`);
  }
}
