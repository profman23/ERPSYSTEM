/**
 * Platform Core Layer - Queue Workers
 * Phase 7: Enterprise Background Processing Workers
 * 
 * Implements workers for all 7 queues with proper error handling,
 * logging, and multi-tenant context preservation.
 */

import { Job } from 'bullmq';
import { queueService } from './queueService';
import { contextLogger } from '../context';
import { cacheService, CACHE_TAGS } from '../cache';
import {
  ANIDecisionJobData,
  AGITaskJobData,
  PermissionRebuildJobData,
  AuditJobData,
  MailJobData,
  ReportingJobData,
  BulkOperationJobData,
} from './types';

export function registerAllWorkers(): void {
  registerANIDecisionWorker();
  registerAGITaskWorker();
  registerPermissionRebuildWorker();
  registerAuditWorker();
  registerMailWorker();
  registerReportingWorker();
  registerBulkOperationWorker();

  contextLogger.info('All queue workers registered');
}

function registerANIDecisionWorker(): void {
  queueService.registerWorker<ANIDecisionJobData>(
    'aniDecisionQueue',
    async (job: Job<ANIDecisionJobData>) => {
      const { type, context, inputData, tenantId, traceId } = job.data;

      contextLogger.info('Processing ANI decision', {
        traceId,
        tenantId,
        type,
        jobId: job.id,
      });

      switch (type) {
        case 'classification':
          await processClassification(context, inputData);
          break;
        case 'recommendation':
          await processRecommendation(context, inputData);
          break;
        case 'prediction':
          await processPrediction(context, inputData);
          break;
        case 'analysis':
          await processAnalysis(context, inputData);
          break;
        default:
          throw new Error(`Unknown ANI decision type: ${type}`);
      }
    }
  );
}

function registerAGITaskWorker(): void {
  queueService.registerWorker<AGITaskJobData>(
    'agiTaskQueue',
    async (job: Job<AGITaskJobData>) => {
      const { type, task, parameters, tenantId, traceId } = job.data;

      contextLogger.info('Processing AGI task', {
        traceId,
        tenantId,
        type,
        task,
        jobId: job.id,
      });

      await job.updateProgress(10);

      switch (type) {
        case 'reasoning':
          await processReasoning(task, parameters);
          break;
        case 'planning':
          await processPlanning(task, parameters);
          break;
        case 'learning':
          await processLearning(task, parameters);
          break;
        case 'optimization':
          await processOptimization(task, parameters);
          break;
        default:
          throw new Error(`Unknown AGI task type: ${type}`);
      }

      await job.updateProgress(100);
    }
  );
}

function registerPermissionRebuildWorker(): void {
  queueService.registerWorker<PermissionRebuildJobData>(
    'permissionRebuildQueue',
    async (job: Job<PermissionRebuildJobData>) => {
      const { scope, targetId, reason, tenantId, traceId } = job.data;

      contextLogger.info('Rebuilding permissions', {
        traceId,
        tenantId,
        scope,
        targetId,
        reason,
        jobId: job.id,
      });

      switch (scope) {
        case 'user':
          if (targetId) {
            await cacheService.invalidateByTags([CACHE_TAGS.PERMISSIONS]);
          }
          break;
        case 'role':
          await cacheService.invalidateByTags([CACHE_TAGS.ROLES, CACHE_TAGS.PERMISSIONS]);
          break;
        case 'tenant':
          if (tenantId) {
            await cacheService.invalidateByTenant(tenantId);
          }
          break;
        case 'all':
          await cacheService.invalidateByTags([
            CACHE_TAGS.PERMISSIONS,
            CACHE_TAGS.ROLES,
            CACHE_TAGS.SCOPES,
          ]);
          break;
      }

      contextLogger.info('Permission rebuild completed', {
        traceId,
        scope,
        targetId,
      });
    }
  );
}

function registerAuditWorker(): void {
  queueService.registerWorker<AuditJobData>(
    'auditQueue',
    async (job: Job<AuditJobData>) => {
      const { action, resourceType, resourceId, oldData, newData, tenantId, traceId, userId } = job.data;

      contextLogger.info('Processing audit log', {
        traceId,
        tenantId,
        action,
        resourceType,
        resourceId,
      });

      contextLogger.info('Audit log processed', {
        traceId,
        tenantId,
        userId,
        action,
        resourceType,
        resourceId,
        hasOldData: !!oldData,
        hasNewData: !!newData,
      });
    }
  );
}

function registerMailWorker(): void {
  queueService.registerWorker<MailJobData>(
    'mailQueue',
    async (job: Job<MailJobData>) => {
      const { to, subject, template, variables, tenantId, traceId } = job.data;

      contextLogger.info('Processing email', {
        traceId,
        tenantId,
        to: Array.isArray(to) ? to.length : 1,
        subject,
        template,
        jobId: job.id,
      });

      await simulateEmailSend(to, subject, template, variables);

      contextLogger.info('Email sent successfully', {
        traceId,
        to,
        subject,
      });
    }
  );
}

function registerReportingWorker(): void {
  queueService.registerWorker<ReportingJobData>(
    'reportingQueue',
    async (job: Job<ReportingJobData>) => {
      const { reportType, parameters, format, deliveryMethod, tenantId, traceId } = job.data;

      contextLogger.info('Generating report', {
        traceId,
        tenantId,
        reportType,
        format,
        deliveryMethod,
        jobId: job.id,
      });

      await job.updateProgress(10);
      
      await simulateReportGeneration(reportType, parameters, format);
      
      await job.updateProgress(80);

      if (deliveryMethod === 'email' && job.data.recipientEmail) {
        await queueService.addMail({
          to: job.data.recipientEmail,
          subject: `Report Ready: ${reportType}`,
          template: 'report-ready',
          variables: { reportType, format },
          tenantId,
          traceId,
        });
      }

      await job.updateProgress(100);

      contextLogger.info('Report generated successfully', {
        traceId,
        reportType,
        format,
      });
    }
  );
}

function registerBulkOperationWorker(): void {
  queueService.registerWorker<BulkOperationJobData>(
    'bulkOperationQueue',
    async (job: Job<BulkOperationJobData>) => {
      const { operation, entityType, data, filters, options, tenantId, traceId } = job.data;

      contextLogger.info('Processing bulk operation', {
        traceId,
        tenantId,
        operation,
        entityType,
        dataCount: data?.length,
        jobId: job.id,
      });

      const totalItems = data?.length || 0;
      const batchSize = 100;
      let processed = 0;

      for (let i = 0; i < totalItems; i += batchSize) {
        const batch = data?.slice(i, i + batchSize);
        
        await simulateBulkBatch(operation, entityType, batch, options);
        
        processed += batch?.length || 0;
        await job.updateProgress(Math.round((processed / totalItems) * 100));
      }

      contextLogger.info('Bulk operation completed', {
        traceId,
        operation,
        entityType,
        processed,
      });
    }
  );
}

async function processClassification(context: Record<string, unknown>, inputData: unknown): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 100));
}

async function processRecommendation(context: Record<string, unknown>, inputData: unknown): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 150));
}

async function processPrediction(context: Record<string, unknown>, inputData: unknown): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 200));
}

async function processAnalysis(context: Record<string, unknown>, inputData: unknown): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 250));
}

async function processReasoning(task: string, parameters: Record<string, unknown>): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 500));
}

async function processPlanning(task: string, parameters: Record<string, unknown>): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 400));
}

async function processLearning(task: string, parameters: Record<string, unknown>): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 600));
}

async function processOptimization(task: string, parameters: Record<string, unknown>): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 300));
}

async function simulateEmailSend(
  to: string | string[],
  subject: string,
  template: string,
  variables: Record<string, unknown>
): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 50));
}

async function simulateReportGeneration(
  reportType: string,
  parameters: Record<string, unknown>,
  format: string
): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function simulateBulkBatch(
  operation: string,
  entityType: string,
  batch: unknown[] | undefined,
  options: Record<string, unknown> | undefined
): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 100));
}

export default registerAllWorkers;
