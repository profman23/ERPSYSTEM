import { Request, Response } from 'express';
import { db } from '../../db';
import { tenants } from '../../db/schemas';
import { eq, and, like, or, sql } from 'drizzle-orm';
import { createTenantSchema, updateTenantSchema } from '../../validations/tenantValidation';
import logger from '../../config/logger';
import {
  getPaginationParams,
  calculateOffset,
  createPaginatedResponse,
  getSortOrder,
} from '../../utils/pagination';

/**
 * Create a new tenant
 * Access: System admins only
 */
export const createTenant = async (req: Request, res: Response, next: any) => {
  try {
    const user = (req as any).user;

    // Only system admins can create tenants
    if (user.accessScope !== 'system') {
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden: System access required' 
      });
    }

    // Zod validation (errors will be caught and sent to global error handler)
    const validatedData = createTenantSchema.parse(req.body);

    // Check if tenant code already exists (composite unique validation)
    const [existing] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.code, validatedData.code.toUpperCase()))
      .limit(1);

    if (existing) {
      return res.status(409).json({ 
        success: false,
        error: 'Tenant code already exists' 
      });
    }

    // Create tenant
    const [newTenant] = await db
      .insert(tenants)
      .values({
        code: validatedData.code.toUpperCase(),
        name: validatedData.name,
        defaultLanguage: validatedData.defaultLanguage,
        country: validatedData.country,
        timezone: validatedData.timezone,
      })
      .returning();

    logger.info(`Tenant created: ${newTenant.code} by user ${user.userId}`);

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: newTenant,
    });
  } catch (error: any) {
    logger.error('Error creating tenant:', error);
    next(error);
  }
};

/**
 * Get all tenants with pagination
 * Access: System admins see all, tenant admins see their own
 * SECURITY: All filters combined with AND to prevent tenant isolation bypass
 */
export const getAllTenants = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { page, limit, sortBy, sortOrder } = getPaginationParams(req.query);
    const { search } = req.query;

    const offset = calculateOffset(page, limit);

    // Build filters array (CRITICAL: prevents tenant isolation bypass)
    const filters: any[] = [];

    // Tenant scope filtering (MUST be first)
    if (user.accessScope !== 'system') {
      // Non-system users can only see their own tenant
      if (!user.tenantId) {
        return res.status(403).json({ error: 'No tenant access' });
      }
      filters.push(eq(tenants.id, user.tenantId));
    }

    // Search filtering (combines with scope via AND)
    if (search && typeof search === 'string') {
      const searchPattern = `%${search}%`;
      filters.push(
        or(
          like(tenants.name, searchPattern),
          like(tenants.code, searchPattern),
          like(tenants.country, searchPattern)
        )
      );
    }

    // Build query with combined filters
    let query = db.select().from(tenants);
    if (filters.length > 0) {
      query = query.where(and(...filters)) as any;
    }

    // Get total count with SAME filters as data query
    const countQuery =
      filters.length > 0
        ? db.select({ count: sql<number>`count(*)` }).from(tenants).where(and(...filters))
        : db.select({ count: sql<number>`count(*)` }).from(tenants);

    const [{ count: total }] = await countQuery;

    // Get paginated results
    const sortColumn = (tenants as any)[sortBy] || tenants.createdAt;
    const results = await query
      .orderBy(getSortOrder(sortColumn, sortOrder))
      .limit(limit)
      .offset(offset);

    const response = createPaginatedResponse(results, Number(total), page, limit);

    res.json({
      success: true,
      ...response,
    });
  } catch (error: any) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
};

/**
 * Get tenant by ID
 * Access: System admins see all, tenant users see their own
 */
export const getTenantById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Scope check
    if (user.accessScope !== 'system' && user.tenantId !== id) {
      return res.status(403).json({ error: 'Forbidden: Cannot access other tenants' });
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ data: tenant });
  } catch (error: any) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
};

/**
 * Update tenant
 * Access: System admins only
 */
export const updateTenant = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Only system admins can update tenants
    if (user.accessScope !== 'system') {
      return res.status(403).json({ error: 'Forbidden: System access required' });
    }

    const { name, defaultLanguage, country, timezone } = req.body;

    // Check if tenant exists
    const [existing] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Update tenant
    const [updated] = await db
      .update(tenants)
      .set({
        name: name || existing.name,
        defaultLanguage: defaultLanguage || existing.defaultLanguage,
        country: country !== undefined ? country : existing.country,
        timezone: timezone !== undefined ? timezone : existing.timezone,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();

    res.json({
      message: 'Tenant updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
};

/**
 * Delete tenant
 * Access: System admins only
 * WARNING: This will cascade delete all related data
 */
export const deleteTenant = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Only system admins can delete tenants
    if (user.accessScope !== 'system') {
      return res.status(403).json({ error: 'Forbidden: System access required' });
    }

    // Prevent deleting SYSTEM tenant
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (tenant.code === 'SYSTEM') {
      return res.status(403).json({ error: 'Cannot delete SYSTEM tenant' });
    }

    // Delete tenant (cascade will handle related records)
    await db.delete(tenants).where(eq(tenants.id, id));

    res.json({ message: 'Tenant deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
};
