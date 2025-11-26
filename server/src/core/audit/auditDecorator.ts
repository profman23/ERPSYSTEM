/**
 * Platform Core Layer - Audit Decorators
 * Automatic audit logging for service methods
 */

import { auditService } from './auditService';
import { AuditAction, AuditSeverity } from './types';

interface AuditOptions {
  action: AuditAction;
  resourceType: string;
  getResourceId?: (args: unknown[], result: unknown) => string | null;
  getOldData?: (args: unknown[]) => Promise<Record<string, unknown> | null>;
  getNewData?: (args: unknown[], result: unknown) => Record<string, unknown> | null;
  severity?: AuditSeverity;
  metadata?: (args: unknown[], result: unknown) => Record<string, unknown>;
}

/**
 * Method decorator for automatic audit logging
 */
export function Audited(options: AuditOptions) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      let oldData: Record<string, unknown> | null = null;

      if (options.getOldData) {
        try {
          oldData = await options.getOldData(args);
        } catch (error) {
          console.error('Failed to get old data for audit:', error);
        }
      }

      try {
        const result = await originalMethod.apply(this, args);

        await auditService.log({
          action: options.action,
          resourceType: options.resourceType,
          resourceId: options.getResourceId?.(args, result) ?? null,
          oldData,
          newData: options.getNewData?.(args, result) ?? null,
          severity: options.severity,
          metadata: options.metadata?.(args, result),
        });

        return result;
      } catch (error: any) {
        await auditService.log({
          action: options.action,
          resourceType: options.resourceType,
          resourceId: options.getResourceId?.(args, null) ?? null,
          oldData,
          severity: 'critical',
          errorMessage: error.message,
          metadata: options.metadata?.(args, null),
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Helper to create audit middleware for routes
 */
export function createAuditMiddleware(options: Omit<AuditOptions, 'getOldData'>) {
  return async (
    req: { body?: unknown; params?: unknown },
    _res: unknown,
    next: () => void
  ) => {
    try {
      await auditService.log({
        action: options.action,
        resourceType: options.resourceType,
        resourceId: options.getResourceId?.([req.params], null) ?? null,
        newData: req.body as Record<string, unknown>,
        severity: options.severity,
        metadata: options.metadata?.([req.params, req.body], null),
      });
    } catch (error) {
      console.error('Audit middleware error:', error);
    }
    next();
  };
}

/**
 * Utility function for manual audit logging with context
 */
export async function audit(
  action: AuditAction,
  resourceType: string,
  options?: {
    resourceId?: string;
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    severity?: AuditSeverity;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await auditService.log({
    action,
    resourceType,
    resourceId: options?.resourceId,
    oldData: options?.oldData,
    newData: options?.newData,
    severity: options?.severity,
    metadata: options?.metadata,
  });
}

/**
 * Immediate audit for critical events
 */
export async function auditCritical(
  action: AuditAction,
  resourceType: string,
  options?: {
    resourceId?: string;
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    errorMessage?: string;
  }
): Promise<string> {
  return auditService.logImmediate({
    action,
    resourceType,
    resourceId: options?.resourceId,
    oldData: options?.oldData,
    newData: options?.newData,
    severity: 'critical',
    metadata: options?.metadata,
    errorMessage: options?.errorMessage,
  });
}
