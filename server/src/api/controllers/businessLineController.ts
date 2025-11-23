import { Request, Response } from 'express';
import { db } from '../../db';
import { businessLines } from '../../db/schemas';
import { eq, and, like, or, sql } from 'drizzle-orm';
import {
  getPaginationParams,
  calculateOffset,
  createPaginatedResponse,
  getSortOrder,
} from '../../utils/pagination';
import { applyTenantScopeFilter } from '../../utils/scopeFilters';

/**
 * Create a new business line
 * Access: System and Tenant admins
 */
export const createBusinessLine = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check permissions
    if (user.accessScope === 'business_line' || user.accessScope === 'branch') {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    const { tenantId, name, code, description, logoUrl, primaryColor, secondaryColor, accentColor, isActive } = req.body;

    // Validation
    if (!tenantId || !name || !code) {
      return res.status(400).json({ error: 'Tenant ID, name, and code are required' });
    }

    // Tenant scope check
    if (user.accessScope === 'tenant' && user.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Forbidden: Cannot create for other tenants' });
    }

    // Check if code already exists for this tenant
    const [existing] = await db
      .select()
      .from(businessLines)
      .where(
        and(
          eq(businessLines.tenantId, tenantId),
          eq(businessLines.code, code.toUpperCase())
        )
      )
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: 'Business line code already exists for this tenant' });
    }

    // Create business line
    const [newBusinessLine] = await db
      .insert(businessLines)
      .values({
        tenantId,
        name,
        code: code.toUpperCase(),
        description,
        logoUrl,
        primaryColor,
        secondaryColor,
        accentColor,
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    res.status(201).json({
      message: 'Business line created successfully',
      data: newBusinessLine,
    });
  } catch (error: any) {
    console.error('Error creating business line:', error);
    res.status(500).json({ error: 'Failed to create business line' });
  }
};

/**
 * Get all business lines with pagination
 * Access: All users (scoped by access level)
 */
export const getAllBusinessLines = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { page, limit, sortBy, sortOrder } = getPaginationParams(req.query);
    const { search, tenantId, isActive } = req.query;

    const offset = calculateOffset(page, limit);

    // Build filters
    const filters: any[] = [];

    // Tenant scope filtering
    const tenantFilter = applyTenantScopeFilter(user, businessLines.tenantId);
    if (tenantFilter) {
      filters.push(tenantFilter);
    }

    // Additional filters
    if (tenantId && user.accessScope === 'system') {
      filters.push(eq(businessLines.tenantId, tenantId as string));
    }

    if (isActive !== undefined) {
      filters.push(eq(businessLines.isActive, isActive === 'true'));
    }

    // Search filtering
    if (search && typeof search === 'string') {
      const searchPattern = `%${search}%`;
      filters.push(
        or(
          like(businessLines.name, searchPattern),
          like(businessLines.code, searchPattern),
          like(businessLines.description, searchPattern)
        )
      );
    }

    // Build query
    let query = db.select().from(businessLines);
    if (filters.length > 0) {
      query = query.where(and(...filters)) as any;
    }

    // Get total count
    const countQuery = filters.length > 0
      ? db.select({ count: sql<number>`count(*)` }).from(businessLines).where(and(...filters))
      : db.select({ count: sql<number>`count(*)` }).from(businessLines);

    const [{ count: total }] = await countQuery;

    // Get paginated results
    const sortColumn = (businessLines as any)[sortBy] || businessLines.createdAt;
    const results = await query
      .orderBy(getSortOrder(sortColumn, sortOrder))
      .limit(limit)
      .offset(offset);

    const response = createPaginatedResponse(results, Number(total), page, limit);

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching business lines:', error);
    res.status(500).json({ error: 'Failed to fetch business lines' });
  }
};

/**
 * Get business line by ID
 * Access: All users (scoped by access level)
 */
export const getBusinessLineById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const [businessLine] = await db
      .select()
      .from(businessLines)
      .where(eq(businessLines.id, id))
      .limit(1);

    if (!businessLine) {
      return res.status(404).json({ error: 'Business line not found' });
    }

    // Tenant scope check
    if (user.accessScope !== 'system' && user.tenantId !== businessLine.tenantId) {
      return res.status(403).json({ error: 'Forbidden: Cannot access other tenants' });
    }

    res.json({ data: businessLine });
  } catch (error: any) {
    console.error('Error fetching business line:', error);
    res.status(500).json({ error: 'Failed to fetch business line' });
  }
};

/**
 * Update business line
 * Access: System and Tenant admins
 */
export const updateBusinessLine = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Check permissions
    if (user.accessScope === 'business_line' || user.accessScope === 'branch') {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    const { name, description, logoUrl, primaryColor, secondaryColor, accentColor, isActive } = req.body;

    // Check if business line exists
    const [existing] = await db
      .select()
      .from(businessLines)
      .where(eq(businessLines.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Business line not found' });
    }

    // Tenant scope check
    if (user.accessScope === 'tenant' && user.tenantId !== existing.tenantId) {
      return res.status(403).json({ error: 'Forbidden: Cannot update other tenants' });
    }

    // Update business line
    const [updated] = await db
      .update(businessLines)
      .set({
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        logoUrl: logoUrl !== undefined ? logoUrl : existing.logoUrl,
        primaryColor: primaryColor !== undefined ? primaryColor : existing.primaryColor,
        secondaryColor: secondaryColor !== undefined ? secondaryColor : existing.secondaryColor,
        accentColor: accentColor !== undefined ? accentColor : existing.accentColor,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      })
      .where(eq(businessLines.id, id))
      .returning();

    res.json({
      message: 'Business line updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating business line:', error);
    res.status(500).json({ error: 'Failed to update business line' });
  }
};

/**
 * Delete business line
 * Access: System and Tenant admins
 */
export const deleteBusinessLine = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Check permissions
    if (user.accessScope === 'business_line' || user.accessScope === 'branch') {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    // Check if business line exists
    const [businessLine] = await db
      .select()
      .from(businessLines)
      .where(eq(businessLines.id, id))
      .limit(1);

    if (!businessLine) {
      return res.status(404).json({ error: 'Business line not found' });
    }

    // Tenant scope check
    if (user.accessScope === 'tenant' && user.tenantId !== businessLine.tenantId) {
      return res.status(403).json({ error: 'Forbidden: Cannot delete other tenants' });
    }

    // Delete business line
    await db.delete(businessLines).where(eq(businessLines.id, id));

    res.json({ message: 'Business line deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting business line:', error);
    res.status(500).json({ error: 'Failed to delete business line' });
  }
};
