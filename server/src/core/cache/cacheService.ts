/**
 * Platform Core Layer - Tiered Cache Service
 * L1 (in-memory) -> L2 (Redis) -> L3 (DB query cache)
 */

import { getRedisClient } from '../../services/redisClient';
import { RequestContext } from '../context';
import {
  CacheOptions,
  CacheEntry,
  CacheStats,
  CacheConfig,
  DEFAULT_CACHE_CONFIG,
  CacheLayer,
} from './types';

class TieredCacheService {
  private l1Cache: Map<string, CacheEntry<unknown>> = new Map();
  private config: CacheConfig;
  private stats: CacheStats = {
    l1Hits: 0,
    l1Misses: 0,
    l2Hits: 0,
    l2Misses: 0,
    l3Hits: 0,
    l3Misses: 0,
    totalSize: 0,
    evictions: 0,
  };
  private pendingRevalidations: Set<string> = new Set();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.startCleanupInterval();
  }

  /**
   * Get value from cache (checks all layers)
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const scopedKey = this.getScopedKey(key, options);

    const l1Result = this.getFromL1<T>(scopedKey);
    if (l1Result !== null) {
      this.stats.l1Hits++;
      return l1Result;
    }
    this.stats.l1Misses++;

    const l2Result = await this.getFromL2<T>(scopedKey);
    if (l2Result !== null) {
      this.stats.l2Hits++;
      this.setToL1(scopedKey, l2Result, options);
      return l2Result;
    }
    this.stats.l2Misses++;

    return null;
  }

  /**
   * Get or set value with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Set value to cache (all layers)
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const scopedKey = this.getScopedKey(key, options);

    this.setToL1(scopedKey, value, options);
    await this.setToL2(scopedKey, value, options);
  }

  /**
   * Delete from all cache layers
   */
  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    const scopedKey = this.getScopedKey(key, options);

    this.l1Cache.delete(scopedKey);

    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.del(scopedKey);
      } catch (error) {
        console.error('L2 cache delete error:', error);
      }
    }
  }

  /**
   * Invalidate by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let invalidated = 0;

    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.l1Cache.delete(key);
        invalidated++;
      }
    }

    const redis = getRedisClient();
    if (redis) {
      try {
        for (const tag of tags) {
          const keys = await redis.smembers(`cache:tag:${tag}`);
          if (keys.length > 0) {
            await redis.del(...keys);
            await redis.del(`cache:tag:${tag}`);
            invalidated += keys.length;
          }
        }
      } catch (error) {
        console.error('Tag invalidation error:', error);
      }
    }

    return invalidated;
  }

  /**
   * Invalidate by tenant
   */
  async invalidateByTenant(tenantId: string): Promise<number> {
    let invalidated = 0;

    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.tenantId === tenantId) {
        this.l1Cache.delete(key);
        invalidated++;
      }
    }

    const redis = getRedisClient();
    if (redis) {
      try {
        const pattern = `cache:tenant:${tenantId}:*`;
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          invalidated += keys.length;
        }
      } catch (error) {
        console.error('Tenant invalidation error:', error);
      }
    }

    return invalidated;
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();

    const redis = getRedisClient();
    if (redis) {
      try {
        const keys = await redis.keys('cache:*');
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (error) {
        console.error('Cache clear error:', error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      totalSize: this.l1Cache.size,
    };
  }

  /**
   * Stale-while-revalidate pattern
   */
  async getStale<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const scopedKey = this.getScopedKey(key, options);
    const entry = this.l1Cache.get(scopedKey) as CacheEntry<T> | undefined;

    if (entry) {
      const now = Date.now();

      if (now < entry.expiresAt) {
        return entry.data;
      }

      if (entry.staleAt && now < entry.staleAt) {
        if (!this.pendingRevalidations.has(scopedKey)) {
          this.pendingRevalidations.add(scopedKey);
          this.revalidate(key, factory, options).finally(() => {
            this.pendingRevalidations.delete(scopedKey);
          });
        }
        return entry.data;
      }
    }

    return this.getOrSet(key, factory, options);
  }

  private async revalidate<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions
  ): Promise<void> {
    try {
      const value = await factory();
      await this.set(key, value, options);
    } catch (error) {
      console.error('Revalidation failed:', error);
    }
  }

  private getFromL1<T>(key: string): T | null {
    const entry = this.l1Cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.l1Cache.delete(key);
      return null;
    }

    entry.hitCount++;
    return entry.data;
  }

  private setToL1<T>(key: string, value: T, options: CacheOptions): void {
    if (this.l1Cache.size >= this.config.l1MaxSize) {
      this.evictL1();
    }

    const now = Date.now();
    const ttl = options.ttl || this.config.l1DefaultTtl;

    const entry: CacheEntry<T> = {
      data: value,
      createdAt: now,
      expiresAt: now + ttl,
      staleAt: options.staleWhileRevalidate
        ? now + ttl + (options.staleTime || ttl)
        : undefined,
      tags: options.tags || [],
      tenantId: options.tenantScoped ? RequestContext.getTenantId() : null,
      hitCount: 0,
    };

    this.l1Cache.set(key, entry);
  }

  private async getFromL2<T>(key: string): Promise<T | null> {
    const redis = getRedisClient();
    if (!redis) return null;

    try {
      const data = await redis.get(`cache:${key}`);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('L2 cache get error:', error);
      return null;
    }
  }

  private async setToL2<T>(key: string, value: T, options: CacheOptions): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      const ttl = options.ttl || this.config.l2DefaultTtl;
      const ttlSeconds = Math.ceil(ttl / 1000);

      await redis.setex(`cache:${key}`, ttlSeconds, JSON.stringify(value));

      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          await redis.sadd(`cache:tag:${tag}`, `cache:${key}`);
          await redis.expire(`cache:tag:${tag}`, ttlSeconds * 2);
        }
      }
    } catch (error) {
      console.error('L2 cache set error:', error);
    }
  }

  private evictL1(): void {
    let oldest: { key: string; createdAt: number } | null = null;

    for (const [key, entry] of this.l1Cache.entries()) {
      if (!oldest || entry.createdAt < oldest.createdAt) {
        oldest = { key, createdAt: entry.createdAt };
      }
    }

    if (oldest) {
      this.l1Cache.delete(oldest.key);
      this.stats.evictions++;
    }
  }

  private getScopedKey(key: string, options: CacheOptions): string {
    if (options.tenantScoped) {
      const tenantId = RequestContext.getTenantId();
      return tenantId ? `tenant:${tenantId}:${key}` : key;
    }
    return key;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.l1Cache.entries()) {
        if (now > entry.expiresAt && (!entry.staleAt || now > entry.staleAt)) {
          this.l1Cache.delete(key);
        }
      }
    }, 60 * 1000);
  }
}

export const cacheService = new TieredCacheService();
export default cacheService;
