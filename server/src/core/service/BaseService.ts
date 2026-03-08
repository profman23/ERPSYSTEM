/**
 * BaseService - Standardized service layer with automatic tenant isolation.
 *
 * CRITICAL DESIGN RULE:
 *   Services NEVER read from AsyncLocalStorage directly.
 *   tenantId is ALWAYS passed explicitly from the controller.
 *   This prevents context leaks and makes services testable.
 *
 * Usage:
 *
 *   class AppointmentService extends BaseService {
 *     static async list(tenantId: string, params: ListParams) {
 *       const { items, total } = await this.findMany(tenantId, appointments, {
 *         page: params.page,
 *         limit: params.limit,
 *         search: params.search,
 *         searchColumns: [appointments.title, appointments.notes],
 *         sortBy: appointments.scheduledAt,
 *         sortOrder: 'desc',
 *         filters: [eq(appointments.status, 'scheduled')],
 *       });
 *       return { items, total, page: params.page, limit: params.limit };
 *     }
 *
 *     static async create(tenantId: string, input: CreateInput) {
 *       return this.insertOne(tenantId, appointments, input);
 *     }
 *
 *     static async getById(tenantId: string, id: string) {
 *       return this.findById(tenantId, appointments, id);
 *     }
 *
 *     static async update(tenantId: string, id: string, input: UpdateInput) {
 *       return this.updateById(tenantId, appointments, id, input);
 *     }
 *   }
 */

import { db } from '../../db';
import { eq, and, or, ilike, sql, asc, desc, SQL } from 'drizzle-orm';
import { PgTableWithColumns } from 'drizzle-orm/pg-core';
import { NotFoundError } from '../errors';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FindManyOptions {
  page?: number;
  limit?: number;
  search?: string;
  searchColumns?: any[];
  sortBy?: any;
  sortOrder?: 'asc' | 'desc';
  filters?: SQL[];
  select?: Record<string, any>;
}

interface FindManyResult<T> {
  items: T[];
  total: number;
}

// ─── BaseService ────────────────────────────────────────────────────────────

export class BaseService {
  /**
   * Find many records with automatic tenant filtering, pagination, search, and sorting.
   */
  protected static async findMany<T = any>(
    tenantId: string,
    table: PgTableWithColumns<any>,
    options: FindManyOptions = {},
  ): Promise<FindManyResult<T>> {
    const {
      page = 1,
      limit = 20,
      search,
      searchColumns = [],
      sortBy,
      sortOrder = 'desc',
      filters = [],
    } = options;

    const offset = (page - 1) * limit;

    // Build WHERE conditions - tenant isolation is ALWAYS first
    const conditions: SQL[] = [eq((table as any).tenantId, tenantId)];

    // Add search conditions
    if (search && searchColumns.length > 0) {
      const pattern = `%${search}%`;
      const searchConditions = searchColumns.map((col) => ilike(col, pattern));
      if (searchConditions.length === 1) {
        conditions.push(searchConditions[0]);
      } else {
        conditions.push(or(...searchConditions) as SQL);
      }
    }

    // Add custom filters
    conditions.push(...filters);

    const where = and(...conditions);

    // Count query
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(table)
      .where(where);

    // Data query
    const orderByCol = sortBy || (table as any).createdAt;
    const orderByDir = sortOrder === 'asc' ? asc(orderByCol) : desc(orderByCol);

    const items = await db
      .select()
      .from(table)
      .where(where)
      .orderBy(orderByDir)
      .limit(Math.min(limit, 100)) // Hard cap at 100
      .offset(offset) as T[];

    return { items, total: Number(total) };
  }

  /**
   * Find a single record by ID with tenant isolation.
   * Throws NotFoundError if not found.
   */
  protected static async findById<T = any>(
    tenantId: string,
    table: PgTableWithColumns<any>,
    id: string,
    entityName = 'Record',
  ): Promise<T> {
    const results = await db
      .select()
      .from(table)
      .where(and(eq((table as any).tenantId, tenantId), eq((table as any).id, id)))
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundError(entityName, id);
    }

    return results[0] as T;
  }

  /**
   * Find a single record by ID (nullable - returns null instead of throwing).
   */
  protected static async findByIdOrNull<T = any>(
    tenantId: string,
    table: PgTableWithColumns<any>,
    id: string,
  ): Promise<T | null> {
    const results = await db
      .select()
      .from(table)
      .where(and(eq((table as any).tenantId, tenantId), eq((table as any).id, id)))
      .limit(1);

    return (results[0] as T) ?? null;
  }

  /**
   * Insert a record with automatic tenantId injection.
   */
  protected static async insertOne<T = any>(
    tenantId: string,
    table: PgTableWithColumns<any>,
    data: Record<string, any>,
  ): Promise<T> {
    const [result] = await db
      .insert(table)
      .values({ ...data, tenantId })
      .returning();

    return result as T;
  }

  /**
   * Update a record by ID with tenant isolation.
   * Throws NotFoundError if not found.
   */
  protected static async updateById<T = any>(
    tenantId: string,
    table: PgTableWithColumns<any>,
    id: string,
    data: Record<string, any>,
    entityName = 'Record',
  ): Promise<T> {
    const results = await db
      .update(table)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq((table as any).tenantId, tenantId), eq((table as any).id, id)))
      .returning();

    if (results.length === 0) {
      throw new NotFoundError(entityName, id);
    }

    return results[0] as T;
  }

  /**
   * Soft-delete: set isActive to false (no actual deletion).
   * Throws NotFoundError if not found.
   */
  protected static async softDelete(
    tenantId: string,
    table: PgTableWithColumns<any>,
    id: string,
    entityName = 'Record',
  ): Promise<void> {
    const results = await db
      .update(table)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq((table as any).tenantId, tenantId), eq((table as any).id, id)))
      .returning({ id: (table as any).id });

    if (results.length === 0) {
      throw new NotFoundError(entityName, id);
    }
  }

  /**
   * Check if a record exists (for uniqueness validation, etc.)
   */
  protected static async exists(
    tenantId: string,
    table: PgTableWithColumns<any>,
    conditions: SQL,
  ): Promise<boolean> {
    const results = await db
      .select({ id: (table as any).id })
      .from(table)
      .where(and(eq((table as any).tenantId, tenantId), conditions))
      .limit(1);

    return results.length > 0;
  }

  /**
   * Count records matching conditions.
   */
  protected static async count(
    tenantId: string,
    table: PgTableWithColumns<any>,
    conditions?: SQL,
  ): Promise<number> {
    const where = conditions
      ? and(eq((table as any).tenantId, tenantId), conditions)
      : eq((table as any).tenantId, tenantId);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(table)
      .where(where);

    return Number(count);
  }

  /**
   * Run operations in a database transaction.
   *
   * Usage:
   *   const result = await this.transaction(async (tx) => {
   *     const appointment = await tx.insert(appointments).values({...}).returning();
   *     await tx.insert(auditLogs).values({...});
   *     return appointment;
   *   });
   */
  protected static async transaction<T>(
    fn: (tx: typeof db) => Promise<T>,
  ): Promise<T> {
    return db.transaction(fn as any) as Promise<T>;
  }

  /**
   * Access the raw db instance for complex queries.
   * Use this for joins, subqueries, aggregations, etc.
   */
  protected static get db() {
    return db;
  }
}
