/**
 * AGI Usage Service - Track and analyze AI usage
 * Enterprise-grade with aggregation and analytics
 */

import { db } from '../db';
import { dpfAgiUsage, dpfAgiUsageDailyAggregates, users } from '../db/schemas';
import { eq, and, gte, lte, sql, count, sum, avg } from 'drizzle-orm';
import { cacheService } from './CacheService';
import type { AgiUsageStats, AgiAnalytics } from '../../../types/agi';

export class AgiUsageService {
  // ═══════════════════════════════════════════════════════════════
  // USAGE TRACKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Record a usage event
   */
  static async recordUsage(data: {
    tenantId: string;
    userId: string;
    requestType: 'CHAT' | 'VOICE' | 'ACTION';
    inputTokens: number;
    outputTokens: number;
    model: string;
    processingTimeMs: number;
    wasPatternMatched: boolean;
    wasClaude: boolean;
    pageContext?: string;
    moduleContext?: string;
    locale?: string;
    requestId?: string;
  }): Promise<void> {
    const totalTokens = data.inputTokens + data.outputTokens;

    // Calculate estimated cost (Claude pricing in cents)
    // Sonnet: $3/1M input, $15/1M output
    const inputCost = (data.inputTokens / 1_000_000) * 300; // cents
    const outputCost = (data.outputTokens / 1_000_000) * 1500; // cents
    const estimatedCostCents = Math.ceil(inputCost + outputCost);

    await db.insert(dpfAgiUsage).values({
      tenantId: data.tenantId,
      userId: data.userId,
      requestType: data.requestType,
      requestId: data.requestId,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens,
      model: data.model,
      processingTimeMs: data.processingTimeMs,
      wasPatternMatched: data.wasPatternMatched ? 'true' : 'false',
      wasClaude: data.wasClaude ? 'true' : 'false',
      estimatedCostCents,
      pageContext: data.pageContext,
      moduleContext: data.moduleContext,
      locale: data.locale || 'en',
    });

    // Invalidate usage stats cache
    await cacheService.del(`agi:usage:stats:${data.tenantId}`);

    // Update daily aggregate (fire and forget)
    this.updateDailyAggregate(data.tenantId, data).catch(console.error);
  }

  /**
   * Update daily aggregate for a tenant
   */
  private static async updateDailyAggregate(tenantId: string, data: {
    requestType: string;
    inputTokens: number;
    outputTokens: number;
    processingTimeMs: number;
    wasPatternMatched: boolean;
    wasClaude: boolean;
    userId: string;
  }): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Try to update existing aggregate
    const existing = await db
      .select()
      .from(dpfAgiUsageDailyAggregates)
      .where(and(
        eq(dpfAgiUsageDailyAggregates.tenantId, tenantId),
        eq(dpfAgiUsageDailyAggregates.dateKey, today)
      ))
      .limit(1);

    if (existing.length > 0) {
      const agg = existing[0];
      await db
        .update(dpfAgiUsageDailyAggregates)
        .set({
          totalRequests: agg.totalRequests + 1,
          chatRequests: agg.chatRequests + (data.requestType === 'CHAT' ? 1 : 0),
          voiceRequests: agg.voiceRequests + (data.requestType === 'VOICE' ? 1 : 0),
          actionRequests: agg.actionRequests + (data.requestType === 'ACTION' ? 1 : 0),
          totalInputTokens: agg.totalInputTokens + data.inputTokens,
          totalOutputTokens: agg.totalOutputTokens + data.outputTokens,
          totalTokens: agg.totalTokens + data.inputTokens + data.outputTokens,
          totalCostCents: agg.totalCostCents + Math.ceil((data.inputTokens / 1_000_000) * 300 + (data.outputTokens / 1_000_000) * 1500),
          avgProcessingTimeMs: Math.round((agg.avgProcessingTimeMs * agg.totalRequests + data.processingTimeMs) / (agg.totalRequests + 1)),
          patternMatchCount: agg.patternMatchCount + (data.wasPatternMatched ? 1 : 0),
          claudeCallCount: agg.claudeCallCount + (data.wasClaude ? 1 : 0),
          updatedAt: new Date(),
        })
        .where(eq(dpfAgiUsageDailyAggregates.id, agg.id));
    } else {
      // Create new aggregate
      await db.insert(dpfAgiUsageDailyAggregates).values({
        tenantId,
        dateKey: today,
        totalRequests: 1,
        chatRequests: data.requestType === 'CHAT' ? 1 : 0,
        voiceRequests: data.requestType === 'VOICE' ? 1 : 0,
        actionRequests: data.requestType === 'ACTION' ? 1 : 0,
        totalInputTokens: data.inputTokens,
        totalOutputTokens: data.outputTokens,
        totalTokens: data.inputTokens + data.outputTokens,
        totalCostCents: Math.ceil((data.inputTokens / 1_000_000) * 300 + (data.outputTokens / 1_000_000) * 1500),
        avgProcessingTimeMs: data.processingTimeMs,
        patternMatchCount: data.wasPatternMatched ? 1 : 0,
        claudeCallCount: data.wasClaude ? 1 : 0,
        uniqueUsers: 1,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // USAGE STATS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get usage stats for a tenant
   */
  static async getUsageStats(tenantId: string, dailyLimit: number = 0, monthlyLimit: number = 0): Promise<AgiUsageStats> {
    const cacheKey = `agi:usage:stats:${tenantId}`;
    const cached = await cacheService.get<AgiUsageStats>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get daily stats
    const dailyResult = await db
      .select({
        requests: count(),
        tokens: sum(dpfAgiUsage.totalTokens),
      })
      .from(dpfAgiUsage)
      .where(and(
        eq(dpfAgiUsage.tenantId, tenantId),
        gte(dpfAgiUsage.createdAt, todayStart)
      ));

    // Get monthly stats
    const monthlyResult = await db
      .select({
        requests: count(),
        tokens: sum(dpfAgiUsage.totalTokens),
        cost: sum(dpfAgiUsage.estimatedCostCents),
      })
      .from(dpfAgiUsage)
      .where(and(
        eq(dpfAgiUsage.tenantId, tenantId),
        gte(dpfAgiUsage.createdAt, monthStart)
      ));

    const dailyRequests = dailyResult[0]?.requests || 0;
    const dailyTokens = Number(dailyResult[0]?.tokens) || 0;
    const monthlyRequests = monthlyResult[0]?.requests || 0;
    const monthlyTokens = Number(monthlyResult[0]?.tokens) || 0;
    const monthlyCost = Number(monthlyResult[0]?.cost) || 0;

    const stats: AgiUsageStats = {
      dailyRequests,
      dailyTokens,
      monthlyRequests,
      monthlyTokens,
      dailyLimit,
      monthlyLimit,
      dailyUsagePercent: dailyLimit > 0 ? Math.round((dailyRequests / dailyLimit) * 100) : 0,
      monthlyUsagePercent: monthlyLimit > 0 ? Math.round((monthlyRequests / monthlyLimit) * 100) : 0,
      estimatedMonthlyCost: monthlyCost / 100, // Convert cents to dollars
    };

    await cacheService.set(cacheKey, stats, 60); // 1 minute cache
    return stats;
  }

  /**
   * Check if tenant has exceeded limits
   */
  static async hasExceededLimits(tenantId: string, dailyLimit: number, monthlyLimit: number): Promise<{ exceeded: boolean; reason?: string }> {
    const stats = await this.getUsageStats(tenantId, dailyLimit, monthlyLimit);

    if (dailyLimit > 0 && stats.dailyRequests >= dailyLimit) {
      return { exceeded: true, reason: 'Daily request limit exceeded' };
    }

    if (monthlyLimit > 0 && stats.monthlyRequests >= monthlyLimit) {
      return { exceeded: true, reason: 'Monthly request limit exceeded' };
    }

    return { exceeded: false };
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get detailed analytics for a tenant
   */
  static async getAnalytics(tenantId: string, startDate: Date, endDate: Date): Promise<AgiAnalytics> {
    // Get aggregated stats from daily aggregates for performance
    const aggregates = await db
      .select()
      .from(dpfAgiUsageDailyAggregates)
      .where(and(
        eq(dpfAgiUsageDailyAggregates.tenantId, tenantId),
        gte(dpfAgiUsageDailyAggregates.dateKey, startDate.toISOString().split('T')[0]),
        lte(dpfAgiUsageDailyAggregates.dateKey, endDate.toISOString().split('T')[0])
      ));

    // Calculate totals
    let totalRequests = 0;
    let totalTokens = 0;
    let totalCost = 0;
    let totalProcessingTime = 0;
    let patternMatchCount = 0;
    let claudeCallCount = 0;

    const requestsByDay: { date: string; count: number; tokens: number }[] = [];

    for (const agg of aggregates) {
      totalRequests += agg.totalRequests;
      totalTokens += agg.totalTokens;
      totalCost += agg.totalCostCents;
      totalProcessingTime += agg.avgProcessingTimeMs * agg.totalRequests;
      patternMatchCount += agg.patternMatchCount;
      claudeCallCount += agg.claudeCallCount;

      requestsByDay.push({
        date: agg.dateKey,
        count: agg.totalRequests,
        tokens: agg.totalTokens,
      });
    }

    // Get requests by type from raw data (for detailed breakdown)
    const typeBreakdown = await db
      .select({
        type: dpfAgiUsage.requestType,
        count: count(),
      })
      .from(dpfAgiUsage)
      .where(and(
        eq(dpfAgiUsage.tenantId, tenantId),
        gte(dpfAgiUsage.createdAt, startDate),
        lte(dpfAgiUsage.createdAt, endDate)
      ))
      .groupBy(dpfAgiUsage.requestType);

    const requestsByType: Record<string, number> = {};
    for (const row of typeBreakdown) {
      requestsByType[row.type] = row.count;
    }

    // Get top users
    const topUsers = await db
      .select({
        userId: dpfAgiUsage.userId,
        count: count(),
      })
      .from(dpfAgiUsage)
      .where(and(
        eq(dpfAgiUsage.tenantId, tenantId),
        gte(dpfAgiUsage.createdAt, startDate),
        lte(dpfAgiUsage.createdAt, endDate)
      ))
      .groupBy(dpfAgiUsage.userId)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    return {
      startDate,
      endDate,
      totalRequests,
      totalTokens,
      totalCost: totalCost / 100, // Convert cents to dollars
      requestsByType,
      requestsByUser: topUsers.map(u => ({ userId: u.userId, count: u.count })),
      requestsByDay: requestsByDay.sort((a, b) => a.date.localeCompare(b.date)),
      avgProcessingTimeMs: totalRequests > 0 ? Math.round(totalProcessingTime / totalRequests) : 0,
      patternMatchRate: totalRequests > 0 ? Math.round((patternMatchCount / totalRequests) * 100) : 0,
      claudeCallRate: totalRequests > 0 ? Math.round((claudeCallCount / totalRequests) * 100) : 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SYSTEM-WIDE MONITORING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get platform-wide usage stats (for system admins)
   */
  static async getSystemMonitoring(): Promise<{
    todayRequests: number;
    todayTokens: number;
    todayErrors: number;
    monthRequests: number;
    monthTokens: number;
    monthCost: number;
    topTenants: { tenantId: string; requests: number; tokens: number }[];
    avgResponseTimeMs: number;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's stats
    const todayResult = await db
      .select({
        requests: count(),
        tokens: sum(dpfAgiUsage.totalTokens),
        avgTime: avg(dpfAgiUsage.processingTimeMs),
      })
      .from(dpfAgiUsage)
      .where(gte(dpfAgiUsage.createdAt, todayStart));

    // Month stats
    const monthResult = await db
      .select({
        requests: count(),
        tokens: sum(dpfAgiUsage.totalTokens),
        cost: sum(dpfAgiUsage.estimatedCostCents),
      })
      .from(dpfAgiUsage)
      .where(gte(dpfAgiUsage.createdAt, monthStart));

    // Top tenants this month
    const topTenants = await db
      .select({
        tenantId: dpfAgiUsage.tenantId,
        requests: count(),
        tokens: sum(dpfAgiUsage.totalTokens),
      })
      .from(dpfAgiUsage)
      .where(gte(dpfAgiUsage.createdAt, monthStart))
      .groupBy(dpfAgiUsage.tenantId)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    return {
      todayRequests: todayResult[0]?.requests || 0,
      todayTokens: Number(todayResult[0]?.tokens) || 0,
      todayErrors: 0, // TODO: Implement error tracking
      monthRequests: monthResult[0]?.requests || 0,
      monthTokens: Number(monthResult[0]?.tokens) || 0,
      monthCost: (Number(monthResult[0]?.cost) || 0) / 100,
      topTenants: topTenants.map(t => ({
        tenantId: t.tenantId,
        requests: t.requests,
        tokens: Number(t.tokens) || 0,
      })),
      avgResponseTimeMs: Math.round(Number(todayResult[0]?.avgTime) || 0),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════

  /**
   * Clean up old usage records (call from scheduled job)
   */
  static async cleanupOldRecords(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await db
      .delete(dpfAgiUsage)
      .where(lte(dpfAgiUsage.createdAt, cutoffDate));

    // Note: Keep daily aggregates longer for historical analytics
    return 0; // Drizzle doesn't return affected rows count easily
  }
}
