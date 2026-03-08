/**
 * AGI Logs Service - Audit trail and logging for AI operations
 * Uses existing dpfAgiLogs schema
 */

import { db } from '../db';
import { dpfAgiLogs, users } from '../db/schemas';
import { eq, and, gte, lte, desc, like, or, count, sql } from 'drizzle-orm';
import type { AgiLog, AgiLogLevel, AgiLogQuery } from '../../../types/agi';

export class AgiLogsService {
  // ═══════════════════════════════════════════════════════════════
  // LOGGING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Log an AGI operation
   */
  static async log(data: {
    tenantId: string;
    userId?: string;
    operation: string;
    category?: string;
    status: 'SUCCESS' | 'FAILED' | 'REQUIRES_APPROVAL' | 'DENIED';
    inputCommand?: string;
    inputLanguage?: 'en' | 'ar';
    parsedIntent?: Record<string, unknown>;
    executedAction?: string;
    targetEntityType?: string;
    targetEntityId?: string;
    failureReason?: string;
    safetyChecksPassed?: boolean;
    safetyViolations?: string[];
    approvedBy?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const [result] = await db
      .insert(dpfAgiLogs)
      .values({
        tenantId: data.tenantId,
        userId: data.userId,
        agiOperation: data.operation,
        inputCommand: data.inputCommand,
        inputLanguage: data.inputLanguage,
        parsedIntent: data.parsedIntent,
        executedAction: data.executedAction,
        targetEntityType: data.targetEntityType,
        targetEntityId: data.targetEntityId,
        status: data.status,
        failureReason: data.failureReason,
        safetyChecksPassed: data.safetyChecksPassed !== undefined
          ? (data.safetyChecksPassed ? 'true' : 'false')
          : null,
        safetyViolations: data.safetyViolations,
        approvedBy: data.approvedBy,
        metadata: {
          category: data.category || 'GENERAL',
          ...data.metadata,
        },
      })
      .returning({ id: dpfAgiLogs.id });

    return result.id;
  }

  /**
   * Log a chat message
   */
  static async logChat(data: {
    tenantId: string;
    userId: string;
    inputCommand: string;
    inputLanguage: 'en' | 'ar';
    parsedIntent?: Record<string, unknown>;
    status: 'SUCCESS' | 'FAILED';
    failureReason?: string;
    processingTimeMs?: number;
    wasPatternMatched?: boolean;
    wasClaude?: boolean;
  }): Promise<string> {
    return this.log({
      tenantId: data.tenantId,
      userId: data.userId,
      operation: 'CHAT',
      category: 'CHAT',
      status: data.status,
      inputCommand: data.inputCommand,
      inputLanguage: data.inputLanguage,
      parsedIntent: data.parsedIntent,
      failureReason: data.failureReason,
      metadata: {
        processingTimeMs: data.processingTimeMs,
        wasPatternMatched: data.wasPatternMatched,
        wasClaude: data.wasClaude,
      },
    });
  }

  /**
   * Log an action execution
   */
  static async logAction(data: {
    tenantId: string;
    userId: string;
    action: string;
    targetType: string;
    targetId?: string;
    status: 'SUCCESS' | 'FAILED' | 'REQUIRES_APPROVAL' | 'DENIED';
    failureReason?: string;
    approvedBy?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    return this.log({
      tenantId: data.tenantId,
      userId: data.userId,
      operation: data.action,
      category: 'ACTION',
      status: data.status,
      executedAction: data.action,
      targetEntityType: data.targetType,
      targetEntityId: data.targetId,
      failureReason: data.failureReason,
      approvedBy: data.approvedBy,
      metadata: data.metadata,
    });
  }

  /**
   * Log an error
   */
  static async logError(data: {
    tenantId: string;
    userId?: string;
    operation: string;
    error: string;
    stack?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    return this.log({
      tenantId: data.tenantId,
      userId: data.userId,
      operation: data.operation,
      category: 'ERROR',
      status: 'FAILED',
      failureReason: data.error,
      metadata: {
        stack: data.stack,
        ...data.metadata,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERYING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get logs for a tenant with filtering
   */
  static async getLogs(
    tenantId: string,
    query?: {
      userId?: string;
      status?: string;
      category?: string;
      operation?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
    },
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: typeof dpfAgiLogs.$inferSelect[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions = [eq(dpfAgiLogs.tenantId, tenantId)];

    if (query?.userId) {
      conditions.push(eq(dpfAgiLogs.userId, query.userId));
    }
    if (query?.status) {
      conditions.push(eq(dpfAgiLogs.status, query.status));
    }
    if (query?.operation) {
      conditions.push(eq(dpfAgiLogs.agiOperation, query.operation));
    }
    if (query?.startDate) {
      conditions.push(gte(dpfAgiLogs.createdAt, query.startDate));
    }
    if (query?.endDate) {
      conditions.push(lte(dpfAgiLogs.createdAt, query.endDate));
    }
    if (query?.search) {
      conditions.push(or(
        like(dpfAgiLogs.inputCommand, `%${query.search}%`),
        like(dpfAgiLogs.agiOperation, `%${query.search}%`)
      )!);
    }

    const [logs, countResult] = await Promise.all([
      db
        .select()
        .from(dpfAgiLogs)
        .where(and(...conditions))
        .orderBy(desc(dpfAgiLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(dpfAgiLogs)
        .where(and(...conditions)),
    ]);

    return {
      data: logs,
      total: countResult[0]?.count || 0,
    };
  }

  /**
   * Get logs with user info (for display)
   */
  static async getLogsWithUsers(
    tenantId: string,
    query?: {
      userId?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 50
  ): Promise<{
    data: (typeof dpfAgiLogs.$inferSelect & { userName?: string })[];
    total: number;
  }> {
    const offset = (page - 1) * limit;
    const conditions = [eq(dpfAgiLogs.tenantId, tenantId)];

    if (query?.userId) {
      conditions.push(eq(dpfAgiLogs.userId, query.userId));
    }
    if (query?.status) {
      conditions.push(eq(dpfAgiLogs.status, query.status));
    }
    if (query?.startDate) {
      conditions.push(gte(dpfAgiLogs.createdAt, query.startDate));
    }
    if (query?.endDate) {
      conditions.push(lte(dpfAgiLogs.createdAt, query.endDate));
    }

    const [logs, countResult] = await Promise.all([
      db
        .select({
          log: dpfAgiLogs,
          userName: users.firstName,
        })
        .from(dpfAgiLogs)
        .leftJoin(users, eq(dpfAgiLogs.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(dpfAgiLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(dpfAgiLogs)
        .where(and(...conditions)),
    ]);

    return {
      data: logs.map(row => ({
        ...row.log,
        userName: row.userName || undefined,
      })),
      total: countResult[0]?.count || 0,
    };
  }

  /**
   * Get log by ID
   */
  static async getById(tenantId: string, logId: string): Promise<typeof dpfAgiLogs.$inferSelect | null> {
    const result = await db
      .select()
      .from(dpfAgiLogs)
      .where(and(
        eq(dpfAgiLogs.id, logId),
        eq(dpfAgiLogs.tenantId, tenantId)
      ))
      .limit(1);

    return result[0] || null;
  }

  // ═══════════════════════════════════════════════════════════════
  // SYSTEM-WIDE LOGS (For System Admins)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all logs across all tenants (system admin only)
   */
  static async getSystemLogs(
    query?: {
      tenantId?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 100
  ): Promise<{ data: typeof dpfAgiLogs.$inferSelect[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions: ReturnType<typeof eq>[] = [];

    if (query?.tenantId) {
      conditions.push(eq(dpfAgiLogs.tenantId, query.tenantId));
    }
    if (query?.status) {
      conditions.push(eq(dpfAgiLogs.status, query.status));
    }
    if (query?.startDate) {
      conditions.push(gte(dpfAgiLogs.createdAt, query.startDate));
    }
    if (query?.endDate) {
      conditions.push(lte(dpfAgiLogs.createdAt, query.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [logs, countResult] = await Promise.all([
      db
        .select()
        .from(dpfAgiLogs)
        .where(whereClause)
        .orderBy(desc(dpfAgiLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(dpfAgiLogs)
        .where(whereClause),
    ]);

    return {
      data: logs,
      total: countResult[0]?.count || 0,
    };
  }

  /**
   * Get log statistics for system monitoring
   */
  static async getSystemStats(startDate?: Date, endDate?: Date): Promise<{
    totalLogs: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    errorRate: number;
  }> {
    const conditions: ReturnType<typeof gte>[] = [];
    if (startDate) conditions.push(gte(dpfAgiLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(dpfAgiLogs.createdAt, endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total and status breakdown
    const statusBreakdown = await db
      .select({
        status: dpfAgiLogs.status,
        count: count(),
      })
      .from(dpfAgiLogs)
      .where(whereClause)
      .groupBy(dpfAgiLogs.status);

    const byStatus: Record<string, number> = {};
    let totalLogs = 0;
    let failedCount = 0;

    for (const row of statusBreakdown) {
      byStatus[row.status] = row.count;
      totalLogs += row.count;
      if (row.status === 'FAILED') {
        failedCount = row.count;
      }
    }

    return {
      totalLogs,
      byStatus,
      byCategory: {}, // Would need to parse metadata for this
      errorRate: totalLogs > 0 ? Math.round((failedCount / totalLogs) * 100) : 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════

  /**
   * Delete old logs (for scheduled cleanup)
   */
  static async cleanupOldLogs(retentionDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    await db
      .delete(dpfAgiLogs)
      .where(lte(dpfAgiLogs.createdAt, cutoffDate));
  }
}
