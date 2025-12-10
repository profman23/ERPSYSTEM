/**
 * Platform Core Layer - BullMQ Queue Types
 * Phase 7: Enterprise Background Processing - AGI Task Engine
 */

import { JobsOptions } from 'bullmq';

export type QueueName =
  | 'aniDecisionQueue'
  | 'agiTaskQueue'
  | 'permissionRebuildQueue'
  | 'auditQueue'
  | 'mailQueue'
  | 'reportingQueue'
  | 'bulkOperationQueue';

export type QueuePriority = 'critical' | 'high' | 'normal' | 'low';

export interface QueueConfig {
  name: QueueName;
  concurrency: number;
  priority: QueuePriority;
  defaultJobOptions: JobsOptions;
}

export interface BaseJobData {
  tenantId?: string;
  userId?: string;
  traceId?: string;
  correlationId?: string;
  createdAt: number;
}

export interface ANIDecisionJobData extends BaseJobData {
  type: 'classification' | 'recommendation' | 'prediction' | 'analysis';
  context: Record<string, unknown>;
  inputData: unknown;
  timeout?: number;
}

export interface AGITaskJobData extends BaseJobData {
  type: 'reasoning' | 'planning' | 'learning' | 'optimization';
  task: string;
  parameters: Record<string, unknown>;
  priority: QueuePriority;
}

export interface PermissionRebuildJobData extends BaseJobData {
  scope: 'user' | 'role' | 'tenant' | 'all';
  targetId?: string;
  reason: string;
}

export interface AuditJobData extends BaseJobData {
  action: string;
  resourceType: string;
  resourceId: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface MailJobData extends BaseJobData {
  to: string | string[];
  subject: string;
  template: string;
  variables: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface ReportingJobData extends BaseJobData {
  reportType: string;
  parameters: Record<string, unknown>;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  deliveryMethod: 'email' | 'download' | 'storage';
  recipientEmail?: string;
}

export interface BulkOperationJobData extends BaseJobData {
  operation: 'import' | 'export' | 'update' | 'delete' | 'migrate';
  entityType: string;
  data?: unknown[];
  filters?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export type JobData =
  | ANIDecisionJobData
  | AGITaskJobData
  | PermissionRebuildJobData
  | AuditJobData
  | MailJobData
  | ReportingJobData
  | BulkOperationJobData;

export interface QueueMetrics {
  queueName: QueueName;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  processingTime: {
    avg: number;
    p95: number;
    p99: number;
  };
  throughput: number;
  errorRate: number;
}

export interface WorkerHealth {
  queueName: QueueName;
  workerId: string;
  status: 'running' | 'paused' | 'stopped' | 'error';
  jobsProcessed: number;
  lastJobAt: number | null;
  uptime: number;
}

export const QUEUE_CONFIGS: Record<QueueName, QueueConfig> = {
  aniDecisionQueue: {
    name: 'aniDecisionQueue',
    concurrency: 5,
    priority: 'critical',
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 * 7 },
    },
  },
  agiTaskQueue: {
    name: 'agiTaskQueue',
    concurrency: 10,
    priority: 'critical',
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: { age: 3600 * 24 },
      removeOnFail: { age: 86400 * 14 },
    },
  },
  permissionRebuildQueue: {
    name: 'permissionRebuildQueue',
    concurrency: 3,
    priority: 'high',
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 * 7 },
    },
  },
  auditQueue: {
    name: 'auditQueue',
    concurrency: 2,
    priority: 'normal',
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 500,
      },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 * 30 },
    },
  },
  mailQueue: {
    name: 'mailQueue',
    concurrency: 3,
    priority: 'normal',
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: { age: 3600 * 24 },
      removeOnFail: { age: 86400 * 7 },
    },
  },
  reportingQueue: {
    name: 'reportingQueue',
    concurrency: 2,
    priority: 'normal',
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: { age: 3600 * 24 },
      removeOnFail: { age: 86400 * 7 },
    },
  },
  bulkOperationQueue: {
    name: 'bulkOperationQueue',
    concurrency: 1,
    priority: 'low',
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
      removeOnComplete: { age: 3600 * 24 * 7 },
      removeOnFail: { age: 86400 * 30 },
    },
  },
};

export const DLQ_CONFIG = {
  name: 'deadLetterQueue',
  retentionDays: 30,
  maxSize: 10000,
};
