/**
 * DPF Action Service - Action management for Dynamic Permission Framework
 * Enforces tenant isolation via explicit tenantId parameter
 */

import { db } from '../db';
import { dpfActions } from '../db/schemas/dpfActions';
import { dpfModules } from '../db/schemas/dpfModules';
import { dpfScreens } from '../db/schemas/dpfScreens';
import { dpfPermissions } from '../db/schemas/dpfPermissions';
import { eq, and, or, like, count, sql } from 'drizzle-orm';
import { cacheService } from './CacheService';
import type { CreateActionInput, UpdateActionInput, ListQueryInput } from '../validations/dpfActionValidation';

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

export class DPFActionService {
  /**
   * List actions with pagination, filtering, and search
   * L2 Cache: 10min TTL for action lists
   */
  static async list(tenantId: string, params: ListQueryInput): Promise<PaginatedResponse<typeof dpfActions.$inferSelect>> {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      moduleId,
      screenId,
      actionType,
      actionCategory,
      httpMethod,
      sortBy = 'actionName',
      sortOrder: order = 'asc',
    } = params;
    const offset = (page - 1) * limit;

    // Build cache key
    const cacheKey = `dpf:actions:list:${tenantId}:${JSON.stringify(params)}`;

    // Check L2 cache
    const cached = await cacheService.get<PaginatedResponse<typeof dpfActions.$inferSelect>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build WHERE conditions
    const conditions = [eq(dpfActions.tenantId, tenantId)];

    if (isActive) {
      conditions.push(eq(dpfActions.isActive, isActive));
    }

    if (moduleId) {
      conditions.push(eq(dpfActions.moduleId, moduleId));
    }

    if (screenId) {
      conditions.push(eq(dpfActions.screenId, screenId));
    }

    if (actionType) {
      conditions.push(eq(dpfActions.actionType, actionType));
    }

    if (actionCategory) {
      conditions.push(eq(dpfActions.actionCategory, actionCategory));
    }

    if (httpMethod) {
      conditions.push(eq(dpfActions.httpMethod, httpMethod));
    }

    if (search) {
      conditions.push(
        or(
          like(dpfActions.actionCode, `%${search}%`),
          like(dpfActions.actionName, `%${search}%`),
          like(dpfActions.apiEndpoint, `%${search}%`)
        )!
      );
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(dpfActions)
      .where(and(...conditions));

    // Get paginated data
    const orderByColumn = dpfActions[sortBy as keyof typeof dpfActions];
    const data = await db.query.dpfActions.findMany({
      where: and(...conditions),
      orderBy: order === 'asc' ? [sql`${orderByColumn} ASC`] : [sql`${orderByColumn} DESC`],
      limit,
      offset,
    });

    const result: PaginatedResponse<typeof dpfActions.$inferSelect> = {
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
   * Get action by ID
   * L1 Cache: 60s TTL for individual actions
   */
  static async getById(tenantId: string, id: string): Promise<typeof dpfActions.$inferSelect | null> {
    // Check L1 cache
    const cacheKey = `dpf:action:${tenantId}:${id}`;
    const cached = await cacheService.get<typeof dpfActions.$inferSelect>(cacheKey);
    if (cached) {
      return cached;
    }

    const action = await db.query.dpfActions.findFirst({
      where: and(eq(dpfActions.id, id), eq(dpfActions.tenantId, tenantId)),
    });

    if (action) {
      // Cache for 60 seconds
      await cacheService.set(cacheKey, action, 60);
    }

    return action || null;
  }

  /**
   * Get actions by module ID
   * L2 Cache: 10min TTL
   */
  static async getByModule(tenantId: string, moduleId: string): Promise<typeof dpfActions.$inferSelect[]> {
    const cacheKey = `dpf:actions:module:${tenantId}:${moduleId}`;
    const cached = await cacheService.get<typeof dpfActions.$inferSelect[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const actions = await db.query.dpfActions.findMany({
      where: and(
        eq(dpfActions.tenantId, tenantId),
        eq(dpfActions.moduleId, moduleId),
        eq(dpfActions.isActive, 'true')
      ),
    });

    await cacheService.set(cacheKey, actions, 600);
    return actions;
  }

  /**
   * Get actions by screen ID
   * L2 Cache: 10min TTL
   */
  static async getByScreen(tenantId: string, screenId: string): Promise<typeof dpfActions.$inferSelect[]> {
    const cacheKey = `dpf:actions:screen:${tenantId}:${screenId}`;
    const cached = await cacheService.get<typeof dpfActions.$inferSelect[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const actions = await db.query.dpfActions.findMany({
      where: and(
        eq(dpfActions.tenantId, tenantId),
        eq(dpfActions.screenId, screenId),
        eq(dpfActions.isActive, 'true')
      ),
    });

    await cacheService.set(cacheKey, actions, 600);
    return actions;
  }

  /**
   * Get action by API endpoint (HOT PATH - permission checks)
   * L1 Cache: 60s TTL
   */
  static async getByEndpoint(tenantId: string, endpoint: string): Promise<typeof dpfActions.$inferSelect | null> {
    const cacheKey = `dpf:action:endpoint:${tenantId}:${endpoint}`;
    const cached = await cacheService.get<typeof dpfActions.$inferSelect>(cacheKey);
    if (cached) {
      return cached;
    }

    const action = await db.query.dpfActions.findFirst({
      where: and(
        eq(dpfActions.tenantId, tenantId),
        eq(dpfActions.apiEndpoint, endpoint),
        eq(dpfActions.isActive, 'true')
      ),
    });

    if (action) {
      await cacheService.set(cacheKey, action, 60);
    }

    return action || null;
  }

  /**
   * Create new action
   * SECURITY: Validates unique actionCode per tenant, module/screen exist
   * NOTE: Auto-creates corresponding permission
   */
  static async create(tenantId: string, input: CreateActionInput): Promise<typeof dpfActions.$inferSelect> {
    // Validate module exists and belongs to tenant
    const module = await db.query.dpfModules.findFirst({
      where: and(eq(dpfModules.id, input.moduleId), eq(dpfModules.tenantId, tenantId)),
    });

    if (!module) {
      throw new Error('Module not found or does not belong to this tenant');
    }

    // If screenId provided, validate it exists and belongs to tenant
    if (input.screenId) {
      const screen = await db.query.dpfScreens.findFirst({
        where: and(eq(dpfScreens.id, input.screenId), eq(dpfScreens.tenantId, tenantId)),
      });

      if (!screen) {
        throw new Error('Screen not found or does not belong to this tenant');
      }
    }

    // Check if actionCode already exists for this tenant
    const existing = await db.query.dpfActions.findFirst({
      where: and(eq(dpfActions.tenantId, tenantId), eq(dpfActions.actionCode, input.actionCode)),
    });

    if (existing) {
      throw new Error(`Action with code '${input.actionCode}' already exists for this tenant`);
    }

    // Create action
    const [newAction] = await db
      .insert(dpfActions)
      .values({
        tenantId,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Auto-create corresponding permission
    const permissionCode = `${module.moduleCode}:${input.actionCode}`;
    await db.insert(dpfPermissions).values({
      tenantId,
      moduleId: input.moduleId,
      screenId: input.screenId || null,
      actionId: newAction.id,
      permissionCode,
      permissionName: input.actionName,
      permissionNameAr: input.actionNameAr,
      description: input.description,
      descriptionAr: input.descriptionAr,
      permissionType: 'ACTION',
      isActive: 'true',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Invalidate cache
    await this.invalidateCache(tenantId, input.moduleId, input.screenId);

    return newAction;
  }

  /**
   * Update action
   */
  static async update(tenantId: string, id: string, input: UpdateActionInput): Promise<typeof dpfActions.$inferSelect> {
    // Verify action exists and belongs to tenant
    const action = await this.getById(tenantId, id);
    if (!action) {
      throw new Error('Action not found');
    }

    // Update action
    const [updatedAction] = await db
      .update(dpfActions)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(dpfActions.id, id), eq(dpfActions.tenantId, tenantId)))
      .returning();

    // Invalidate cache
    await this.invalidateCache(tenantId, action.moduleId, action.screenId || undefined, id);

    return updatedAction;
  }

  /**
   * Soft delete action (deactivate)
   * NOTE: Also deactivates corresponding permission
   */
  static async delete(tenantId: string, id: string): Promise<{ success: boolean }> {
    // Verify action exists and belongs to tenant
    const action = await this.getById(tenantId, id);
    if (!action) {
      throw new Error('Action not found');
    }

    // Soft delete (deactivate) action
    await db
      .update(dpfActions)
      .set({
        isActive: 'false',
        updatedAt: new Date(),
      })
      .where(and(eq(dpfActions.id, id), eq(dpfActions.tenantId, tenantId)));

    // Deactivate corresponding permission
    await db
      .update(dpfPermissions)
      .set({
        isActive: 'false',
        updatedAt: new Date(),
      })
      .where(and(eq(dpfPermissions.actionId, id), eq(dpfPermissions.tenantId, tenantId)));

    // Invalidate cache
    await this.invalidateCache(tenantId, action.moduleId, action.screenId || undefined, id);

    return { success: true };
  }

  /**
   * Invalidate action caches
   */
  private static async invalidateCache(
    tenantId: string,
    moduleId: string,
    screenId?: string,
    actionId?: string
  ): Promise<void> {
    // Invalidate list cache
    const listPattern = `dpf:actions:list:${tenantId}:*`;
    await cacheService.invalidatePattern(listPattern);

    // Invalidate module actions cache
    const modulePattern = `dpf:actions:module:${tenantId}:${moduleId}`;
    await cacheService.del(modulePattern);

    // Invalidate screen actions cache
    if (screenId) {
      const screenPattern = `dpf:actions:screen:${tenantId}:${screenId}`;
      await cacheService.del(screenPattern);
    }

    // Invalidate specific action cache
    if (actionId) {
      const actionKey = `dpf:action:${tenantId}:${actionId}`;
      await cacheService.del(actionKey);
    }

    // Invalidate endpoint cache (if applicable)
    const endpointPattern = `dpf:action:endpoint:${tenantId}:*`;
    await cacheService.invalidatePattern(endpointPattern);

    // Invalidate permission matrix cache
    const matrixPattern = `dpf:matrix:${tenantId}`;
    await cacheService.del(matrixPattern);
  }
}
