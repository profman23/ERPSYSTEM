/**
 * Platform Core Layer - Rate Limit Middleware
 * Express middleware for multi-tier rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import { rateLimitService } from './rateLimitService';
import { RequestContext } from '../context';
import {
  RateLimitConfig,
  RateLimitResult,
  RateLimitHeaders,
  RateLimitError,
  DEFAULT_RATE_LIMITS,
} from './types';

/**
 * Generate rate limit response headers
 */
function generateHeaders(result: RateLimitResult): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
    'X-RateLimit-Reset': Math.floor(result.resetAt.getTime() / 1000).toString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Generate rate limit error response
 */
function generateErrorResponse(result: RateLimitResult): RateLimitError {
  const context = RequestContext.get();
  return {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please slow down and try again later.',
    traceId: context?.traceId ?? null,
    retryAfter: result.retryAfter || 60,
    limit: result.limit,
    resetAt: result.resetAt.toISOString(),
  };
}

/**
 * Apply rate limit headers to response
 */
function applyHeaders(res: Response, result: RateLimitResult): void {
  const headers = generateHeaders(result);
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

/**
 * Combined rate limit middleware (tenant + user + IP)
 */
export const combinedRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await rateLimitService.checkAllLimits();

    const activeResult = result.results.user || result.results.tenant || result.results.ip;
    if (activeResult) {
      applyHeaders(res, activeResult);
    }

    if (!result.allowed && result.limitedBy) {
      const limitResult = result.results[result.limitedBy];
      if (limitResult) {
        return res.status(429).json(generateErrorResponse(limitResult));
      }
    }

    next();
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    next();
  }
};

/**
 * Create rate limit middleware with custom config
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (config.skip?.(req)) {
        return next();
      }

      const key = config.keyGenerator
        ? config.keyGenerator(req)
        : getDefaultKey(req, config.type);

      const result = await rateLimitService.checkLimit(key, config);
      applyHeaders(res, result);

      if (!result.allowed) {
        return res.status(429).json(generateErrorResponse(result));
      }

      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      next();
    }
  };
}

/**
 * Get default rate limit key based on type
 */
function getDefaultKey(req: Request, type: string): string {
  const context = RequestContext.get();

  switch (type) {
    case 'tenant':
      return context?.tenantId || 'anonymous';
    case 'user':
      return context?.userId || context?.clientIp || 'anonymous';
    case 'ip':
      return context?.clientIp || req.ip || 'unknown';
    case 'endpoint':
      return `${req.method}:${req.path}:${context?.userId || context?.clientIp || 'anonymous'}`;
    default:
      return context?.userId || context?.clientIp || 'anonymous';
  }
}

export const tenantRateLimiter = createRateLimiter(DEFAULT_RATE_LIMITS.tenant);
export const userRateLimiter = createRateLimiter(DEFAULT_RATE_LIMITS.user);
export const ipRateLimiter = createRateLimiter(DEFAULT_RATE_LIMITS.ip);
export const authRateLimiter = createRateLimiter(DEFAULT_RATE_LIMITS.auth);
export const strictRateLimiter = createRateLimiter(DEFAULT_RATE_LIMITS.strict);

export default combinedRateLimiter;
