/**
 * Platform Core Layer - Prometheus Metrics Collector
 * Phase 7: AGI Telemetry Layer
 * 
 * Collects and exposes metrics for:
 * - Cache (L1/L2/L3 hit ratios, evictions)
 * - Queue (depth, processing time, throughput)
 * - Permissions (checks/sec, cache hits)
 * - Database (slow queries, connection pool)
 */

import { cacheService } from '../cache';
import { queueService } from '../queue';
import { contextLogger } from '../context';
import {
  CacheMetrics,
  QueueMetricsData,
  PermissionMetrics,
  DatabaseMetrics,
  SlowQueryLog,
  SLOW_QUERY_THRESHOLD_MS,
  METRICS_COLLECTION_INTERVAL_MS,
} from './types';

class MetricsCollector {
  private permissionMetrics: PermissionMetrics = {
    checksTotal: 0,
    checksAllowed: 0,
    checksDenied: 0,
    checkDurationAvg: 0,
    cacheHitRatio: 0,
  };

  private databaseMetrics: DatabaseMetrics = {
    queryCount: 0,
    slowQueryCount: 0,
    avgQueryDuration: 0,
    p95QueryDuration: 0,
    connectionPoolActive: 0,
    connectionPoolIdle: 0,
    connectionPoolTotal: 0,
  };

  private slowQueryLogs: SlowQueryLog[] = [];
  private queryDurations: number[] = [];
  private permissionCheckDurations: number[] = [];
  private permissionCacheHits = 0;
  private permissionCacheMisses = 0;

  constructor() {
    this.startCollection();
  }

  getCacheMetrics(): CacheMetrics {
    const stats = cacheService.getStats();
    return {
      l1Hits: stats.l1Hits,
      l1Misses: stats.l1Misses,
      l2Hits: stats.l2Hits,
      l2Misses: stats.l2Misses,
      l3Hits: stats.l3Hits,
      l3Misses: stats.l3Misses,
      hitRatio: stats.hitRatio,
      evictions: stats.evictions,
      size: stats.totalSize,
    };
  }

  async getQueueMetrics(): Promise<QueueMetricsData[]> {
    try {
      const metrics = await queueService.getAllMetrics();
      return metrics.map(m => ({
        queueName: m.queueName,
        waiting: m.waiting,
        active: m.active,
        completed: m.completed,
        failed: m.failed,
        delayed: m.delayed,
        processingTimeAvg: m.processingTime.avg,
        processingTimeP95: m.processingTime.p95,
        processingTimeP99: m.processingTime.p99,
        throughput: m.throughput,
        errorRate: m.errorRate,
      }));
    } catch (error) {
      contextLogger.error('Failed to get queue metrics', { error });
      return [];
    }
  }

  getPermissionMetrics(): PermissionMetrics {
    const totalCacheOps = this.permissionCacheHits + this.permissionCacheMisses;
    return {
      ...this.permissionMetrics,
      cacheHitRatio: totalCacheOps > 0 ? this.permissionCacheHits / totalCacheOps : 0,
      checkDurationAvg: this.calculateAverage(this.permissionCheckDurations),
    };
  }

  getDatabaseMetrics(): DatabaseMetrics {
    const sortedDurations = [...this.queryDurations].sort((a, b) => a - b);
    return {
      ...this.databaseMetrics,
      avgQueryDuration: this.calculateAverage(this.queryDurations),
      p95QueryDuration: sortedDurations[Math.floor(sortedDurations.length * 0.95)] || 0,
    };
  }

  getSlowQueries(limit = 100): SlowQueryLog[] {
    return this.slowQueryLogs.slice(-limit);
  }

  recordPermissionCheck(allowed: boolean, durationMs: number, cached: boolean): void {
    this.permissionMetrics.checksTotal++;
    if (allowed) {
      this.permissionMetrics.checksAllowed++;
    } else {
      this.permissionMetrics.checksDenied++;
    }

    this.permissionCheckDurations.push(durationMs);
    if (this.permissionCheckDurations.length > 1000) {
      this.permissionCheckDurations.shift();
    }

    if (cached) {
      this.permissionCacheHits++;
    } else {
      this.permissionCacheMisses++;
    }
  }

  recordQuery(name: string, durationMs: number, context?: { tenantId?: string; userId?: string; traceId?: string }): void {
    this.databaseMetrics.queryCount++;
    this.queryDurations.push(durationMs);
    
    if (this.queryDurations.length > 10000) {
      this.queryDurations.shift();
    }

    if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
      this.databaseMetrics.slowQueryCount++;
      this.slowQueryLogs.push({
        query: name,
        duration: durationMs,
        timestamp: Date.now(),
        ...context,
      });

      if (this.slowQueryLogs.length > 1000) {
        this.slowQueryLogs.shift();
      }

      contextLogger.warn('Slow query detected', {
        query: name,
        duration: durationMs,
        threshold: SLOW_QUERY_THRESHOLD_MS,
        ...context,
      });
    }
  }

  updateConnectionPoolMetrics(active: number, idle: number, total: number): void {
    this.databaseMetrics.connectionPoolActive = active;
    this.databaseMetrics.connectionPoolIdle = idle;
    this.databaseMetrics.connectionPoolTotal = total;
  }

  async getAllMetrics(): Promise<{
    cache: CacheMetrics;
    queues: QueueMetricsData[];
    permissions: PermissionMetrics;
    database: DatabaseMetrics;
    timestamp: number;
  }> {
    return {
      cache: this.getCacheMetrics(),
      queues: await this.getQueueMetrics(),
      permissions: this.getPermissionMetrics(),
      database: this.getDatabaseMetrics(),
      timestamp: Date.now(),
    };
  }

  exportPrometheusFormat(): string {
    const lines: string[] = [];
    const cache = this.getCacheMetrics();
    const permissions = this.getPermissionMetrics();
    const database = this.getDatabaseMetrics();

    lines.push('# HELP cache_hits_total Total cache hits by layer');
    lines.push('# TYPE cache_hits_total counter');
    lines.push(`cache_hits_total{layer="l1"} ${cache.l1Hits}`);
    lines.push(`cache_hits_total{layer="l2"} ${cache.l2Hits}`);
    lines.push(`cache_hits_total{layer="l3"} ${cache.l3Hits}`);

    lines.push('# HELP cache_misses_total Total cache misses by layer');
    lines.push('# TYPE cache_misses_total counter');
    lines.push(`cache_misses_total{layer="l1"} ${cache.l1Misses}`);
    lines.push(`cache_misses_total{layer="l2"} ${cache.l2Misses}`);
    lines.push(`cache_misses_total{layer="l3"} ${cache.l3Misses}`);

    lines.push('# HELP cache_hit_ratio Current cache hit ratio');
    lines.push('# TYPE cache_hit_ratio gauge');
    lines.push(`cache_hit_ratio ${cache.hitRatio.toFixed(4)}`);

    lines.push('# HELP cache_evictions_total Total cache evictions');
    lines.push('# TYPE cache_evictions_total counter');
    lines.push(`cache_evictions_total ${cache.evictions}`);

    lines.push('# HELP cache_size Current cache size');
    lines.push('# TYPE cache_size gauge');
    lines.push(`cache_size ${cache.size}`);

    lines.push('# HELP permission_checks_total Total permission checks');
    lines.push('# TYPE permission_checks_total counter');
    lines.push(`permission_checks_total{result="allowed"} ${permissions.checksAllowed}`);
    lines.push(`permission_checks_total{result="denied"} ${permissions.checksDenied}`);

    lines.push('# HELP permission_check_duration_avg Average permission check duration');
    lines.push('# TYPE permission_check_duration_avg gauge');
    lines.push(`permission_check_duration_avg ${permissions.checkDurationAvg.toFixed(2)}`);

    lines.push('# HELP permission_cache_hit_ratio Permission cache hit ratio');
    lines.push('# TYPE permission_cache_hit_ratio gauge');
    lines.push(`permission_cache_hit_ratio ${permissions.cacheHitRatio.toFixed(4)}`);

    lines.push('# HELP db_queries_total Total database queries');
    lines.push('# TYPE db_queries_total counter');
    lines.push(`db_queries_total ${database.queryCount}`);

    lines.push('# HELP db_slow_queries_total Total slow database queries');
    lines.push('# TYPE db_slow_queries_total counter');
    lines.push(`db_slow_queries_total ${database.slowQueryCount}`);

    lines.push('# HELP db_query_duration_avg Average query duration');
    lines.push('# TYPE db_query_duration_avg gauge');
    lines.push(`db_query_duration_avg ${database.avgQueryDuration.toFixed(2)}`);

    lines.push('# HELP db_query_duration_p95 95th percentile query duration');
    lines.push('# TYPE db_query_duration_p95 gauge');
    lines.push(`db_query_duration_p95 ${database.p95QueryDuration.toFixed(2)}`);

    lines.push('# HELP db_connection_pool Connection pool status');
    lines.push('# TYPE db_connection_pool gauge');
    lines.push(`db_connection_pool{status="active"} ${database.connectionPoolActive}`);
    lines.push(`db_connection_pool{status="idle"} ${database.connectionPoolIdle}`);
    lines.push(`db_connection_pool{status="total"} ${database.connectionPoolTotal}`);

    return lines.join('\n');
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private startCollection(): void {
    setInterval(() => {
      contextLogger.debug('Metrics collection cycle', {
        cacheSize: cacheService.getStats().totalSize,
        hitRatio: cacheService.getStats().hitRatio,
        queryCount: this.databaseMetrics.queryCount,
        slowQueryCount: this.databaseMetrics.slowQueryCount,
      });
    }, METRICS_COLLECTION_INTERVAL_MS);
  }
}

export const metricsCollector = new MetricsCollector();
export default metricsCollector;
