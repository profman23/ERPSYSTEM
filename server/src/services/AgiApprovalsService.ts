/**
 * AGI Approvals Service - Manage approval workflow for AI actions
 * Enterprise-grade with audit trail and notifications
 */

import { db } from '../db';
import { dpfAgiApprovals, users } from '../db/schemas';
import { eq, and, lte, desc, sql, count } from 'drizzle-orm';
import { cacheService } from './CacheService';
import type { AgiApproval, AgiAction, CreateApprovalInput, ApprovalStatus } from '../../../types/agi';

const DEFAULT_EXPIRY_MINUTES = 60;

export class AgiApprovalsService {
  // ═══════════════════════════════════════════════════════════════
  // CREATE & GET APPROVALS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new approval request
   */
  static async createApproval(
    tenantId: string,
    userId: string,
    input: CreateApprovalInput
  ): Promise<AgiApproval> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (input.expiresInMinutes || DEFAULT_EXPIRY_MINUTES));

    const [result] = await db
      .insert(dpfAgiApprovals)
      .values({
        tenantId,
        userId,
        actionType: input.action.type,
        actionTarget: input.action.target,
        actionParams: input.action.params || {},
        actionDescription: input.action.description,
        actionDescriptionAr: input.action.descriptionAr,
        riskLevel: input.action.riskLevel,
        isDestructive: input.action.isDestructive ? 'true' : 'false',
        originalMessage: input.originalMessage,
        detectedLanguage: 'en', // Will be set by caller
        status: 'PENDING',
        expiresAt,
      })
      .returning();

    // Invalidate pending count cache
    await cacheService.del(`agi:approvals:pending:${tenantId}`);

    return this.mapToApproval(result);
  }

  /**
   * Get approval by ID
   */
  static async getById(tenantId: string, approvalId: string): Promise<AgiApproval | null> {
    const result = await db
      .select()
      .from(dpfAgiApprovals)
      .where(and(
        eq(dpfAgiApprovals.id, approvalId),
        eq(dpfAgiApprovals.tenantId, tenantId)
      ))
      .limit(1);

    if (result.length === 0) return null;
    return this.mapToApproval(result[0]);
  }

  /**
   * Get pending approvals for a tenant
   */
  static async getPendingApprovals(
    tenantId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: AgiApproval[]; total: number }> {
    const offset = (page - 1) * limit;
    const now = new Date();

    // First, expire any old pending approvals
    await this.expireOldApprovals(tenantId);

    // Get pending approvals
    const [approvals, countResult] = await Promise.all([
      db
        .select()
        .from(dpfAgiApprovals)
        .where(and(
          eq(dpfAgiApprovals.tenantId, tenantId),
          eq(dpfAgiApprovals.status, 'PENDING')
        ))
        .orderBy(desc(dpfAgiApprovals.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(dpfAgiApprovals)
        .where(and(
          eq(dpfAgiApprovals.tenantId, tenantId),
          eq(dpfAgiApprovals.status, 'PENDING')
        )),
    ]);

    return {
      data: approvals.map(a => this.mapToApproval(a)),
      total: countResult[0]?.count || 0,
    };
  }

  /**
   * Get pending approval count for a tenant (for notifications)
   */
  static async getPendingCount(tenantId: string): Promise<number> {
    const cacheKey = `agi:approvals:pending:${tenantId}`;
    const cached = await cacheService.get<number>(cacheKey);
    if (cached !== null) return cached;

    const result = await db
      .select({ count: count() })
      .from(dpfAgiApprovals)
      .where(and(
        eq(dpfAgiApprovals.tenantId, tenantId),
        eq(dpfAgiApprovals.status, 'PENDING')
      ));

    const pendingCount = result[0]?.count || 0;
    await cacheService.set(cacheKey, pendingCount, 60); // 1 minute cache
    return pendingCount;
  }

  /**
   * Get approvals for a user (their own requests)
   */
  static async getUserApprovals(
    tenantId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: AgiApproval[]; total: number }> {
    const offset = (page - 1) * limit;

    const [approvals, countResult] = await Promise.all([
      db
        .select()
        .from(dpfAgiApprovals)
        .where(and(
          eq(dpfAgiApprovals.tenantId, tenantId),
          eq(dpfAgiApprovals.userId, userId)
        ))
        .orderBy(desc(dpfAgiApprovals.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(dpfAgiApprovals)
        .where(and(
          eq(dpfAgiApprovals.tenantId, tenantId),
          eq(dpfAgiApprovals.userId, userId)
        )),
    ]);

    return {
      data: approvals.map(a => this.mapToApproval(a)),
      total: countResult[0]?.count || 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // APPROVE & REJECT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Approve an approval request
   */
  static async approve(
    tenantId: string,
    approvalId: string,
    approvedBy: string
  ): Promise<AgiApproval> {
    // Get the approval
    const approval = await this.getById(tenantId, approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    if (approval.status !== 'PENDING') {
      throw new Error(`Cannot approve: status is ${approval.status}`);
    }

    // Check if expired
    if (new Date() > approval.expiresAt) {
      await this.updateStatus(approvalId, 'EXPIRED');
      throw new Error('Approval has expired');
    }

    // Update status
    const [result] = await db
      .update(dpfAgiApprovals)
      .set({
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(dpfAgiApprovals.id, approvalId))
      .returning();

    // Invalidate cache
    await cacheService.del(`agi:approvals:pending:${tenantId}`);

    return this.mapToApproval(result);
  }

  /**
   * Reject an approval request
   */
  static async reject(
    tenantId: string,
    approvalId: string,
    rejectedBy: string,
    reason?: string
  ): Promise<AgiApproval> {
    // Get the approval
    const approval = await this.getById(tenantId, approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    if (approval.status !== 'PENDING') {
      throw new Error(`Cannot reject: status is ${approval.status}`);
    }

    // Update status
    const [result] = await db
      .update(dpfAgiApprovals)
      .set({
        status: 'REJECTED',
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(dpfAgiApprovals.id, approvalId))
      .returning();

    // Invalidate cache
    await cacheService.del(`agi:approvals:pending:${tenantId}`);

    return this.mapToApproval(result);
  }

  /**
   * Mark approval as executed
   */
  static async markExecuted(
    approvalId: string,
    result?: Record<string, unknown>,
    error?: string
  ): Promise<void> {
    await db
      .update(dpfAgiApprovals)
      .set({
        status: error ? 'REJECTED' : 'EXECUTED',
        executedAt: new Date(),
        executionResult: result || {},
        executionError: error,
        updatedAt: new Date(),
      })
      .where(eq(dpfAgiApprovals.id, approvalId));
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Expire old pending approvals
   */
  private static async expireOldApprovals(tenantId: string): Promise<void> {
    const now = new Date();

    await db
      .update(dpfAgiApprovals)
      .set({
        status: 'EXPIRED',
        updatedAt: new Date(),
      })
      .where(and(
        eq(dpfAgiApprovals.tenantId, tenantId),
        eq(dpfAgiApprovals.status, 'PENDING'),
        lte(dpfAgiApprovals.expiresAt, now)
      ));
  }

  /**
   * Update approval status
   */
  private static async updateStatus(approvalId: string, status: ApprovalStatus): Promise<void> {
    await db
      .update(dpfAgiApprovals)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(dpfAgiApprovals.id, approvalId));
  }

  /**
   * Map database record to AgiApproval type
   */
  private static mapToApproval(record: typeof dpfAgiApprovals.$inferSelect): AgiApproval {
    return {
      id: record.id,
      tenantId: record.tenantId,
      userId: record.userId,
      action: {
        type: record.actionType as AgiAction['type'],
        target: record.actionTarget,
        params: record.actionParams as Record<string, unknown> | undefined,
        description: record.actionDescription,
        descriptionAr: record.actionDescriptionAr || undefined,
        isDestructive: record.isDestructive === 'true',
        requiresApproval: true,
        riskLevel: record.riskLevel as AgiAction['riskLevel'],
      },
      originalMessage: record.originalMessage,
      status: record.status as ApprovalStatus,
      approvedBy: record.approvedBy,
      approvedAt: record.approvedAt || undefined,
      rejectedBy: record.rejectedBy,
      rejectedAt: record.rejectedAt || undefined,
      rejectionReason: record.rejectionReason || undefined,
      executedAt: record.executedAt || undefined,
      executionResult: record.executionResult as Record<string, unknown> | undefined,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // HISTORY & AUDIT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get approval history for a tenant
   */
  static async getHistory(
    tenantId: string,
    filters?: {
      status?: ApprovalStatus;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: AgiApproval[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions = [eq(dpfAgiApprovals.tenantId, tenantId)];

    if (filters?.status) {
      conditions.push(eq(dpfAgiApprovals.status, filters.status));
    }
    if (filters?.userId) {
      conditions.push(eq(dpfAgiApprovals.userId, filters.userId));
    }

    const [approvals, countResult] = await Promise.all([
      db
        .select()
        .from(dpfAgiApprovals)
        .where(and(...conditions))
        .orderBy(desc(dpfAgiApprovals.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(dpfAgiApprovals)
        .where(and(...conditions)),
    ]);

    return {
      data: approvals.map(a => this.mapToApproval(a)),
      total: countResult[0]?.count || 0,
    };
  }
}
