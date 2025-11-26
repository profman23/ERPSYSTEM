/**
 * Platform Core Layer - Rate Limit Service
 * Redis-based multi-tier rate limiting with sliding window
 */

import { getRedisClient } from '../../services/redisClient';
import { RequestContext } from '../context';
import {
  RateLimitConfig,
  RateLimitResult,
  RateLimitType,
  DEFAULT_RATE_LIMITS,
} from './types';

class RateLimitService {
  private configs: Map<string, RateLimitConfig> = new Map();
  private localCache: Map<string, { count: number; resetAt: number }> = new Map();

  constructor() {
    Object.entries(DEFAULT_RATE_LIMITS).forEach(([key, config]) => {
      this.configs.set(key, config);
    });
  }

  /**
   * Register a custom rate limit configuration
   */
  registerConfig(name: string, config: RateLimitConfig): void {
    this.configs.set(name, config);
  }

  /**
   * Check rate limit using sliding window algorithm
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const redis = getRedisClient();

    if (!redis) {
      return this.checkLimitLocal(key, config);
    }

    try {
      const now = Date.now();
      const windowStart = now - config.windowMs;
      const redisKey = `ratelimit:${config.type}:${key}`;

      await redis.zremrangebyscore(redisKey, '-inf', windowStart.toString());

      const count = await redis.zcard(redisKey);

      if (count >= config.maxRequests) {
        const oldestTimestamp = await redis.zrange(redisKey, 0, 0, 'WITHSCORES');
        const resetAt = oldestTimestamp.length >= 2
          ? parseInt(oldestTimestamp[1]) + config.windowMs
          : now + config.windowMs;

        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(resetAt),
          retryAfter: Math.ceil((resetAt - now) / 1000),
          limit: config.maxRequests,
          current: count,
        };
      }

      await redis.zadd(redisKey, now.toString(), `${now}:${Math.random()}`);
      await redis.expire(redisKey, Math.ceil(config.windowMs / 1000) + 1);

      return {
        allowed: true,
        remaining: config.maxRequests - count - 1,
        resetAt: new Date(now + config.windowMs),
        limit: config.maxRequests,
        current: count + 1,
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return this.checkLimitLocal(key, config);
    }
  }

  /**
   * Local fallback when Redis is unavailable
   */
  private checkLimitLocal(
    key: string,
    config: RateLimitConfig
  ): RateLimitResult {
    const now = Date.now();
    const cacheKey = `${config.type}:${key}`;
    const cached = this.localCache.get(cacheKey);

    if (cached && cached.resetAt > now) {
      if (cached.count >= config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(cached.resetAt),
          retryAfter: Math.ceil((cached.resetAt - now) / 1000),
          limit: config.maxRequests,
          current: cached.count,
        };
      }

      cached.count++;
      return {
        allowed: true,
        remaining: config.maxRequests - cached.count,
        resetAt: new Date(cached.resetAt),
        limit: config.maxRequests,
        current: cached.count,
      };
    }

    this.localCache.set(cacheKey, {
      count: 1,
      resetAt: now + config.windowMs,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now + config.windowMs),
      limit: config.maxRequests,
      current: 1,
    };
  }

  /**
   * Check tenant rate limit
   */
  async checkTenantLimit(tenantId: string): Promise<RateLimitResult> {
    const config = this.configs.get('tenant')!;
    return this.checkLimit(tenantId, config);
  }

  /**
   * Check user rate limit
   */
  async checkUserLimit(userId: string): Promise<RateLimitResult> {
    const config = this.configs.get('user')!;
    return this.checkLimit(userId, config);
  }

  /**
   * Check IP rate limit
   */
  async checkIpLimit(ip: string): Promise<RateLimitResult> {
    const config = this.configs.get('ip')!;
    return this.checkLimit(ip, config);
  }

  /**
   * Check combined limits (tenant + user + IP)
   */
  async checkAllLimits(): Promise<{
    allowed: boolean;
    limitedBy?: RateLimitType;
    results: Record<RateLimitType, RateLimitResult | null>;
  }> {
    const context = RequestContext.get();
    const results: Record<RateLimitType, RateLimitResult | null> = {
      tenant: null,
      user: null,
      ip: null,
      endpoint: null,
      global: null,
    };

    if (context?.tenantId) {
      results.tenant = await this.checkTenantLimit(context.tenantId);
      if (!results.tenant.allowed) {
        return { allowed: false, limitedBy: 'tenant', results };
      }
    }

    if (context?.userId) {
      results.user = await this.checkUserLimit(context.userId);
      if (!results.user.allowed) {
        return { allowed: false, limitedBy: 'user', results };
      }
    }

    if (context?.clientIp) {
      results.ip = await this.checkIpLimit(context.clientIp);
      if (!results.ip.allowed) {
        return { allowed: false, limitedBy: 'ip', results };
      }
    }

    return { allowed: true, results };
  }

  /**
   * Get current usage for a key
   */
  async getUsage(
    type: RateLimitType,
    key: string
  ): Promise<{ current: number; limit: number; resetAt: Date }> {
    const redis = getRedisClient();
    const config = this.configs.get(type);

    if (!config) {
      throw new Error(`Unknown rate limit type: ${type}`);
    }

    const redisKey = `ratelimit:${type}:${key}`;

    if (!redis) {
      const cached = this.localCache.get(`${type}:${key}`);
      return {
        current: cached?.count || 0,
        limit: config.maxRequests,
        resetAt: new Date(cached?.resetAt || Date.now() + config.windowMs),
      };
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;

    await redis.zremrangebyscore(redisKey, '-inf', windowStart.toString());
    const count = await redis.zcard(redisKey);

    return {
      current: count,
      limit: config.maxRequests,
      resetAt: new Date(now + config.windowMs),
    };
  }

  /**
   * Reset rate limit for a key (admin operation)
   */
  async resetLimit(type: RateLimitType, key: string): Promise<void> {
    const redis = getRedisClient();
    const redisKey = `ratelimit:${type}:${key}`;

    if (redis) {
      await redis.del(redisKey);
    }

    this.localCache.delete(`${type}:${key}`);
  }

  /**
   * Clear local cache (for testing)
   */
  clearLocalCache(): void {
    this.localCache.clear();
  }
}

export const rateLimitService = new RateLimitService();
export default rateLimitService;
