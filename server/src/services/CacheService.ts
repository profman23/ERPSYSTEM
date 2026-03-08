/**
 * Legacy CacheService - Adapter to AGI-Ready Tiered Cache
 *
 * This adapter preserves the original public API (get, set, del, invalidatePattern)
 * while delegating to the AGI-Ready cache (L1 in-memory + L2 Redis).
 * 13+ service files import from this module — the adapter avoids touching them all.
 *
 * For new code, prefer importing from '@/core/cache/cacheService' directly.
 */

import { cacheService as agiCache } from '../core/cache/cacheService';
import { getRedisClient } from './redisClient';
import logger from '../config/logger';

export class CacheService {
  private static instance: CacheService;

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get a value from the tiered cache (L1 → L2)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      return await agiCache.get<T>(key);
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in the tiered cache (L1 + L2)
   * @param ttl - Time-to-live in SECONDS (converted to ms for AGI cache)
   */
  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    try {
      await agiCache.set(key, value, {
        ttl: ttl ? ttl * 1000 : undefined,
      });
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a key from all cache layers
   */
  async del(key: string): Promise<boolean> {
    try {
      await agiCache.delete(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Invalidate all keys matching a glob pattern using SCAN (non-blocking).
   * Pattern invalidation cannot use tag-based approach, so we keep SCAN here.
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return 0;
      }

      let cursor = '0';
      let deletedCount = 0;

      do {
        const [nextCursor, keys] = await redis.scan(
          cursor, 'MATCH', pattern, 'COUNT', 100
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await redis.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      return deletedCount;
    } catch (error) {
      logger.error(`Cache invalidate pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await agiCache.get(key);
      return result !== null;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return -2;
      }
      return await redis.ttl(key);
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}:`, error);
      return -2;
    }
  }

  async getStats(): Promise<{ size: number; hitRatio: number; evictions: number } | null> {
    try {
      const stats = agiCache.getStats();
      return {
        size: stats.totalSize,
        hitRatio: stats.hitRatio,
        evictions: stats.evictions,
      };
    } catch (error) {
      logger.error('Cache getStats error:', error);
      return null;
    }
  }

  async flushAll(): Promise<boolean> {
    try {
      await agiCache.clear();
      return true;
    } catch (error) {
      logger.error('Cache flush all error:', error);
      return false;
    }
  }
}

export const cacheService = CacheService.getInstance();
