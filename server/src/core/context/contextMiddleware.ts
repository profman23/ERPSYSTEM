/**
 * Platform Core Layer - Request Context Middleware
 * Initializes request context at the beginning of each request
 * Auto-completes context when request finishes
 */

import { Request, Response, NextFunction } from 'express';
import onFinished from 'on-finished';
import { RequestContext } from './requestContext';
import { contextLogger } from './contextLogger';

/**
 * Extract client IP from request, handling proxies
 */
function extractClientIp(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(',')[0];
    return ips.trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Extract forwarded-for chain
 */
function extractForwardedFor(req: Request): string | null {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (!forwardedFor) return null;
  return Array.isArray(forwardedFor) ? forwardedFor.join(', ') : forwardedFor;
}

/**
 * Extract trace context from incoming headers (distributed tracing)
 */
function extractTraceHeaders(req: Request): {
  traceId?: string;
  correlationId?: string;
  parentSpanId?: string;
} {
  return {
    traceId: req.headers['x-trace-id'] as string | undefined,
    correlationId: req.headers['x-correlation-id'] as string | undefined,
    parentSpanId: req.headers['x-parent-span-id'] as string | undefined,
  };
}

/**
 * Request Context Middleware
 * Creates and manages request-scoped context with tracing, sampling, and propagation
 */
export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const traceHeaders = extractTraceHeaders(req);

  const context = RequestContext.create({
    traceId: traceHeaders.traceId,
    correlationId: traceHeaders.correlationId,
    parentSpanId: traceHeaders.parentSpanId,
    clientIp: extractClientIp(req),
    forwardedFor: extractForwardedFor(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    acceptLanguage: req.headers['accept-language'] as string,
    acceptEncoding: req.headers['accept-encoding'] as string,
    requestPath: req.path,
    requestMethod: req.method,
  });

  res.setHeader('X-Trace-Id', context.traceId);
  res.setHeader('X-Request-Id', context.requestId);

  onFinished(res, (err, finishedRes) => {
    const duration = Date.now() - context.requestStart;
    RequestContext.setDuration(duration);

    if (err || finishedRes.statusCode >= 400) {
      RequestContext.markError();
    }

    const logData = RequestContext.getLogData();
    if (logData) {
      const level = finishedRes.statusCode >= 500 ? 'error' :
                    finishedRes.statusCode >= 400 ? 'warn' : 'info';

      contextLogger[level]('Request completed', {
        ...logData,
        statusCode: finishedRes.statusCode,
        duration,
        sampled: context.sampling.sampled,
      });
    }
  });

  RequestContext.run(context, () => {
    next();
  });
};

/**
 * Enhanced tenant context middleware
 * Enriches request context with authenticated user data
 */
export const enrichContextWithAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const context = RequestContext.get();
  if (!context) {
    return next();
  }

  if (req.user) {
    context.tenantId = req.user.tenantId;
    context.userId = req.user.userId;
    context.branchId = req.user.branchId;
    context.businessLineId = req.user.businessLineId;
    context.accessScope = req.user.accessScope;
    context.role = req.user.role;
  }

  next();
};

export default requestContextMiddleware;
