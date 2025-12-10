/**
 * Platform Core Layer - BullMQ Queue Service
 * Phase 7: Enterprise Background Processing - AGI Task Engine
 * 
 * Features:
 * - 7 purpose-built queues for different workload types
 * - Exponential backoff retry policies
 * - Dead-letter queue for failed jobs
 * - Redis-based distributed processing
 * - Comprehensive metrics and event logging
 * - Multi-tenant job isolation
 */

import { Queue, Worker, Job, QueueEvents, FlowProducer } from 'bullmq';
import { getRedisClient } from '../../services/redisClient';
import { contextLogger } from '../context';
import {
  QueueName,
  QueueConfig,
  QUEUE_CONFIGS,
  DLQ_CONFIG,
  JobData,
  BaseJobData,
  QueueMetrics,
  WorkerHealth,
  ANIDecisionJobData,
  AGITaskJobData,
  PermissionRebuildJobData,
  AuditJobData,
  MailJobData,
  ReportingJobData,
  BulkOperationJobData,
} from './types';
import { ulid } from 'ulid';

class QueueService {
  private queues: Map<QueueName, Queue> = new Map();
  private workers: Map<QueueName, Worker> = new Map();
  private queueEvents: Map<QueueName, QueueEvents> = new Map();
  private deadLetterQueue: Queue | null = null;
  private flowProducer: FlowProducer | null = null;
  private isInitialized: boolean = false;
  private workerHealth: Map<QueueName, WorkerHealth> = new Map();
  private metricsBuffer: Map<QueueName, { processingTimes: number[]; errors: number; completed: number }> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const redis = getRedisClient();
    if (!redis) {
      contextLogger.warn('Redis not available, queue service disabled');
      return;
    }

    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    };

    try {
      for (const [name, config] of Object.entries(QUEUE_CONFIGS)) {
        const queue = new Queue(name, { connection, defaultJobOptions: config.defaultJobOptions });
        this.queues.set(name as QueueName, queue);

        const events = new QueueEvents(name, { connection });
        this.queueEvents.set(name as QueueName, events);
        this.setupQueueEventHandlers(name as QueueName, events);

        this.metricsBuffer.set(name as QueueName, { processingTimes: [], errors: 0, completed: 0 });

        contextLogger.info('Queue initialized', { queue: name });
      }

      this.deadLetterQueue = new Queue(DLQ_CONFIG.name, { connection });

      this.flowProducer = new FlowProducer({ connection });

      this.isInitialized = true;
      contextLogger.info('Queue service initialized', { queues: Object.keys(QUEUE_CONFIGS) });
    } catch (error) {
      contextLogger.error('Queue service initialization failed', { error });
      throw error;
    }
  }

  async addJob<T extends JobData>(
    queueName: QueueName,
    data: T,
    options?: { priority?: number; delay?: number; jobId?: string }
  ): Promise<{ enqueued: boolean; jobId?: string; reason?: string }> {
    if (!this.isInitialized) {
      contextLogger.warn('Queue service not initialized, job not added', { queue: queueName });
      return { enqueued: false, reason: 'queue_service_unavailable' };
    }

    const queue = this.queues.get(queueName);
    if (!queue) {
      contextLogger.warn('Queue not found, job not added', { queue: queueName });
      return { enqueued: false, reason: 'queue_not_found' };
    }

    const jobId = options?.jobId || `job_${ulid()}`;
    const jobData = {
      ...data,
      createdAt: data.createdAt || Date.now(),
    };

    try {
      const job = await queue.add(queueName, jobData, {
        jobId,
        priority: options?.priority,
        delay: options?.delay,
      });

      contextLogger.debug('Job added to queue', {
        queue: queueName,
        jobId: job.id,
        tenantId: data.tenantId,
      });

      return { enqueued: true, jobId: job.id! };
    } catch (error) {
      contextLogger.error('Failed to add job to queue', { queue: queueName, error });
      return { enqueued: false, reason: 'enqueue_failed' };
    }
  }

  async addANIDecision(data: Omit<ANIDecisionJobData, 'createdAt'>): Promise<{ enqueued: boolean; jobId?: string; reason?: string }> {
    return this.addJob('aniDecisionQueue', { ...data, createdAt: Date.now() });
  }

  async addAGITask(data: Omit<AGITaskJobData, 'createdAt'>): Promise<{ enqueued: boolean; jobId?: string; reason?: string }> {
    const priority = data.priority === 'critical' ? 1 : data.priority === 'high' ? 2 : data.priority === 'low' ? 4 : 3;
    return this.addJob('agiTaskQueue', { ...data, createdAt: Date.now() }, { priority });
  }

  async addPermissionRebuild(data: Omit<PermissionRebuildJobData, 'createdAt'>): Promise<{ enqueued: boolean; jobId?: string; reason?: string }> {
    return this.addJob('permissionRebuildQueue', { ...data, createdAt: Date.now() });
  }

  async addAuditLog(data: Omit<AuditJobData, 'createdAt'>): Promise<{ enqueued: boolean; jobId?: string; reason?: string }> {
    return this.addJob('auditQueue', { ...data, createdAt: Date.now() });
  }

  async addMail(data: Omit<MailJobData, 'createdAt'>): Promise<{ enqueued: boolean; jobId?: string; reason?: string }> {
    return this.addJob('mailQueue', { ...data, createdAt: Date.now() });
  }

  async addReport(data: Omit<ReportingJobData, 'createdAt'>): Promise<{ enqueued: boolean; jobId?: string; reason?: string }> {
    return this.addJob('reportingQueue', { ...data, createdAt: Date.now() });
  }

  async addBulkOperation(data: Omit<BulkOperationJobData, 'createdAt'>): Promise<{ enqueued: boolean; jobId?: string; reason?: string }> {
    return this.addJob('bulkOperationQueue', { ...data, createdAt: Date.now() });
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  registerWorker<T extends JobData>(
    queueName: QueueName,
    processor: (job: Job<T>) => Promise<void>
  ): void {
    if (!this.isInitialized) {
      contextLogger.warn('Queue service not initialized, worker registration skipped', { queue: queueName });
      return;
    }

    const queue = this.queues.get(queueName);
    if (!queue) {
      contextLogger.warn('Queue not found, worker registration skipped', { queue: queueName });
      return;
    }

    const config = QUEUE_CONFIGS[queueName];
    if (!config) {
      throw new Error(`Unknown queue: ${queueName}`);
    }

    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    };

    const worker = new Worker(
      queueName,
      async (job: Job<T>) => {
        const startTime = Date.now();
        const metrics = this.metricsBuffer.get(queueName);

        try {
          contextLogger.debug('Processing job', {
            queue: queueName,
            jobId: job.id,
            attempt: job.attemptsMade + 1,
          });

          await processor(job);

          const duration = Date.now() - startTime;
          if (metrics) {
            metrics.processingTimes.push(duration);
            metrics.completed++;
            if (metrics.processingTimes.length > 1000) {
              metrics.processingTimes.shift();
            }
          }

          this.updateWorkerHealth(queueName, 'running', job.id!);

          contextLogger.debug('Job completed', {
            queue: queueName,
            jobId: job.id,
            duration,
          });
        } catch (error) {
          if (metrics) {
            metrics.errors++;
          }

          contextLogger.error('Job processing failed', {
            queue: queueName,
            jobId: job.id,
            error,
            attempt: job.attemptsMade + 1,
          });

          throw error;
        }
      },
      { connection, concurrency: config.concurrency }
    );

    worker.on('failed', async (job, err) => {
      if (job) {
        const maxAttempts = job.opts.attempts || config.defaultJobOptions.attempts || 3;
        if (job.attemptsMade >= maxAttempts) {
          await this.moveToDeadLetter(queueName, job, err);
        }
      }
    });

    worker.on('error', (err) => {
      contextLogger.error('Worker error', { queue: queueName, error: err });
      this.updateWorkerHealth(queueName, 'error');
    });

    this.workers.set(queueName, worker);
    this.initializeWorkerHealth(queueName);

    contextLogger.info('Worker registered', { queue: queueName, concurrency: config.concurrency });
  }

  async getMetrics(queueName: QueueName): Promise<QueueMetrics> {
    const queue = this.queues.get(queueName);
    if (!queue || !this.isInitialized) {
      return {
        queueName,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        processingTime: { avg: 0, p95: 0, p99: 0 },
        throughput: 0,
        errorRate: 0,
      };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    const buffer = this.metricsBuffer.get(queueName);
    const processingTimes = buffer?.processingTimes || [];
    const sortedTimes = [...processingTimes].sort((a, b) => a - b);

    return {
      queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      processingTime: {
        avg: processingTimes.length > 0 ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0,
        p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0,
        p99: sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0,
      },
      throughput: buffer?.completed || 0,
      errorRate: buffer ? (buffer.errors / (buffer.completed + buffer.errors) || 0) : 0,
    };
  }

  async getAllMetrics(): Promise<QueueMetrics[]> {
    const metrics: QueueMetrics[] = [];
    for (const queueName of this.queues.keys()) {
      metrics.push(await this.getMetrics(queueName));
    }
    return metrics;
  }

  getWorkerHealth(queueName: QueueName): WorkerHealth | undefined {
    return this.workerHealth.get(queueName);
  }

  getAllWorkerHealth(): WorkerHealth[] {
    return Array.from(this.workerHealth.values());
  }

  async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
      this.updateWorkerHealth(queueName, 'paused');
      contextLogger.info('Queue paused', { queue: queueName });
    }
  }

  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      this.updateWorkerHealth(queueName, 'running');
      contextLogger.info('Queue resumed', { queue: queueName });
    }
  }

  async retryFailedJobs(queueName: QueueName): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) return 0;

    const failed = await queue.getFailed();
    let retried = 0;

    for (const job of failed) {
      await job.retry();
      retried++;
    }

    contextLogger.info('Failed jobs retried', { queue: queueName, count: retried });
    return retried;
  }

  async shutdown(): Promise<void> {
    contextLogger.info('Shutting down queue service');

    for (const [name, worker] of this.workers) {
      await worker.close();
      contextLogger.debug('Worker closed', { queue: name });
    }

    for (const [name, events] of this.queueEvents) {
      await events.close();
    }

    for (const [name, queue] of this.queues) {
      await queue.close();
      contextLogger.debug('Queue closed', { queue: name });
    }

    if (this.deadLetterQueue) {
      await this.deadLetterQueue.close();
    }

    if (this.flowProducer) {
      await this.flowProducer.close();
    }

    this.isInitialized = false;
    contextLogger.info('Queue service shutdown complete');
  }

  private setupQueueEventHandlers(queueName: QueueName, events: QueueEvents): void {
    events.on('completed', ({ jobId }) => {
      contextLogger.debug('Job completed event', { queue: queueName, jobId });
    });

    events.on('failed', ({ jobId, failedReason }) => {
      contextLogger.warn('Job failed event', { queue: queueName, jobId, reason: failedReason });
    });

    events.on('stalled', ({ jobId }) => {
      contextLogger.warn('Job stalled', { queue: queueName, jobId });
    });

    events.on('progress', ({ jobId, data }) => {
      contextLogger.debug('Job progress', { queue: queueName, jobId, progress: data });
    });
  }

  private async moveToDeadLetter(queueName: QueueName, job: Job, error: Error): Promise<void> {
    if (!this.deadLetterQueue) {
      contextLogger.error('Dead letter queue not initialized, cannot move failed job', {
        queue: queueName,
        jobId: job.id,
      });
      return;
    }

    try {
      await this.deadLetterQueue.add('failed-job', {
        originalQueue: queueName,
        originalJobId: job.id,
        originalData: job.data,
        error: error.message,
        stack: error.stack,
        failedAt: Date.now(),
        attempts: job.attemptsMade,
        tenantId: (job.data as BaseJobData).tenantId,
        traceId: (job.data as BaseJobData).traceId,
      }, {
        removeOnComplete: { age: 86400 * 30 },
      });

      contextLogger.warn('Job moved to dead letter queue', {
        queue: queueName,
        jobId: job.id,
        error: error.message,
        attempts: job.attemptsMade,
      });
    } catch (dlqError) {
      contextLogger.error('Failed to move job to dead letter queue', {
        queue: queueName,
        jobId: job.id,
        error: dlqError,
      });
    }
  }

  private initializeWorkerHealth(queueName: QueueName): void {
    this.workerHealth.set(queueName, {
      queueName,
      workerId: `worker_${ulid()}`,
      status: 'running',
      jobsProcessed: 0,
      lastJobAt: null,
      uptime: Date.now(),
    });
  }

  private updateWorkerHealth(queueName: QueueName, status: WorkerHealth['status'], lastJobId?: string): void {
    const health = this.workerHealth.get(queueName);
    if (health) {
      health.status = status;
      if (lastJobId) {
        health.lastJobAt = Date.now();
        health.jobsProcessed++;
      }
    }
  }
}

export const queueService = new QueueService();
export default queueService;
