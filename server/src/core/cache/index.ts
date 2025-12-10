/**
 * Platform Core Layer - AGI-Ready Cache Module
 * Phase 7: Ultra-High Performance Caching Architecture
 */

export { cacheService } from './cacheService';
export type {
  CacheLayer,
  CacheTTL,
  CachePriority,
  CacheOptions,
  CacheEntry,
  CacheStats,
  CacheConfig,
  AdaptiveTtlParams,
  CacheWarmupConfig,
  L3KnowledgeEntry,
} from './types';
export {
  DEFAULT_CACHE_CONFIG,
  CACHE_KEYS,
  CACHE_TAGS,
  PRIORITY_WEIGHTS,
} from './types';
