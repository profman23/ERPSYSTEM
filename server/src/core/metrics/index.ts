/**
 * Platform Core Layer - Metrics Module
 * Phase 7: AGI Telemetry Layer
 */

export { metricsCollector } from './metricsCollector';
export { instrumentQuery, createQueryWrapper, QueryTimer } from './queryLogger';
export type {
  CacheMetrics,
  QueueMetricsData,
  PermissionMetrics,
  DatabaseMetrics,
  SlowQueryLog,
} from './types';
export { SLOW_QUERY_THRESHOLD_MS, METRICS_COLLECTION_INTERVAL_MS } from './types';
