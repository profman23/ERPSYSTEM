import { Request, Response } from 'express';
import { db } from '../../db';
import { users } from '../../db/schemas/users';
import { tenants } from '../../db/schemas/tenants';
import { businessLines } from '../../db/schemas/businessLines';
import { branches } from '../../db/schemas/branches';
import { eq, and, or, like, sql, SQL } from 'drizzle-orm';
import { getPaginationParams, calculateOffset, createPaginatedResponse, getSortOrder } from '../../utils/pagination';
import { applyBranchScopeFilter } from '../../utils/scopeFilters';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { page, limit, sortBy, sortOrder } = getPaginationParams(req.query);
    const { search, tenantId, businessLineId, branchId, status, scope, isActive } = req.query;

    const offset = calculateOffset(page, limit);

    const filters: SQL[] = [];

    const scopeFilter = applyBranchScopeFilter(
      user,
      users.tenantId,
      users.businessLineId,
      users.branchId
    );
    if (scopeFilter) {
      filters.push(scopeFilter);
    }

    if (tenantId && user.accessScope === 'system') {
      filters.push(eq(users.tenantId, tenantId as string));
    }

    if (businessLineId && (user.accessScope === 'system' || user.accessScope === 'tenant')) {
      filters.push(eq(users.businessLineId, businessLineId as string));
    }

    if (branchId) {
      filters.push(eq(users.branchId, branchId as string));
    }

    if (status) {
      filters.push(eq(users.status, status as string));
    }

    if (scope) {
      filters.push(eq(users.accessScope, scope as string));
    }

    if (isActive !== undefined) {
      filters.push(eq(users.isActive, isActive === 'true'));
    }

    if (search && typeof search === 'string') {
      const searchPattern = `%${search}%`;
      filters.push(
        or(
          like(users.name, searchPattern),
          like(users.email, searchPattern),
          like(users.code, searchPattern),
          like(users.firstName, searchPattern),
          like(users.lastName, searchPattern)
        ) as SQL
      );
    }

    const baseQuery = db
      .select({
        id: users.id,
        code: users.code,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        role: users.role,
        accessScope: users.accessScope,
        status: users.status,
        isActive: users.isActive,
        tenantId: users.tenantId,
        businessLineId: users.businessLineId,
        branchId: users.branchId,
        allowedBranchIds: users.allowedBranchIds,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        tenantName: tenants.name,
        businessLineName: businessLines.name,
        branchName: branches.name,
      })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .leftJoin(businessLines, eq(users.businessLineId, businessLines.id))
      .leftJoin(branches, eq(users.branchId, branches.id));

    let query = baseQuery;
    if (filters.length > 0) {
      query = baseQuery.where(and(...filters)) as typeof baseQuery;
    }

    const countQuery =
      filters.length > 0
        ? db.select({ count: sql<number>`count(*)` }).from(users).where(and(...filters))
        : db.select({ count: sql<number>`count(*)` }).from(users);

    const [{ count: total }] = await countQuery;

    const sortColumn = (users as any)[sortBy] || users.createdAt;
    const results = await query
      .orderBy(getSortOrder(sortColumn, sortOrder))
      .limit(limit)
      .offset(offset);

    const response = createPaginatedResponse(results, Number(total), page, limit);

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const filters: SQL[] = [eq(users.id, id)];

    const scopeFilter = applyBranchScopeFilter(
      user,
      users.tenantId,
      users.businessLineId,
      users.branchId
    );
    if (scopeFilter) {
      filters.push(scopeFilter);
    }

    const result = await db
      .select({
        id: users.id,
        code: users.code,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        role: users.role,
        accessScope: users.accessScope,
        status: users.status,
        isActive: users.isActive,
        tenantId: users.tenantId,
        businessLineId: users.businessLineId,
        branchId: users.branchId,
        allowedBranchIds: users.allowedBranchIds,
        preferences: users.preferences,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        tenantName: tenants.name,
        businessLineName: businessLines.name,
        branchName: branches.name,
      })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .leftJoin(businessLines, eq(users.businessLineId, businessLines.id))
      .leftJoin(branches, eq(users.branchId, branches.id))
      .where(and(...filters));

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result[0]);
  } catch (error: any) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const updateData = req.body;

    const filters: SQL[] = [eq(users.id, id)];

    const scopeFilter = applyBranchScopeFilter(
      user,
      users.tenantId,
      users.businessLineId,
      users.branchId
    );
    if (scopeFilter) {
      filters.push(scopeFilter);
    }

    const existingUser = await db.select().from(users).where(and(...filters));

    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found or access denied' });
    }

    const allowedFields = [
      'name',
      'firstName',
      'lastName',
      'phone',
      'avatarUrl',
      'role',
      'accessScope',
      'status',
      'isActive',
      'branchId',
      'businessLineId',
      'allowedBranchIds',
      'preferences',
    ];

    const filteredData: Record<string, any> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    const result = await db
      .update(users)
      .set(filteredData)
      .where(eq(users.id, id))
      .returning();

    res.json(result[0]);
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = (req as any).user;

    const filters: SQL[] = [eq(users.id, id)];

    const scopeFilter = applyBranchScopeFilter(
      user,
      users.tenantId,
      users.businessLineId,
      users.branchId
    );
    if (scopeFilter) {
      filters.push(scopeFilter);
    }

    const existingUser = await db.select().from(users).where(and(...filters));

    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found or access denied' });
    }

    const result = await db
      .update(users)
      .set({ isActive: Boolean(isActive), updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    res.json(result[0]);
  } catch (error: any) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};
