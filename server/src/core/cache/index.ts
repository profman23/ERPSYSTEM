/**
 * Platform Core Layer - Cache Module
 */

export { cacheService } from './cacheService';
export type {
  CacheLayer,
  CacheTTL,
  CacheOptions,
  CacheEntry,
  CacheStats,
  CacheConfig,
} from './types';
export { DEFAULT_CACHE_CONFIG, CACHE_KEYS, CACHE_TAGS } from './types';
