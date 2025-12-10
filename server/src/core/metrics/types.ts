/**
 * Platform Core Layer - Prometheus Metrics Types
 * Phase 7: AGI Telemetry Layer
 */

export interface CacheMetrics {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  l3Hits: number;
  l3Misses: number;
  hitRatio: number;
  evictions: number;
  size: number;
}

export interface QueueMetricsData {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  processingTimeAvg: number;
  processingTimeP95: number;
  processingTimeP99: number;
  throughput: number;
  errorRate: number;
}

export interface PermissionMetrics {
  checksTotal: number;
  checksAllowed: number;
  checksDenied: number;
  checkDurationAvg: number;
  cacheHitRatio: number;
}

export interface DatabaseMetrics {
  queryCount: number;
  slowQueryCount: number;
  avgQueryDuration: number;
  p95QueryDuration: number;
  connectionPoolActive: number;
  connectionPoolIdle: number;
  connectionPoolTotal: number;
}

export interface SlowQueryLog {
  query: string;
  duration: number;
  timestamp: number;
  tenantId?: string;
  userId?: string;
  traceId?: string;
}

export const SLOW_QUERY_THRESHOLD_MS = 100;
export const METRICS_COLLECTION_INTERVAL_MS = 10000;
