import { Request, Response } from 'express';
import { db } from '../../db';
import { branches } from '../../db/schemas';
import { eq, and, like, or, sql } from 'drizzle-orm';
import {
  getPaginationParams,
  calculateOffset,
  createPaginatedResponse,
  getSortOrder,
} from '../../utils/pagination';
import { applyBranchScopeFilter } from '../../utils/scopeFilters';

/**
 * Create a new branch
 * Access: System, Tenant, and Business Line admins
 */
export const createBranch = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check permissions
    if (user.accessScope === 'branch') {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    const { tenantId, businessLineId, name, code, city, address, isActive } = req.body;

    // Validation
    if (!tenantId || !businessLineId || !name || !code || !city) {
      return res.status(400).json({
        error: 'Tenant ID, business line ID, name, code, and city are required',
      });
    }

    // Tenant scope check
    if (user.accessScope === 'tenant' && user.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Forbidden: Cannot create for other tenants' });
    }

    // Business line scope check
    if (user.accessScope === 'business_line' && user.businessLineId !== businessLineId) {
      return res.status(403).json({ error: 'Forbidden: Cannot create for other business lines' });
    }

    // Check if code already exists for this tenant
    const [existing] = await db
      .select()
      .from(branches)
      .where(and(eq(branches.tenantId, tenantId), eq(branches.code, code.toUpperCase())))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: 'Branch code already exists for this tenant' });
    }

    // Create branch
    const [newBranch] = await db
      .insert(branches)
      .values({
        tenantId,
        businessLineId,
        name,
        code: code.toUpperCase(),
        city,
        address,
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    res.status(201).json({
      message: 'Branch created successfully',
      data: newBranch,
    });
  } catch (error: any) {
    console.error('Error creating branch:', error);
    res.status(500).json({ error: 'Failed to create branch' });
  }
};

/**
 * Get all branches with pagination
 * Access: All users (scoped by access level)
 */
export const getAllBranches = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { page, limit, sortBy, sortOrder } = getPaginationParams(req.query);
    const { search, tenantId, businessLineId, city, isActive } = req.query;

    const offset = calculateOffset(page, limit);

    // Build filters
    const filters: any[] = [];

    // Apply scope filtering based on user access level
    const scopeFilter = applyBranchScopeFilter(
      user,
      branches.tenantId,
      branches.businessLineId,
      branches.id
    );
    if (scopeFilter) {
      filters.push(scopeFilter);
    }

    // Additional filters (only for system users)
    if (tenantId && user.accessScope === 'system') {
      filters.push(eq(branches.tenantId, tenantId as string));
    }

    if (businessLineId && (user.accessScope === 'system' || user.accessScope === 'tenant')) {
      filters.push(eq(branches.businessLineId, businessLineId as string));
    }

    if (city) {
      filters.push(like(branches.city, `%${city}%`));
    }

    if (isActive !== undefined) {
      filters.push(eq(branches.isActive, isActive === 'true'));
    }

    // Search filtering
    if (search && typeof search === 'string') {
      const searchPattern = `%${search}%`;
      filters.push(
        or(
          like(branches.name, searchPattern),
          like(branches.code, searchPattern),
          like(branches.city, searchPattern),
          like(branches.address, searchPattern)
        )
      );
    }

    // Build query
    let query = db.select().from(branches);
    if (filters.length > 0) {
      query = query.where(and(...filters)) as any;
    }

    // Get total count
    const countQuery =
      filters.length > 0
        ? db.select({ count: sql<number>`count(*)` }).from(branches).where(and(...filters))
        : db.select({ count: sql<number>`count(*)` }).from(branches);

    const [{ count: total }] = await countQuery;

    // Get paginated results
    const sortColumn = (branches as any)[sortBy] || branches.createdAt;
    const results = await query
      .orderBy(getSortOrder(sortColumn, sortOrder))
      .limit(limit)
      .offset(offset);

    const response = createPaginatedResponse(results, Number(total), page, limit);

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
};

/**
 * Get branch by ID
 * Access: All users (scoped by access level)
 */
export const getBranchById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const [branch] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Scope checks
    if (user.accessScope === 'tenant' && user.tenantId !== branch.tenantId) {
      return res.status(403).json({ error: 'Forbidden: Cannot access other tenants' });
    }

    if (user.accessScope === 'business_line' && user.businessLineId !== branch.businessLineId) {
      return res.status(403).json({ error: 'Forbidden: Cannot access other business lines' });
    }

    if (user.accessScope === 'branch' && user.branchId !== branch.id) {
      return res.status(403).json({ error: 'Forbidden: Cannot access other branches' });
    }

    res.json({ data: branch });
  } catch (error: any) {
    console.error('Error fetching branch:', error);
    res.status(500).json({ error: 'Failed to fetch branch' });
  }
};

/**
 * Update branch
 * Access: System, Tenant, and Business Line admins
 */
export const updateBranch = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Check permissions
    if (user.accessScope === 'branch') {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    const { name, city, address, isActive } = req.body;

    // Check if branch exists
    const [existing] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Scope checks
    if (user.accessScope === 'tenant' && user.tenantId !== existing.tenantId) {
      return res.status(403).json({ error: 'Forbidden: Cannot update other tenants' });
    }

    if (user.accessScope === 'business_line' && user.businessLineId !== existing.businessLineId) {
      return res.status(403).json({ error: 'Forbidden: Cannot update other business lines' });
    }

    // Update branch
    const [updated] = await db
      .update(branches)
      .set({
        name: name || existing.name,
        city: city || existing.city,
        address: address !== undefined ? address : existing.address,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      })
      .where(eq(branches.id, id))
      .returning();

    res.json({
      message: 'Branch updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating branch:', error);
    res.status(500).json({ error: 'Failed to update branch' });
  }
};

/**
 * Delete branch
 * Access: System, Tenant, and Business Line admins
 */
export const deleteBranch = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Check permissions
    if (user.accessScope === 'branch') {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    // Check if branch exists
    const [branch] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Scope checks
    if (user.accessScope === 'tenant' && user.tenantId !== branch.tenantId) {
      return res.status(403).json({ error: 'Forbidden: Cannot delete other tenants' });
    }

    if (user.accessScope === 'business_line' && user.businessLineId !== branch.businessLineId) {
      return res.status(403).json({ error: 'Forbidden: Cannot delete other business lines' });
    }

    // Delete branch
    await db.delete(branches).where(eq(branches.id, id));

    res.json({ message: 'Branch deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ error: 'Failed to delete branch' });
  }
};
