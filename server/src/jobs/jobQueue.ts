/**
 * Background Job Queue Service
 *
 * Redis-backed job processing for 3000+ tenant environments
 * Handles async tasks like bulk operations, cache warmup, and notifications
 *
 * Features:
 * - Reliable job processing with retries
 * - Priority queues
 * - Job progress tracking
 * - Tenant-aware processing
 */

import { getRedisClient } from '../services/redisClient';
import logger from '../config/logger';
import { cacheInvalidationService } from '../services/cacheInvalidationService';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type JobType =
  | 'cache-warmup'
  | 'permission-sync'
  | 'bulk-user-create'
  | 'bulk-role-assign'
  | 'notification-send'
  | 'audit-cleanup'
  | 'tenant-setup';

export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

export interface Job<T = unknown> {
  id: string;
  type: JobType;
  data: T;
  priority: JobPriority;
  status: JobStatus;
  tenantId?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
  error?: string;
  result?: unknown;
}

export interface JobOptions {
  priority?: JobPriority;
  maxAttempts?: number;
  delay?: number; // milliseconds
  tenantId?: string;
}

// ═══════════════════════════════════════════════════════════════
// JOB HANDLERS
// ═══════════════════════════════════════════════════════════════

type JobHandler<T = unknown> = (job: Job<T>) => Promise<unknown>;

const jobHandlers: Map<JobType, JobHandler> = new Map();

/**
 * Register a job handler
 */
export function registerJobHandler<T>(type: JobType, handler: JobHandler<T>): void {
  jobHandlers.set(type, handler as JobHandler);
  logger.info(`Registered job handler for type: ${type}`);
}

// ═══════════════════════════════════════════════════════════════
// JOB QUEUE CLASS
// ═══════════════════════════════════════════════════════════════

class JobQueue {
  private readonly queueKey = 'jobs:queue';
  private readonly processingKey = 'jobs:processing';
  private readonly completedKey = 'jobs:completed';
  private readonly failedKey = 'jobs:failed';
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private activeJobs = 0;
  private readonly maxConcurrency: number;

  constructor(maxConcurrency = 5) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Add a job to the queue
   */
  async enqueue<T>(type: JobType, data: T, options: JobOptions = {}): Promise<string> {
    const redis = getRedisClient();
    const jobId = `job:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;

    const job: Job<T> = {
      id: jobId,
      type,
      data,
      priority: options.priority || 'normal',
      status: 'pending',
      tenantId: options.tenantId,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
    };

    if (redis && redis.status === 'ready') {
      // Store job data
      await redis.hset(jobId, this.serializeJob(job));

      // Add to priority queue
      const score = this.getPriorityScore(job.priority, options.delay);
      await redis.zadd(this.queueKey, score, jobId);

      logger.info(`Job enqueued: ${jobId} (${type})`);
    } else {
      // Fallback: process immediately if Redis unavailable
      logger.warn(`Redis unavailable, processing job immediately: ${jobId}`);
      await this.processJob(job);
    }

    return jobId;
  }

  /**
   * Start processing jobs
   */
  start(intervalMs: number = 1000): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingInterval = setInterval(() => this.tick(), intervalMs);
    logger.info('Job queue started');
  }

  /**
   * Stop processing jobs
   */
  stop(): void {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    logger.info('Job queue stopped');
  }

  /**
   * Process next batch of jobs from the queue (up to maxConcurrency)
   */
  private async tick(): Promise<void> {
    if (!this.isProcessing) return;

    const redis = getRedisClient();
    if (!redis || redis.status !== 'ready') return;

    // Calculate how many slots are available
    const availableSlots = this.maxConcurrency - this.activeJobs;
    if (availableSlots <= 0) return;

    try {
      const now = Date.now();
      const results = await redis.zrangebyscore(
        this.queueKey, '-inf', now, 'LIMIT', 0, availableSlots
      );

      if (results.length === 0) return;

      // Process all fetched jobs in parallel
      const promises = results.map(async (jobId) => {
        try {
          // Move to processing
          await redis.zrem(this.queueKey, jobId);
          await redis.sadd(this.processingKey, jobId);

          const jobData = await redis.hgetall(jobId);
          if (!jobData || Object.keys(jobData).length === 0) {
            await redis.srem(this.processingKey, jobId);
            return;
          }

          const job = this.deserializeJob(jobData);
          this.activeJobs++;
          try {
            await this.processJob(job);
          } finally {
            this.activeJobs--;
          }
        } catch (error) {
          logger.error(`Job processing error for ${jobId}:`, error);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      logger.error('Job tick error:', error);
    }
  }

  /**
   * Process a single job
   */
  private async processJob<T>(job: Job<T>): Promise<void> {
    const redis = getRedisClient();
    const handler = jobHandlers.get(job.type);

    if (!handler) {
      logger.error(`No handler for job type: ${job.type}`);
      await this.markFailed(job, 'No handler registered');
      return;
    }

    job.status = 'processing';
    job.startedAt = new Date();
    job.attempts++;

    try {
      logger.info(`Processing job: ${job.id} (${job.type}), attempt ${job.attempts}`);

      const result = await handler(job);

      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;

      if (redis && redis.status === 'ready') {
        await redis.srem(this.processingKey, job.id);
        await redis.lpush(this.completedKey, job.id);
        await redis.hset(job.id, this.serializeJob(job));
        // Expire completed jobs after 24 hours
        await redis.expire(job.id, 86400);
      }

      logger.info(`Job completed: ${job.id}`);
    } catch (error: any) {
      logger.error(`Job failed: ${job.id}`, error);

      if (job.attempts < job.maxAttempts) {
        job.status = 'retrying';
        job.error = error.message;

        if (redis && redis.status === 'ready') {
          await redis.srem(this.processingKey, job.id);
          // Re-queue with exponential backoff
          const delay = Math.pow(2, job.attempts) * 1000;
          const score = Date.now() + delay;
          await redis.zadd(this.queueKey, score, job.id);
          await redis.hset(job.id, this.serializeJob(job));
        }

        logger.info(`Job scheduled for retry: ${job.id} (in ${Math.pow(2, job.attempts)}s)`);
      } else {
        await this.markFailed(job, error.message);
      }
    }
  }

  /**
   * Mark job as failed
   */
  private async markFailed<T>(job: Job<T>, error: string): Promise<void> {
    const redis = getRedisClient();

    job.status = 'failed';
    job.error = error;
    job.completedAt = new Date();

    if (redis && redis.status === 'ready') {
      await redis.srem(this.processingKey, job.id);
      await redis.lpush(this.failedKey, job.id);
      await redis.hset(job.id, this.serializeJob(job));
      // Keep failed jobs for 7 days
      await redis.expire(job.id, 604800);
    }

    logger.error(`Job marked as failed: ${job.id}`);
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    const redis = getRedisClient();
    if (!redis || redis.status !== 'ready') return null;

    const jobData = await redis.hgetall(jobId);
    if (!jobData || Object.keys(jobData).length === 0) return null;

    return this.deserializeJob(jobData);
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const redis = getRedisClient();
    if (!redis || redis.status !== 'ready') {
      return { pending: 0, processing: 0, completed: 0, failed: 0 };
    }

    const [pending, processing, completed, failed] = await Promise.all([
      redis.zcard(this.queueKey),
      redis.scard(this.processingKey),
      redis.llen(this.completedKey),
      redis.llen(this.failedKey),
    ]);

    return { pending, processing, completed, failed };
  }

  /**
   * Get priority score (lower = higher priority)
   */
  private getPriorityScore(priority: JobPriority, delay?: number): number {
    const now = Date.now();
    const delayMs = delay || 0;

    const priorityOffset: Record<JobPriority, number> = {
      critical: -10000,
      high: -5000,
      normal: 0,
      low: 5000,
    };

    return now + delayMs + priorityOffset[priority];
  }

  /**
   * Serialize job for Redis storage
   */
  private serializeJob<T>(job: Job<T>): Record<string, string> {
    return {
      id: job.id,
      type: job.type,
      data: JSON.stringify(job.data),
      priority: job.priority,
      status: job.status,
      tenantId: job.tenantId || '',
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() || '',
      completedAt: job.completedAt?.toISOString() || '',
      attempts: String(job.attempts),
      maxAttempts: String(job.maxAttempts),
      error: job.error || '',
      result: job.result ? JSON.stringify(job.result) : '',
    };
  }

  /**
   * Deserialize job from Redis storage
   */
  private deserializeJob(data: Record<string, string>): Job {
    return {
      id: data.id,
      type: data.type as JobType,
      data: JSON.parse(data.data || '{}'),
      priority: data.priority as JobPriority,
      status: data.status as JobStatus,
      tenantId: data.tenantId || undefined,
      createdAt: new Date(data.createdAt),
      startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      attempts: parseInt(data.attempts, 10),
      maxAttempts: parseInt(data.maxAttempts, 10),
      error: data.error || undefined,
      result: data.result ? JSON.parse(data.result) : undefined,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

export const jobQueue = new JobQueue(5); // Process up to 5 jobs concurrently

// ═══════════════════════════════════════════════════════════════
// REGISTER DEFAULT HANDLERS
// ═══════════════════════════════════════════════════════════════

// Cache warmup handler
registerJobHandler('cache-warmup', async (job) => {
  const { tenantId, userId } = job.data as { tenantId: string; userId?: string };
  logger.info(`Cache warmup for tenant ${tenantId}`);
  // Implementation would call cache warmup service
  return { warmedUp: true };
});

// Permission sync handler
registerJobHandler('permission-sync', async (job) => {
  const { tenantId, roleId } = job.data as { tenantId: string; roleId: string };
  logger.info(`Permission sync for role ${roleId} in tenant ${tenantId}`);
  await cacheInvalidationService.onRolePermissionsChanged(tenantId, roleId);
  return { synced: true };
});

// Notification handler
registerJobHandler('notification-send', async (job) => {
  const { userId, message, channel } = job.data as {
    userId: string;
    message: string;
    channel: 'email' | 'push' | 'socket';
  };
  logger.info(`Sending ${channel} notification to user ${userId}`);
  // Implementation would call notification service
  return { sent: true };
});

export default jobQueue;
