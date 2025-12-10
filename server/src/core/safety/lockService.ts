/**
 * Platform Core Layer - Distributed Lock Service
 * Phase 7: Redis-Based Distributed Locks for AGI Safety
 * 
 * Features:
 * - Redis SETNX-based distributed locks
 * - Automatic lock expiration
 * - Lock extension support
 * - Retry with exponential backoff
 * - Multi-tenant isolation
 * - AGI-safe concurrent operation protection
 */

import { getRedisClient } from '../../services/redisClient';
import { contextLogger } from '../context';
import { ulid } from 'ulid';
import {
  DistributedLock,
  LockOptions,
  LockResult,
  DEFAULT_LOCK_TTL,
  DEFAULT_LOCK_RETRY_COUNT,
  DEFAULT_LOCK_RETRY_DELAY,
} from './types';

class DistributedLockService {
  private readonly lockPrefix = 'dlock:';
  private readonly ownerId: string;
  private activeLocks: Map<string, DistributedLock> = new Map();

  constructor() {
    this.ownerId = `owner_${ulid()}`;
    this.startLockMonitor();
  }

  /**
   * Acquire a distributed lock
   */
  async acquire(key: string, options: LockOptions = {}): Promise<LockResult> {
    const {
      ttl = DEFAULT_LOCK_TTL,
      retryCount = DEFAULT_LOCK_RETRY_COUNT,
      retryDelay = DEFAULT_LOCK_RETRY_DELAY,
    } = options;

    const redis = getRedisClient();
    if (!redis) {
      contextLogger.warn('Redis not available, lock not acquired', { key });
      return { acquired: false };
    }

    const lockKey = `${this.lockPrefix}${key}`;
    const lockValue = JSON.stringify({
      owner: this.ownerId,
      acquiredAt: Date.now(),
      expiresAt: Date.now() + ttl,
    });

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await redis.set(lockKey, lockValue, 'PX', ttl, 'NX');
        
        if (result === 'OK') {
          const lock: DistributedLock = {
            key,
            owner: this.ownerId,
            acquiredAt: Date.now(),
            expiresAt: Date.now() + ttl,
            renewCount: 0,
          };

          this.activeLocks.set(key, lock);

          contextLogger.debug('Lock acquired', { key, owner: this.ownerId, ttl });
          
          return { acquired: true, lock };
        }

        const existingLock = await redis.get(lockKey);
        if (existingLock) {
          try {
            const parsed = JSON.parse(existingLock);
            if (attempt === retryCount) {
              return { acquired: false, existingOwner: parsed.owner };
            }
          } catch {
            // Lock value corrupted, continue retry
          }
        }

        if (attempt < retryCount) {
          const delay = retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      } catch (error) {
        contextLogger.error('Lock acquisition error', { key, error, attempt });
        
        if (attempt === retryCount) {
          return { acquired: false };
        }
      }
    }

    return { acquired: false };
  }

  /**
   * Release a distributed lock
   */
  async release(key: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
      this.activeLocks.delete(key);
      return true;
    }

    const lockKey = `${this.lockPrefix}${key}`;

    try {
      const existingLock = await redis.get(lockKey);
      if (!existingLock) {
        this.activeLocks.delete(key);
        return true;
      }

      const parsed = JSON.parse(existingLock);
      if (parsed.owner !== this.ownerId) {
        contextLogger.warn('Cannot release lock owned by another process', {
          key,
          owner: this.ownerId,
          lockOwner: parsed.owner,
        });
        return false;
      }

      await redis.del(lockKey);
      this.activeLocks.delete(key);

      contextLogger.debug('Lock released', { key, owner: this.ownerId });
      return true;
    } catch (error) {
      contextLogger.error('Lock release error', { key, error });
      return false;
    }
  }

  /**
   * Extend lock TTL
   */
  async extend(key: string, additionalTtl?: number): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    const lock = this.activeLocks.get(key);
    if (!lock) {
      contextLogger.warn('Cannot extend non-existent lock', { key });
      return false;
    }

    const lockKey = `${this.lockPrefix}${key}`;
    const ttl = additionalTtl || DEFAULT_LOCK_TTL;

    try {
      const existingLock = await redis.get(lockKey);
      if (!existingLock) {
        this.activeLocks.delete(key);
        return false;
      }

      const parsed = JSON.parse(existingLock);
      if (parsed.owner !== this.ownerId) {
        return false;
      }

      const newExpiry = Date.now() + ttl;
      const newValue = JSON.stringify({
        ...parsed,
        expiresAt: newExpiry,
      });

      await redis.set(lockKey, newValue, 'PX', ttl);
      
      lock.expiresAt = newExpiry;
      lock.renewCount++;

      contextLogger.debug('Lock extended', { key, newExpiry, renewCount: lock.renewCount });
      return true;
    } catch (error) {
      contextLogger.error('Lock extension error', { key, error });
      return false;
    }
  }

  /**
   * Check if lock is held by current owner
   */
  async isHeld(key: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return this.activeLocks.has(key);

    const lockKey = `${this.lockPrefix}${key}`;

    try {
      const existingLock = await redis.get(lockKey);
      if (!existingLock) return false;

      const parsed = JSON.parse(existingLock);
      return parsed.owner === this.ownerId;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute function with lock
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<{ success: boolean; result?: T; error?: Error }> {
    const lockResult = await this.acquire(key, options);
    
    if (!lockResult.acquired) {
      return {
        success: false,
        error: new Error(`Failed to acquire lock: ${key}`),
      };
    }

    try {
      const result = await fn();
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error as Error };
    } finally {
      await this.release(key);
    }
  }

  /**
   * Get current owner ID
   */
  getOwnerId(): string {
    return this.ownerId;
  }

  /**
   * Get all active locks for this instance
   */
  getActiveLocks(): DistributedLock[] {
    return Array.from(this.activeLocks.values());
  }

  /**
   * Release all locks held by this instance
   */
  async releaseAll(): Promise<void> {
    const keys = Array.from(this.activeLocks.keys());
    
    for (const key of keys) {
      await this.release(key);
    }

    contextLogger.info('All locks released', { count: keys.length });
  }

  private startLockMonitor(): void {
    setInterval(() => {
      const now = Date.now();
      
      for (const [key, lock] of this.activeLocks.entries()) {
        if (now > lock.expiresAt) {
          this.activeLocks.delete(key);
          contextLogger.debug('Expired lock removed from tracking', { key });
        }
      }
    }, 10 * 1000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const lockService = new DistributedLockService();
export default lockService;
