/**
 * Platform Core Layer - Audit Service
 * Enterprise-grade audit logging with async writes and JSON diff
 */

import { db } from '../../db';
import { auditLogs } from '../../db/schemas';
import { eq, and, gte, lte, inArray, desc } from 'drizzle-orm';
import { ulid } from 'ulid';
import { RequestContext } from '../context';
import {
  AuditEntry,
  AuditLogInput,
  AuditAction,
  AuditSeverity,
  AuditQueryOptions,
  AuditStats,
} from './types';

const auditQueue: AuditEntry[] = [];
let flushTimer: NodeJS.Timeout | null = null;
const FLUSH_INTERVAL = 1000;
const MAX_QUEUE_SIZE = 100;

class AuditService {
  private isProcessing = false;

  constructor() {
    this.startFlushTimer();
  }

  /**
   * Log an audit entry (async, queued)
   */
  async log(input: AuditLogInput): Promise<void> {
    const context = RequestContext.get();
    
    const entry: AuditEntry = {
      id: `aud_${ulid()}`,
      tenantId: context?.tenantId ?? null,
      userId: context?.userId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      oldData: input.oldData ?? null,
      newData: input.newData ?? null,
      diff: this.calculateDiff(input.oldData, input.newData),
      severity: input.severity ?? this.determineSeverity(input.action),
      clientIp: context?.clientIp ?? null,
      userAgent: context?.userAgent ?? null,
      traceId: context?.traceId ?? null,
      correlationId: context?.correlationId ?? null,
      requestPath: context?.requestPath ?? null,
      requestMethod: context?.requestMethod ?? null,
      statusCode: input.statusCode ?? null,
      errorMessage: input.errorMessage ?? null,
      metadata: input.metadata ?? {},
      createdAt: new Date(),
    };

    auditQueue.push(entry);

    if (auditQueue.length >= MAX_QUEUE_SIZE) {
      await this.flush();
    }
  }

  /**
   * Log immediately (synchronous, for critical events)
   */
  async logImmediate(input: AuditLogInput): Promise<string> {
    const context = RequestContext.get();
    
    const entry: AuditEntry = {
      id: `aud_${ulid()}`,
      tenantId: context?.tenantId ?? null,
      userId: context?.userId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      oldData: input.oldData ?? null,
      newData: input.newData ?? null,
      diff: this.calculateDiff(input.oldData, input.newData),
      severity: input.severity ?? this.determineSeverity(input.action),
      clientIp: context?.clientIp ?? null,
      userAgent: context?.userAgent ?? null,
      traceId: context?.traceId ?? null,
      correlationId: context?.correlationId ?? null,
      requestPath: context?.requestPath ?? null,
      requestMethod: context?.requestMethod ?? null,
      statusCode: input.statusCode ?? null,
      errorMessage: input.errorMessage ?? null,
      metadata: input.metadata ?? {},
      createdAt: new Date(),
    };

    await this.writeEntry(entry);
    return entry.id!;
  }

  /**
   * Query audit logs
   */
  async query(options: AuditQueryOptions): Promise<AuditEntry[]> {
    const conditions = [];

    if (options.tenantId) {
      conditions.push(eq(auditLogs.tenantId, options.tenantId));
    }
    if (options.userId) {
      conditions.push(eq(auditLogs.userId, options.userId));
    }
    if (options.action) {
      if (Array.isArray(options.action)) {
        conditions.push(inArray(auditLogs.action, options.action));
      } else {
        conditions.push(eq(auditLogs.action, options.action));
      }
    }
    if (options.resourceType) {
      conditions.push(eq(auditLogs.resourceType, options.resourceType));
    }
    if (options.resourceId) {
      conditions.push(eq(auditLogs.resourceId, options.resourceId));
    }
    if (options.severity) {
      if (Array.isArray(options.severity)) {
        conditions.push(inArray(auditLogs.severity, options.severity));
      } else {
        conditions.push(eq(auditLogs.severity, options.severity));
      }
    }
    if (options.startDate) {
      conditions.push(gte(auditLogs.createdAt, options.startDate));
    }
    if (options.endDate) {
      conditions.push(lte(auditLogs.createdAt, options.endDate));
    }
    if (options.traceId) {
      conditions.push(eq(auditLogs.traceId, options.traceId));
    }

    const results = await db
      .select()
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(options.limit ?? 100)
      .offset(options.offset ?? 0);

    return results as AuditEntry[];
  }

  /**
   * Get audit trail for a specific resource
   */
  async getResourceTrail(
    resourceType: string,
    resourceId: string,
    limit: number = 50
  ): Promise<AuditEntry[]> {
    return this.query({
      resourceType,
      resourceId,
      limit,
    });
  }

  /**
   * Get user activity
   */
  async getUserActivity(
    userId: string,
    startDate?: Date,
    limit: number = 100
  ): Promise<AuditEntry[]> {
    return this.query({
      userId,
      startDate,
      limit,
    });
  }

  /**
   * Flush queued entries to database
   */
  async flush(): Promise<void> {
    if (this.isProcessing || auditQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const entries = auditQueue.splice(0, MAX_QUEUE_SIZE);

    try {
      await this.writeBatch(entries);
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      auditQueue.unshift(...entries);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Calculate diff between old and new data
   */
  private calculateDiff(
    oldData: Record<string, unknown> | null | undefined,
    newData: Record<string, unknown> | null | undefined
  ): Record<string, { old: unknown; new: unknown }> | null {
    if (!oldData && !newData) return null;
    if (!oldData) return null;
    if (!newData) return null;

    const diff: Record<string, { old: unknown; new: unknown }> = {};
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      const oldVal = oldData[key];
      const newVal = newData[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diff[key] = { old: oldVal, new: newVal };
      }
    }

    return Object.keys(diff).length > 0 ? diff : null;
  }

  /**
   * Determine severity based on action type
   */
  private determineSeverity(action: AuditAction): AuditSeverity {
    const highSeverity: AuditAction[] = [
      'delete',
      'permission_granted',
      'permission_revoked',
      'role_assigned',
      'role_revoked',
      'password_changed',
      'password_reset',
      'config_changed',
    ];

    const criticalSeverity: AuditAction[] = [
      'login_failed',
      'token_revoked',
      'bulk_operation',
    ];

    if (criticalSeverity.includes(action)) return 'critical';
    if (highSeverity.includes(action)) return 'high';
    if (action === 'read') return 'low';
    return 'medium';
  }

  /**
   * Write a single entry to database
   */
  private async writeEntry(entry: AuditEntry): Promise<void> {
    await db.insert(auditLogs).values({
      id: entry.id!,
      tenantId: entry.tenantId,
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      oldData: entry.oldData,
      newData: entry.newData,
      diff: entry.diff,
      severity: entry.severity,
      clientIp: entry.clientIp,
      userAgent: entry.userAgent,
      traceId: entry.traceId,
      correlationId: entry.correlationId,
      requestPath: entry.requestPath,
      requestMethod: entry.requestMethod,
      statusCode: entry.statusCode,
      errorMessage: entry.errorMessage,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
    });
  }

  /**
   * Write batch of entries to database
   */
  private async writeBatch(entries: AuditEntry[]): Promise<void> {
    if (entries.length === 0) return;

    await db.insert(auditLogs).values(
      entries.map((entry) => ({
        id: entry.id!,
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        oldData: entry.oldData,
        newData: entry.newData,
        diff: entry.diff,
        severity: entry.severity,
        clientIp: entry.clientIp,
        userAgent: entry.userAgent,
        traceId: entry.traceId,
        correlationId: entry.correlationId,
        requestPath: entry.requestPath,
        requestMethod: entry.requestMethod,
        statusCode: entry.statusCode,
        errorMessage: entry.errorMessage,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
      }))
    );
  }

  /**
   * Start the flush timer
   */
  private startFlushTimer(): void {
    if (flushTimer) return;
    
    flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, FLUSH_INTERVAL);
  }

  /**
   * Stop the flush timer and flush remaining entries
   */
  async shutdown(): Promise<void> {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    await this.flush();
  }
}

export const auditService = new AuditService();
export default auditService;
