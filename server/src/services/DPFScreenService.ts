/**
 * DPF Screen Service - Screen management for Dynamic Permission Framework
 * Enforces tenant isolation via explicit tenantId parameter
 */

import { db } from '../db';
import { dpfScreens } from '../db/schemas/dpfScreens';
import { dpfModules } from '../db/schemas/dpfModules';
import { dpfActions } from '../db/schemas/dpfActions';
import { eq, and, or, like, count, sql, asc, desc } from 'drizzle-orm';
import { cacheService } from './CacheService';
import type { CreateScreenInput, UpdateScreenInput, ListQueryInput } from '../validations/dpfScreenValidation';

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

export interface ScreenWithStats {
  id: string;
  tenantId: string;
  moduleId: string;
  screenCode: string;
  screenName: string;
  screenNameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  route: string | null;
  componentPath: string | null;
  isActive: string;
  requiredAgiLevel: string | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  actionsCount: number;
}

export class DPFScreenService {
  /**
   * List screens with pagination, filtering, and search
   * L2 Cache: 10min TTL for screen lists
   */
  static async list(tenantId: string, params: ListQueryInput): Promise<PaginatedResponse<typeof dpfScreens.$inferSelect>> {
    const { page = 1, limit = 20, search, isActive, moduleId, sortBy = 'screenName', sortOrder: order = 'asc' } = params;
    const offset = (page - 1) * limit;

    // Build cache key
    const cacheKey = `dpf:screens:list:${tenantId}:${JSON.stringify(params)}`;

    // Check L2 cache
    const cached = await cacheService.get<PaginatedResponse<typeof dpfScreens.$inferSelect>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build WHERE conditions
    const conditions = [eq(dpfScreens.tenantId, tenantId)];

    if (isActive) {
      conditions.push(eq(dpfScreens.isActive, isActive));
    }

    if (moduleId) {
      conditions.push(eq(dpfScreens.moduleId, moduleId));
    }

    if (search) {
      conditions.push(
        or(
          like(dpfScreens.screenCode, `%${search}%`),
          like(dpfScreens.screenName, `%${search}%`)
        )!
      );
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(dpfScreens)
      .where(and(...conditions));

    // Get paginated data using select builder (more reliable than relational queries)
    const orderByColumn = (dpfScreens as any)[sortBy] || dpfScreens.screenName;
    const data = await db
      .select()
      .from(dpfScreens)
      .where(and(...conditions))
      .orderBy(order === 'asc' ? sql`${orderByColumn} ASC` : sql`${orderByColumn} DESC`)
      .limit(limit)
      .offset(offset);

    const result: PaginatedResponse<typeof dpfScreens.$inferSelect> = {
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
   * Get screen by ID
   * L1 Cache: 60s TTL for individual screens
   */
  static async getById(tenantId: string, id: string): Promise<typeof dpfScreens.$inferSelect | null> {
    // Check L1 cache
    const cacheKey = `dpf:screen:${tenantId}:${id}`;
    const cached = await cacheService.get<typeof dpfScreens.$inferSelect>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await db
      .select()
      .from(dpfScreens)
      .where(and(eq(dpfScreens.id, id), eq(dpfScreens.tenantId, tenantId)))
      .limit(1);

    const screen = result[0] || null;

    if (screen) {
      // Cache for 60 seconds
      await cacheService.set(cacheKey, screen, 60); // 60s TTL (seconds)
    }

    return screen;
  }

  /**
   * Get screens by module ID
   * L2 Cache: 10min TTL
   */
  static async getByModule(tenantId: string, moduleId: string): Promise<typeof dpfScreens.$inferSelect[]> {
    // Check L2 cache
    const cacheKey = `dpf:screens:module:${tenantId}:${moduleId}`;
    const cached = await cacheService.get<typeof dpfScreens.$inferSelect[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const screens = await db
      .select()
      .from(dpfScreens)
      .where(and(
        eq(dpfScreens.tenantId, tenantId),
        eq(dpfScreens.moduleId, moduleId),
        eq(dpfScreens.isActive, 'true')
      ));

    // Cache for 10 minutes
    await cacheService.set(cacheKey, screens, 600);

    return screens;
  }

  /**
   * Get screen with statistics (actions count)
   */
  static async getWithStats(tenantId: string, id: string): Promise<ScreenWithStats | null> {
    const screen = await this.getById(tenantId, id);
    if (!screen) {
      return null;
    }

    // Get actions count
    const [{ actionsCount }] = await db
      .select({ actionsCount: count() })
      .from(dpfActions)
      .where(and(eq(dpfActions.screenId, id), eq(dpfActions.tenantId, tenantId)));

    return {
      ...screen,
      actionsCount,
    };
  }

  /**
   * Create new screen
   * SECURITY: Validates unique screenCode per tenant and module exists
   */
  static async create(tenantId: string, input: CreateScreenInput): Promise<typeof dpfScreens.$inferSelect> {
    // Validate module exists and belongs to tenant
    const moduleResult = await db
      .select()
      .from(dpfModules)
      .where(and(eq(dpfModules.id, input.moduleId), eq(dpfModules.tenantId, tenantId)))
      .limit(1);
    const module = moduleResult[0];

    if (!module) {
      throw new Error('Module not found or does not belong to this tenant');
    }

    // Check if screenCode already exists for this tenant
    const existingResult = await db
      .select()
      .from(dpfScreens)
      .where(and(
        eq(dpfScreens.tenantId, tenantId),
        eq(dpfScreens.screenCode, input.screenCode)
      ))
      .limit(1);
    const existing = existingResult[0];

    if (existing) {
      throw new Error(`Screen with code '${input.screenCode}' already exists for this tenant`);
    }

    // Create screen
    const [newScreen] = await db
      .insert(dpfScreens)
      .values({
        tenantId,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Invalidate cache
    await this.invalidateCache(tenantId, input.moduleId);

    return newScreen;
  }

  /**
   * Update screen
   */
  static async update(tenantId: string, id: string, input: UpdateScreenInput): Promise<typeof dpfScreens.$inferSelect> {
    // Verify screen exists and belongs to tenant
    const screen = await this.getById(tenantId, id);
    if (!screen) {
      throw new Error('Screen not found');
    }

    // Update screen
    const [updatedScreen] = await db
      .update(dpfScreens)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(dpfScreens.id, id), eq(dpfScreens.tenantId, tenantId)))
      .returning();

    // Invalidate cache
    await this.invalidateCache(tenantId, screen.moduleId, id);

    return updatedScreen;
  }

  /**
   * Soft delete screen (deactivate)
   * SECURITY: Validates no dependencies (actions)
   */
  static async delete(tenantId: string, id: string): Promise<{ success: boolean }> {
    // Verify screen exists and belongs to tenant
    const screen = await this.getById(tenantId, id);
    if (!screen) {
      throw new Error('Screen not found');
    }

    // Check for dependencies (actions)
    const [{ actionsCount }] = await db
      .select({ actionsCount: count() })
      .from(dpfActions)
      .where(and(eq(dpfActions.screenId, id), eq(dpfActions.tenantId, tenantId)));

    if (actionsCount > 0) {
      throw new Error(`Cannot delete screen with ${actionsCount} action(s). Please delete actions first.`);
    }

    // Soft delete (deactivate)
    await db
      .update(dpfScreens)
      .set({
        isActive: 'false',
        updatedAt: new Date(),
      })
      .where(and(eq(dpfScreens.id, id), eq(dpfScreens.tenantId, tenantId)));

    // Invalidate cache
    await this.invalidateCache(tenantId, screen.moduleId, id);

    return { success: true };
  }

  /**
   * Invalidate screen caches
   */
  private static async invalidateCache(tenantId: string, moduleId: string, screenId?: string): Promise<void> {
    // Invalidate list cache
    const listPattern = `dpf:screens:list:${tenantId}:*`;
    await cacheService.invalidatePattern(listPattern);

    // Invalidate module screens cache
    const modulePattern = `dpf:screens:module:${tenantId}:${moduleId}`;
    await cacheService.del(modulePattern);

    // Invalidate specific screen cache
    if (screenId) {
      const screenKey = `dpf:screen:${tenantId}:${screenId}`;
      await cacheService.del(screenKey);
    }

    // Invalidate permission matrix cache (depends on screens)
    const matrixPattern = `dpf:matrix:${tenantId}`;
    await cacheService.del(matrixPattern);
  }
}
