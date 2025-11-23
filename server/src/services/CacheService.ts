import { getRedisClient } from './redisClient';

export class CacheService {
  private static instance: CacheService;

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return null;
      }

      const value = await redis.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return false;
      }

      const serialized = JSON.stringify(value);

      if (ttl) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }

      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return false;
      }

      await redis.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return 0;
      }

      const keys = await redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      await redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error(`Cache invalidate pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return false;
      }

      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
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
      console.error(`Cache TTL error for key ${key}:`, error);
      return -2;
    }
  }

  async flushAll(): Promise<boolean> {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return false;
      }

      await redis.flushall();
      return true;
    } catch (error) {
      console.error('Cache flush all error:', error);
      return false;
    }
  }
}

export const cacheService = CacheService.getInstance();
