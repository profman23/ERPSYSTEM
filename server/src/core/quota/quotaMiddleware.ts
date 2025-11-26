/**
 * Platform Core Layer - Quota Middleware
 * Express middleware for quota enforcement
 */

import { Request, Response, NextFunction } from 'express';
import { quotaService } from './quotaService';
import { RequestContext } from '../context';
import { ResourceType } from './types';

interface QuotaMiddlewareOptions {
  resourceType: ResourceType;
  getAmount?: (req: Request) => number;
  incrementOnSuccess?: boolean;
}

/**
 * Create quota check middleware
 */
export function createQuotaMiddleware(options: QuotaMiddlewareOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = RequestContext.get();
      if (!context?.tenantId) {
        return next();
      }

      const amount = options.getAmount?.(req) || 1;
      const result = await quotaService.checkQuota(
        context.tenantId,
        options.resourceType,
        amount
      );

      res.setHeader('X-Quota-Limit', result.limit.toString());
      res.setHeader('X-Quota-Remaining', result.remaining.toString());
      res.setHeader('X-Quota-Used', result.current.toString());

      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Quota exceeded',
          message: result.message,
          resourceType: options.resourceType,
          current: result.current,
          limit: result.limit,
          traceId: context.traceId,
        });
      }

      if (options.incrementOnSuccess) {
        const originalSend = res.send.bind(res);
        res.send = function (body: any) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            quotaService
              .incrementUsage(context.tenantId!, options.resourceType, amount)
              .catch(console.error);
          }
          return originalSend(body);
        };
      }

      next();
    } catch (error) {
      console.error('Quota middleware error:', error);
      next();
    }
  };
}

/**
 * API request quota middleware
 */
export const apiRequestQuota = createQuotaMiddleware({
  resourceType: 'api_requests_daily',
  incrementOnSuccess: true,
});

/**
 * User creation quota middleware
 */
export const userQuota = createQuotaMiddleware({
  resourceType: 'users',
  incrementOnSuccess: false,
});

/**
 * Branch creation quota middleware
 */
export const branchQuota = createQuotaMiddleware({
  resourceType: 'branches',
  incrementOnSuccess: false,
});

/**
 * Patient creation quota middleware
 */
export const patientQuota = createQuotaMiddleware({
  resourceType: 'patients',
  incrementOnSuccess: false,
});

/**
 * Appointment quota middleware
 */
export const appointmentQuota = createQuotaMiddleware({
  resourceType: 'appointments_daily',
  incrementOnSuccess: false,
});

export default createQuotaMiddleware;
