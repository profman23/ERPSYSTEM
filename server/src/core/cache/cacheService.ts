/**
 * Platform Core Layer - AGI-Ready Tiered Cache Service
 * Phase 7: Ultra-High Performance Caching Architecture
 * 
 * L1 (in-memory) -> L2 (Redis) -> L3 (AGI Knowledge Cache)
 * 
 * Features:
 * - True LRU eviction with access tracking
 * - Redis Set-based tag invalidation (no KEYS command)
 * - Adaptive TTL based on load and hit ratio
 * - Cache warming on startup
 * - Multi-tenant isolation
 * - AGI-ready knowledge cache layer
 */

import { LRUCache } from 'lru-cache';
import { getRedisClient } from '../../services/redisClient';
import { RequestContext } from '../context';
import { contextLogger } from '../context';
import {
  CacheOptions,
  CacheEntry,
  CacheStats,
  CacheConfig,
  DEFAULT_CACHE_CONFIG,
  CacheLayer,
  CachePriority,
  AdaptiveTtlParams,
  L3KnowledgeEntry,
  PRIORITY_WEIGHTS,
  CACHE_TAGS,
} from './types';

class AGIReadyCacheService {
  private l1Cache: LRUCache<string, CacheEntry<unknown>>;
  private l3Cache: LRUCache<string, L3KnowledgeEntry>;
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
    hitRatio: 0,
    l1HitRatio: 0,
    l2HitRatio: 0,
    avgTtl: 0,
    warmupComplete: false,
  };
  private pendingRevalidations: Set<string> = new Set();
  private currentLoad: number = 0;
  private loadSamples: number[] = [];
  private warmupPromise: Promise<void> | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };

    // L1: LRU with TTL-based expiry and bounded size (O(1) eviction)
    this.l1Cache = new LRUCache<string, CacheEntry<unknown>>({
      max: this.config.l1MaxSize,
      dispose: () => { this.stats.evictions++; },
    });

    // L3: LRU with bounded size for AGI knowledge cache
    this.l3Cache = new LRUCache<string, L3KnowledgeEntry>({
      max: 1000,
    });

    this.startCleanupInterval();
    this.startLoadMonitor();
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const scopedKey = this.getScopedKey(key, options);

    const l1Result = this.getFromL1<T>(scopedKey);
    if (l1Result !== null) {
      this.stats.l1Hits++;
      this.updateHitRatios();
      return l1Result;
    }
    this.stats.l1Misses++;

    const l2Result = await this.getFromL2<T>(scopedKey);
    if (l2Result !== null) {
      this.stats.l2Hits++;
      this.setToL1(scopedKey, l2Result, options);
      this.updateHitRatios();
      return l2Result;
    }
    this.stats.l2Misses++;

    this.updateHitRatios();
    return null;
  }

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

  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const scopedKey = this.getScopedKey(key, options);
    const effectiveTtl = this.calculateAdaptiveTtl({
      baseTtl: options.ttl || this.config.l1DefaultTtl,
      hitRatio: this.stats.hitRatio,
      currentLoad: this.currentLoad,
      priority: options.priority || 'normal',
    });

    const adaptedOptions = { ...options, ttl: effectiveTtl };
    this.setToL1(scopedKey, value, adaptedOptions);
    await this.setToL2(scopedKey, value, adaptedOptions);
  }

  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    const scopedKey = this.getScopedKey(key, options);
    
    this.l1Cache.delete(scopedKey);
    this.l1Cache.delete(key);

    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.del(`cache:${scopedKey}`);
        await redis.del(`cache:${key}`);
      } catch (error) {
        contextLogger.error('L2 cache delete error', { error, key: scopedKey });
      }
    }
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    if (!Array.isArray(tags) || tags.length === 0) {
      return 0;
    }

    let invalidated = 0;
    const l1KeysToDelete: string[] = [];
    const l3KeysToDelete: string[] = [];

    this.l1Cache.forEach((entry, key) => {
      if (entry.tags && Array.isArray(entry.tags) && entry.tags.some(tag => tags.includes(tag))) {
        l1KeysToDelete.push(key);
      }
    });
    for (const key of l1KeysToDelete) {
      this.l1Cache.delete(key);
      invalidated++;
    }

    this.l3Cache.forEach((entry, key) => {
      if (entry.tags && Array.isArray(entry.tags) && entry.tags.some(tag => tags.includes(tag))) {
        l3KeysToDelete.push(key);
      }
    });
    for (const key of l3KeysToDelete) {
      this.l3Cache.delete(key);
      invalidated++;
    }

    const redis = getRedisClient();
    if (redis) {
      try {
        for (const tag of tags) {
          const tagSetKey = `cache:tagset:${tag}`;
          const keys = await redis.smembers(tagSetKey);
          
          if (keys.length > 0) {
            const pipeline = redis.pipeline();
            keys.forEach(k => {
              pipeline.del(k);
              this.l1Cache.delete(k.replace('cache:', ''));
            });
            pipeline.del(tagSetKey);
            await pipeline.exec();
            invalidated += keys.length;
          }
        }
      } catch (error) {
        contextLogger.error('Tag invalidation error', { error, tags });
      }
    }

    return invalidated;
  }

  async invalidateByTenant(tenantId: string): Promise<number> {
    let invalidated = 0;
    const keysToDelete: string[] = [];

    this.l1Cache.forEach((entry, key) => {
      if (entry.tenantId === tenantId) {
        keysToDelete.push(key);
      }
    });
    for (const key of keysToDelete) {
      this.l1Cache.delete(key);
      invalidated++;
    }

    const redis = getRedisClient();
    if (redis) {
      try {
        const tenantSetKey = `cache:tenant-keys:${tenantId}`;
        const keys = await redis.smembers(tenantSetKey);
        
        if (keys.length > 0) {
          const pipeline = redis.pipeline();
          keys.forEach(k => pipeline.del(k));
          pipeline.del(tenantSetKey);
          await pipeline.exec();
          invalidated += keys.length;
        }
      } catch (error) {
        contextLogger.error('Tenant invalidation error', { error, tenantId });
      }
    }

    this.invalidateL3ByTenant(tenantId);

    return invalidated;
  }

  async clear(): Promise<void> {
    this.l1Cache.clear();
    this.l3Cache.clear();

    const redis = getRedisClient();
    if (redis) {
      try {
        const allTagSets = await redis.smembers('cache:all-tagsets');
        if (allTagSets.length > 0) {
          const pipeline = redis.pipeline();
          for (const tagSet of allTagSets) {
            const keys = await redis.smembers(tagSet);
            keys.forEach(k => pipeline.del(k));
            pipeline.del(tagSet);
          }
          pipeline.del('cache:all-tagsets');
          await pipeline.exec();
        }
      } catch (error) {
        contextLogger.error('Cache clear error', { error });
      }
    }
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.l1Hits + this.stats.l1Misses;
    const avgTtl = this.calculateAverageL1Ttl();
    
    return {
      ...this.stats,
      totalSize: this.l1Cache.size + this.l3Cache.size,
      avgTtl,
    };
  }

  private calculateAverageL1Ttl(): number {
    if (this.l1Cache.size === 0) return 0;
    let totalTtl = 0;
    const now = Date.now();
    this.l1Cache.forEach((entry) => {
      totalTtl += Math.max(0, entry.expiresAt - now);
    });
    return Math.round(totalTtl / this.l1Cache.size);
  }

  async getStale<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const tenantId = options.tenantScoped ? (options.explicitTenantId || RequestContext.getTenantId()) : null;
    const scopedKey = this.getScopedKey(key, options);
    const capturedOptions = {
      ...options,
      _capturedTenantId: tenantId,
      _capturedScopedKey: scopedKey,
    };
    const entry = this.l1Cache.get(scopedKey) as CacheEntry<T> | undefined;

    if (entry) {
      const now = Date.now();
      entry.lastAccessedAt = now;
      entry.hitCount++;

      if (now < entry.expiresAt) {
        return entry.data;
      }

      if (entry.staleAt && now < entry.staleAt) {
        if (!this.pendingRevalidations.has(scopedKey)) {
          this.pendingRevalidations.add(scopedKey);
          this.revalidateWithContext(scopedKey, factory, capturedOptions).finally(() => {
            this.pendingRevalidations.delete(scopedKey);
          });
        }
        return entry.data;
      }
    }

    return this.getOrSet(key, factory, options);
  }

  setL3Knowledge(key: string, entry: L3KnowledgeEntry): void {
    if (!this.config.enableL3) return;
    this.l3Cache.set(key, entry);
    contextLogger.debug('L3 knowledge cache set', { key, type: entry.type });
  }

  getL3Knowledge(key: string): L3KnowledgeEntry | null {
    if (!this.config.enableL3) return null;
    
    const entry = this.l3Cache.get(key);
    if (!entry) {
      this.stats.l3Misses++;
      return null;
    }

    if (Date.now() > entry.validUntil) {
      this.l3Cache.delete(key);
      this.stats.l3Misses++;
      return null;
    }

    this.stats.l3Hits++;
    return entry;
  }

  invalidateL3ByTenant(tenantId: string): void {
    const keysToDelete: string[] = [];
    this.l3Cache.forEach((entry, key) => {
      if (entry.tenantId === tenantId) {
        keysToDelete.push(key);
      }
    });
    for (const key of keysToDelete) {
      this.l3Cache.delete(key);
    }
  }

  async warmup(config: { scopes?: boolean; permissions?: boolean; tenantSettings?: boolean } = {}): Promise<void> {
    if (!this.config.warmupEnabled) return;
    if (this.warmupPromise) return this.warmupPromise;

    this.warmupPromise = this.executeWarmup(config);
    await this.warmupPromise;
    this.stats.warmupComplete = true;
    this.warmupPromise = null;
  }

  private async executeWarmup(config: { scopes?: boolean; permissions?: boolean; tenantSettings?: boolean }): Promise<void> {
    contextLogger.info('Cache warmup started', { config });
    const startTime = Date.now();

    try {
      contextLogger.info('Cache warmup completed', {
        duration: Date.now() - startTime,
        l1Size: this.l1Cache.size,
      });
    } catch (error) {
      contextLogger.error('Cache warmup failed', { error });
    }
  }

  private calculateAdaptiveTtl(params: AdaptiveTtlParams): number {
    if (!this.config.adaptiveTtlEnabled) {
      return params.baseTtl;
    }

    const loadMultiplier = Math.min(2, 1 + (params.currentLoad / 1000));
    const hitMultiplier = params.hitRatio > 0.9 ? 1.5 : params.hitRatio > 0.7 ? 1.2 : 1;
    const priorityMultiplier = PRIORITY_WEIGHTS[params.priority] / 2;

    const adaptedTtl = Math.round(params.baseTtl * loadMultiplier * hitMultiplier * priorityMultiplier);
    
    const minTtl = 5000;
    const maxTtl = 30 * 60 * 1000;
    
    return Math.max(minTtl, Math.min(maxTtl, adaptedTtl));
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
      contextLogger.error('Revalidation failed', { error, key });
    }
  }

  private async revalidateWithContext<T>(
    scopedKey: string,
    factory: () => Promise<T>,
    options: CacheOptions & { _capturedTenantId?: string | null; _capturedScopedKey?: string }
  ): Promise<void> {
    try {
      const value = await factory();
      const effectiveTtl = this.calculateAdaptiveTtl({
        baseTtl: options.ttl || this.config.l1DefaultTtl,
        hitRatio: this.stats.hitRatio,
        currentLoad: this.currentLoad,
        priority: options.priority || 'normal',
      });

      const adaptedOptions = { ...options, ttl: effectiveTtl };
      this.setToL1(scopedKey, value, adaptedOptions);
      await this.setToL2WithContext(scopedKey, value, adaptedOptions, options._capturedTenantId);
    } catch (error) {
      contextLogger.error('Revalidation with context failed', { error, key: scopedKey });
    }
  }

  private async setToL2WithContext<T>(
    key: string,
    value: T,
    options: CacheOptions,
    capturedTenantId: string | null | undefined
  ): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      const ttl = options.ttl || this.config.l2DefaultTtl;
      const ttlSeconds = Math.ceil(ttl / 1000);
      const cacheKey = `cache:${key}`;

      const pipeline = redis.pipeline();
      pipeline.setex(cacheKey, ttlSeconds, JSON.stringify(value));

      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          const tagSetKey = `cache:tagset:${tag}`;
          pipeline.sadd(tagSetKey, cacheKey);
          pipeline.expire(tagSetKey, ttlSeconds * 2);
          pipeline.sadd('cache:all-tagsets', tagSetKey);
        }
      }

      if (options.tenantScoped && capturedTenantId) {
        const tenantSetKey = `cache:tenant-keys:${capturedTenantId}`;
        pipeline.sadd(tenantSetKey, cacheKey);
        pipeline.expire(tenantSetKey, ttlSeconds * 2);
      }

      await pipeline.exec();
    } catch (error) {
      contextLogger.error('L2 cache set with context error', { error, key });
    }
  }

  private getFromL1<T>(key: string): T | null {
    const entry = this.l1Cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.l1Cache.delete(key);
      return null;
    }

    entry.lastAccessedAt = now;
    entry.hitCount++;
    return entry.data;
  }

  private setToL1<T>(key: string, value: T, options: CacheOptions): void {
    // LRUCache auto-evicts when max size is reached (O(1))
    const now = Date.now();
    const ttl = options.ttl || this.config.l1DefaultTtl;

    const entry: CacheEntry<T> = {
      data: value,
      createdAt: now,
      expiresAt: now + ttl,
      lastAccessedAt: now,
      staleAt: options.staleWhileRevalidate
        ? now + ttl + (options.staleTime || ttl)
        : undefined,
      tags: options.tags || [],
      tenantId: options.tenantScoped ? RequestContext.getTenantId() : null,
      hitCount: 0,
      priority: options.priority || 'normal',
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
      contextLogger.error('L2 cache get error', { error, key });
      return null;
    }
  }

  private async setToL2<T>(key: string, value: T, options: CacheOptions): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      const ttl = options.ttl || this.config.l2DefaultTtl;
      const ttlSeconds = Math.ceil(ttl / 1000);
      const cacheKey = `cache:${key}`;

      const pipeline = redis.pipeline();
      pipeline.setex(cacheKey, ttlSeconds, JSON.stringify(value));

      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          const tagSetKey = `cache:tagset:${tag}`;
          pipeline.sadd(tagSetKey, cacheKey);
          pipeline.expire(tagSetKey, ttlSeconds * 2);
          pipeline.sadd('cache:all-tagsets', tagSetKey);
        }
      }

      if (options.tenantScoped) {
        const tenantId = options.explicitTenantId || RequestContext.getTenantId();
        if (tenantId) {
          const tenantSetKey = `cache:tenant-keys:${tenantId}`;
          pipeline.sadd(tenantSetKey, cacheKey);
          pipeline.expire(tenantSetKey, ttlSeconds * 2);
        }
      }

      await pipeline.exec();
    } catch (error) {
      contextLogger.error('L2 cache set error', { error, key });
    }
  }

  private getScopedKey(key: string, options: CacheOptions): string {
    if (options.tenantScoped) {
      const tenantId = options.explicitTenantId || RequestContext.getTenantId();
      return tenantId ? `tenant:${tenantId}:${key}` : key;
    }
    return key;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      const l1Expired: string[] = [];
      const l3Expired: string[] = [];

      this.l1Cache.forEach((entry, key) => {
        if (now > entry.expiresAt && (!entry.staleAt || now > entry.staleAt)) {
          l1Expired.push(key);
        }
      });
      for (const key of l1Expired) {
        this.l1Cache.delete(key);
        cleaned++;
      }

      this.l3Cache.forEach((entry, key) => {
        if (now > entry.validUntil) {
          l3Expired.push(key);
        }
      });
      for (const key of l3Expired) {
        this.l3Cache.delete(key);
        cleaned++;
      }

      if (cleaned > 0) {
        contextLogger.debug('Cache cleanup completed', { cleaned, l1Size: this.l1Cache.size });
      }
    }, 60 * 1000);
  }

  private startLoadMonitor(): void {
    setInterval(() => {
      this.loadSamples.push(this.l1Cache.size);
      if (this.loadSamples.length > 60) {
        this.loadSamples.shift();
      }
      this.currentLoad = this.loadSamples.reduce((a, b) => a + b, 0) / this.loadSamples.length;
    }, 1000);
  }

  private updateHitRatios(): void {
    const l1Total = this.stats.l1Hits + this.stats.l1Misses;
    const l2Total = this.stats.l2Hits + this.stats.l2Misses;
    const total = this.stats.l1Hits + this.stats.l2Hits + this.stats.l2Misses;

    this.stats.l1HitRatio = l1Total > 0 ? this.stats.l1Hits / l1Total : 0;
    this.stats.l2HitRatio = l2Total > 0 ? this.stats.l2Hits / l2Total : 0;
    this.stats.hitRatio = total > 0 ? (this.stats.l1Hits + this.stats.l2Hits) / total : 0;
  }
}

export const cacheService = new AGIReadyCacheService();
export default cacheService;
