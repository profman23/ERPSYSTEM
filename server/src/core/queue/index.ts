/**
 * Platform Core Layer - Queue Module
 * Phase 7: Enterprise Background Processing
 */

export { queueService } from './queueService';
export { registerAllWorkers } from './workers';
export type {
  QueueName,
  QueueConfig,
  QueuePriority,
  BaseJobData,
  ANIDecisionJobData,
  AGITaskJobData,
  PermissionRebuildJobData,
  AuditJobData,
  MailJobData,
  ReportingJobData,
  BulkOperationJobData,
  JobData,
  QueueMetrics,
  WorkerHealth,
} from './types';
export { QUEUE_CONFIGS, DLQ_CONFIG } from './types';
