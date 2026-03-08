/**
 * User Service
 *
 * Handles user CRUD with tenant isolation.
 * Uses custom queries for LEFT JOINs (tenant/businessLine/branch/dpfRole data).
 */

import { eq, and, or, ilike, sql, asc, desc, SQL } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { BaseService } from '../core/service';
import { NotFoundError, ConflictError } from '../core/errors';
import { users } from '../db/schemas/users';
import { tenants } from '../db/schemas/tenants';
import { businessLines } from '../db/schemas/businessLines';
import { branches } from '../db/schemas/branches';
import { dpfUserRoles } from '../db/schemas/dpfUserRoles';
import { dpfRoles } from '../db/schemas/dpfRoles';
import type { User } from '../db/schemas/users';
import type { CreateUserInput, UpdateUserInput, ListUserInput } from '../validations/userValidation';

// List select: minimal fields, no heavy JSONB
const listSelect = {
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
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  tenantName: tenants.name,
  businessLineName: businessLines.name,
  branchName: branches.name,
  dpfRoleId: dpfRoles.id,
  dpfRoleName: dpfRoles.roleName,
  dpfRoleCode: dpfRoles.roleCode,
};

// Detail select: includes JSONB fields
const detailSelect = {
  ...listSelect,
  allowedBranchIds: users.allowedBranchIds,
  preferences: users.preferences,
};

export class UserService extends BaseService {
  private static readonly TABLE = users;
  private static readonly ENTITY_NAME = 'User';

  static async list(tenantId: string, params: ListUserInput) {
    const conditions: SQL[] = [eq(users.tenantId, tenantId)];

    if (params.isActive !== undefined) {
      conditions.push(eq(users.isActive, params.isActive === 'true'));
    }

    if (params.businessLineId) {
      conditions.push(eq(users.businessLineId, params.businessLineId));
    }

    if (params.branchId) {
      conditions.push(eq(users.branchId, params.branchId));
    }

    if (params.status) {
      conditions.push(eq(users.status, params.status));
    }

    if (params.scope) {
      conditions.push(eq(users.accessScope, params.scope));
    }

    if (params.search) {
      const pattern = `%${params.search}%`;
      conditions.push(
        or(
          ilike(users.name, pattern),
          ilike(users.email, pattern),
          ilike(users.code, pattern),
          ilike(users.firstName, pattern),
          ilike(users.lastName, pattern),
        ) as SQL,
      );
    }

    const where = and(...conditions);
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    // Count query
    const [{ count: total }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(where);

    // Data query with LEFT JOINs
    const sortColumn = params.sortBy ? (users as any)[params.sortBy] || users.createdAt : users.createdAt;
    const orderDir = params.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    const items = await this.db
      .select(listSelect)
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .leftJoin(businessLines, eq(users.businessLineId, businessLines.id))
      .leftJoin(branches, eq(users.branchId, branches.id))
      .leftJoin(dpfUserRoles, eq(users.id, dpfUserRoles.userId))
      .leftJoin(dpfRoles, eq(dpfUserRoles.roleId, dpfRoles.id))
      .where(where)
      .orderBy(orderDir)
      .limit(limit)
      .offset(offset);

    return { items, total: Number(total), page, limit };
  }

  static async getById(tenantId: string, id: string) {
    const results = await this.db
      .select(detailSelect)
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .leftJoin(businessLines, eq(users.businessLineId, businessLines.id))
      .leftJoin(branches, eq(users.branchId, branches.id))
      .leftJoin(dpfUserRoles, eq(users.id, dpfUserRoles.userId))
      .leftJoin(dpfRoles, eq(dpfUserRoles.roleId, dpfRoles.id))
      .where(and(eq(users.tenantId, tenantId), eq(users.id, id)))
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundError(this.ENTITY_NAME, id);
    }

    return results[0];
  }

  static async create(tenantId: string, input: CreateUserInput) {
    // Check email uniqueness
    const emailExists = await this.exists(tenantId, this.TABLE, eq(users.email, input.email));
    if (emailExists) {
      throw new ConflictError(`User with email '${input.email}' already exists`);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 12);

    // Build name from firstName + lastName
    const name = `${input.firstName} ${input.lastName}`;

    const { password, ...rest } = input;
    return this.insertOne<User>(tenantId, this.TABLE, {
      ...rest,
      name,
      passwordHash,
    });
  }

  static async update(tenantId: string, id: string, input: UpdateUserInput) {
    return this.updateById<User>(tenantId, this.TABLE, id, input, this.ENTITY_NAME);
  }

  static async toggleStatus(tenantId: string, id: string, isActive: boolean) {
    return this.updateById<User>(tenantId, this.TABLE, id, { isActive }, this.ENTITY_NAME);
  }

  static async remove(tenantId: string, id: string) {
    await this.softDelete(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }
}
