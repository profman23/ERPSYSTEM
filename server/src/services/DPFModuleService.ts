/**
 * DPF Module Service - Module management for Dynamic Permission Framework
 * Enforces tenant isolation via explicit tenantId parameter
 */

import { db } from '../db';
import { dpfModules } from '../db/schemas/dpfModules';
import { dpfScreens } from '../db/schemas/dpfScreens';
import { dpfActions } from '../db/schemas/dpfActions';
import { eq, and, or, like, count, sql, asc, desc } from 'drizzle-orm';
import { cacheService } from './CacheService';
import type { CreateModuleInput, UpdateModuleInput, ListQueryInput } from '../validations/dpfModuleValidation';

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

export interface ModuleWithStats {
  id: string;
  tenantId: string;
  moduleCode: string;
  moduleName: string;
  moduleNameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  category: string | null;
  icon: string | null;
  route: string | null;
  sortOrder: string | null;
  isActive: string;
  isSystemModule: string;
  requiredAgiLevel: string | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  screensCount: number;
  actionsCount: number;
}

export class DPFModuleService {
  /**
   * List modules with pagination, filtering, and search
   * L2 Cache: 10min TTL for module lists
   */
  static async list(tenantId: string, params: ListQueryInput): Promise<PaginatedResponse<typeof dpfModules.$inferSelect>> {
    const { page = 1, limit = 20, search, isActive, category, sortBy = 'sortOrder', sortOrder: order = 'asc' } = params;
    const offset = (page - 1) * limit;

    // Build cache key
    const cacheKey = `dpf:modules:list:${tenantId}:${JSON.stringify(params)}`;

    // Check L2 cache
    const cached = await cacheService.get<PaginatedResponse<typeof dpfModules.$inferSelect>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build WHERE conditions
    const conditions = [eq(dpfModules.tenantId, tenantId)];

    if (isActive) {
      conditions.push(eq(dpfModules.isActive, isActive));
    }

    if (category) {
      conditions.push(eq(dpfModules.category, category));
    }

    if (search) {
      conditions.push(
        or(
          like(dpfModules.moduleCode, `%${search}%`),
          like(dpfModules.moduleName, `%${search}%`)
        )!
      );
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(dpfModules)
      .where(and(...conditions));

    // Get paginated data using select builder (more reliable than relational queries)
    const orderByColumn = (dpfModules as any)[sortBy] || dpfModules.sortOrder;
    const data = await db
      .select()
      .from(dpfModules)
      .where(and(...conditions))
      .orderBy(order === 'asc' ? sql`${orderByColumn} ASC` : sql`${orderByColumn} DESC`)
      .limit(limit)
      .offset(offset);

    const result: PaginatedResponse<typeof dpfModules.$inferSelect> = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache for 10 minutes
    await cacheService.set(cacheKey, result, 600); // 10min TTL (seconds)

    return result;
  }

  /**
   * Get module by ID
   * L1 Cache: 60s TTL for individual modules
   */
  static async getById(tenantId: string, id: string): Promise<typeof dpfModules.$inferSelect | null> {
    // Check L1 cache
    const cacheKey = `dpf:module:${tenantId}:${id}`;
    const cached = await cacheService.get<typeof dpfModules.$inferSelect>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await db
      .select()
      .from(dpfModules)
      .where(and(eq(dpfModules.id, id), eq(dpfModules.tenantId, tenantId)))
      .limit(1);

    const module = result[0] || null;

    if (module) {
      // Cache for 60 seconds
      await cacheService.set(cacheKey, module, 60); // 60s TTL (seconds)
    }

    return module;
  }

  /**
   * Get module with statistics (screens count, actions count)
   */
  static async getWithStats(tenantId: string, id: string): Promise<ModuleWithStats | null> {
    const module = await this.getById(tenantId, id);
    if (!module) {
      return null;
    }

    // Get screens count
    const [{ screensCount }] = await db
      .select({ screensCount: count() })
      .from(dpfScreens)
      .where(and(eq(dpfScreens.moduleId, id), eq(dpfScreens.tenantId, tenantId)));

    // Get actions count
    const [{ actionsCount }] = await db
      .select({ actionsCount: count() })
      .from(dpfActions)
      .where(and(eq(dpfActions.moduleId, id), eq(dpfActions.tenantId, tenantId)));

    return {
      ...module,
      screensCount,
      actionsCount,
    };
  }

  /**
   * Create new module
   * SECURITY: Validates unique moduleCode per tenant
   */
  static async create(tenantId: string, input: CreateModuleInput): Promise<typeof dpfModules.$inferSelect> {
    // Check if moduleCode already exists for this tenant
    const existingResult = await db
      .select()
      .from(dpfModules)
      .where(and(eq(dpfModules.tenantId, tenantId), eq(dpfModules.moduleCode, input.moduleCode)))
      .limit(1);
    const existing = existingResult[0];

    if (existing) {
      throw new Error(`Module with code '${input.moduleCode}' already exists for this tenant`);
    }

    // Create module
    const [newModule] = await db
      .insert(dpfModules)
      .values({
        tenantId,
        ...input,
        isSystemModule: 'false', // User-created modules are not system modules
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Invalidate cache
    await this.invalidateCache(tenantId);

    return newModule;
  }

  /**
   * Update module
   * SECURITY: Prevents modification of system modules
   */
  static async update(tenantId: string, id: string, input: UpdateModuleInput): Promise<typeof dpfModules.$inferSelect> {
    // Verify module exists and belongs to tenant
    const module = await this.getById(tenantId, id);
    if (!module) {
      throw new Error('Module not found');
    }

    // Prevent modification of system modules
    if (module.isSystemModule === 'true') {
      throw new Error('Cannot modify system modules');
    }

    // Update module
    const [updatedModule] = await db
      .update(dpfModules)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(dpfModules.id, id), eq(dpfModules.tenantId, tenantId)))
      .returning();

    // Invalidate cache
    await this.invalidateCache(tenantId, id);

    return updatedModule;
  }

  /**
   * Soft delete module (deactivate)
   * SECURITY: Prevents deletion of system modules and modules with dependencies
   */
  static async delete(tenantId: string, id: string): Promise<{ success: boolean }> {
    // Verify module exists and belongs to tenant
    const module = await this.getById(tenantId, id);
    if (!module) {
      throw new Error('Module not found');
    }

    // Prevent deletion of system modules
    if (module.isSystemModule === 'true') {
      throw new Error('Cannot delete system modules');
    }

    // Check for dependencies (screens)
    const [{ screensCount }] = await db
      .select({ screensCount: count() })
      .from(dpfScreens)
      .where(and(eq(dpfScreens.moduleId, id), eq(dpfScreens.tenantId, tenantId)));

    if (screensCount > 0) {
      throw new Error(`Cannot delete module with ${screensCount} screen(s). Please delete screens first.`);
    }

    // Soft delete (deactivate)
    await db
      .update(dpfModules)
      .set({
        isActive: 'false',
        updatedAt: new Date(),
      })
      .where(and(eq(dpfModules.id, id), eq(dpfModules.tenantId, tenantId)));

    // Invalidate cache
    await this.invalidateCache(tenantId, id);

    return { success: true };
  }

  /**
   * Get full module tree with screens — single JOIN, cached
   * Used by ScreenAuthorizationGrid to display all modules/screens dynamically.
   * Single Source of Truth: dpfStructure.ts → DB → this API → frontend hook
   *
   * @param systemOnly - true: return SYSTEM modules only, false: return TENANT modules only
   */
  static async getModuleTree(tenantId: string, systemOnly: boolean = false): Promise<{
    moduleCode: string;
    moduleName: string;
    moduleNameAr: string | null;
    screens: { screenCode: string; screenName: string; screenNameAr: string | null }[];
  }[]> {
    const scope = systemOnly ? 'system' : 'tenant';
    const cacheKey = `tenant:${tenantId}:dpf:module-tree:${scope}`;
    type ModuleTreeItem = Awaited<ReturnType<typeof DPFModuleService.getModuleTree>>[number];
    const cached = await cacheService.get<ModuleTreeItem[]>(cacheKey);
    if (cached) return cached;

    // Single JOIN query — no N+1 (per CLAUDE.md)
    // isSystemModule filter ensures tenant/system isolation
    const rows = await db
      .select({
        moduleCode: dpfModules.moduleCode,
        moduleName: dpfModules.moduleName,
        moduleNameAr: dpfModules.moduleNameAr,
        sortOrder: dpfModules.sortOrder,
        screenCode: dpfScreens.screenCode,
        screenName: dpfScreens.screenName,
        screenNameAr: dpfScreens.screenNameAr,
      })
      .from(dpfModules)
      .leftJoin(dpfScreens, and(
        eq(dpfScreens.moduleId, dpfModules.id),
        eq(dpfScreens.tenantId, tenantId),
        eq(dpfScreens.isActive, 'true'),
      ))
      .where(and(
        eq(dpfModules.tenantId, tenantId),
        eq(dpfModules.isActive, 'true'),
        eq(dpfModules.isSystemModule, systemOnly ? 'true' : 'false'),
      ))
      .orderBy(asc(dpfModules.sortOrder), asc(dpfScreens.sortOrder));

    // Transform flat rows → tree: { moduleCode, screens[] }
    const moduleMap = new Map<string, ModuleTreeItem>();
    for (const row of rows) {
      if (!moduleMap.has(row.moduleCode)) {
        moduleMap.set(row.moduleCode, {
          moduleCode: row.moduleCode,
          moduleName: row.moduleName,
          moduleNameAr: row.moduleNameAr,
          screens: [],
        });
      }
      if (row.screenCode) {
        moduleMap.get(row.moduleCode)!.screens.push({
          screenCode: row.screenCode,
          screenName: row.screenName!,
          screenNameAr: row.screenNameAr,
        });
      }
    }

    // Filter out modules with no screens
    const tree = Array.from(moduleMap.values()).filter(m => m.screens.length > 0);

    await cacheService.set(cacheKey, tree, 600); // 10min TTL (per CLAUDE.md)
    return tree;
  }

  /**
   * Invalidate module caches
   */
  private static async invalidateCache(tenantId: string, moduleId?: string): Promise<void> {
    // Invalidate list cache
    const listPattern = `dpf:modules:list:${tenantId}:*`;
    await cacheService.invalidatePattern(listPattern);

    // Invalidate specific module cache
    if (moduleId) {
      const moduleKey = `dpf:module:${tenantId}:${moduleId}`;
      await cacheService.del(moduleKey);
    }

    // Invalidate module tree cache (both scopes)
    await cacheService.del(`tenant:${tenantId}:dpf:module-tree:tenant`);
    await cacheService.del(`tenant:${tenantId}:dpf:module-tree:system`);

    // Invalidate permission matrix cache (depends on modules)
    const matrixPattern = `dpf:matrix:${tenantId}`;
    await cacheService.del(matrixPattern);
  }
}
