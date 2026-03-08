/**
 * Rate Limiting Middleware - Redis-Backed for 3000+ Tenants
 *
 * Uses the core platform's Redis-based rate limiting service
 * Supports distributed rate limiting across multiple server instances
 */

import { Request, Response, NextFunction } from 'express';
import { rateLimitService } from '../core/ratelimit/rateLimitService';
import { DEFAULT_RATE_LIMITS, RateLimitConfig, RateLimitResult } from '../core/ratelimit/types';

// Helper to get client IP
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

// Helper to set rate limit headers
function setRateLimitHeaders(res: Response, result: RateLimitResult): void {
  res.setHeader('X-RateLimit-Limit', result.limit.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining).toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt.getTime() / 1000).toString());

  if (!result.allowed && result.retryAfter) {
    res.setHeader('Retry-After', result.retryAfter.toString());
  }
}

// Generic rate limiter factory using core service
function createRateLimiter(configKey: string) {
  const config = DEFAULT_RATE_LIMITS[configKey];

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIp(req);
      const key = `${ip}:${configKey}`;

      const result = await rateLimitService.checkLimit(key, config);
      setRateLimitHeaders(res, result);

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Too many requests',
          message: getErrorMessage(configKey),
          retryAfter: result.retryAfter,
          limit: result.limit,
          resetAt: result.resetAt.toISOString(),
        });
      }

      next();
    } catch (error) {
      // On error, allow request but log
      console.error(`Rate limiter error (${configKey}):`, error);
      next();
    }
  };
}

// Error messages for different limiters
function getErrorMessage(configKey: string): string {
  switch (configKey) {
    case 'auth':
      return 'Too many authentication attempts. Please try again in 15 minutes.';
    case 'strict':
      return 'Too many modification requests. Please wait before trying again.';
    case 'ip':
    default:
      return 'Too many requests. Please slow down and try again later.';
  }
}

/**
 * Rate limiter for authentication endpoints
 * Prevents brute force attacks on login/register
 * 5 attempts per 15 minutes (Redis-backed)
 */
export const authRateLimiter = createRateLimiter('auth');

/**
 * Rate limiter for general API endpoints
 * 500 requests per minute per IP (Redis-backed)
 * Supports distributed environments
 */
export const apiRateLimiter = createRateLimiter('ip');

/**
 * Strict rate limiter for sensitive operations
 * Create/Update/Delete operations
 * 20 requests per minute (Redis-backed)
 */
export const strictRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  // Only apply to mutating methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  return createRateLimiter('strict')(req, res, next);
};

/**
 * Token refresh rate limiter
 * 10 token refreshes per 5 minutes
 */
export const tokenRefreshRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = getClientIp(req);
    const config: RateLimitConfig = {
      type: 'ip',
      maxRequests: 10,
      windowMs: 5 * 60 * 1000, // 5 minutes
      algorithm: 'sliding_window',
    };

    const result = await rateLimitService.checkLimit(`${ip}:token_refresh`, config);
    setRateLimitHeaders(res, result);

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too many token refresh attempts',
        message: 'Too many token refresh attempts. Please wait before trying again.',
        retryAfter: result.retryAfter,
        limit: result.limit,
        resetAt: result.resetAt.toISOString(),
      });
    }

    next();
  } catch (error) {
    console.error('Token refresh rate limiter error:', error);
    next();
  }
};

/**
 * Tenant-aware rate limiter
 * Limits requests per tenant (10000/min)
 */
export const tenantRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'];

    if (!tenantId) {
      return next();
    }

    const result = await rateLimitService.checkTenantLimit(tenantId as string);
    setRateLimitHeaders(res, result);

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Tenant rate limit exceeded',
        message: 'Your organization has exceeded its API rate limit. Please try again later.',
        retryAfter: result.retryAfter,
        limit: result.limit,
        resetAt: result.resetAt.toISOString(),
      });
    }

    next();
  } catch (error) {
    console.error('Tenant rate limiter error:', error);
    next();
  }
};

/**
 * User-aware rate limiter
 * Limits requests per user (1000/min)
 */
export const userRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId || (req as any).user?.id;

    if (!userId) {
      return next();
    }

    const result = await rateLimitService.checkUserLimit(userId);
    setRateLimitHeaders(res, result);

    if (!result.allowed) {
      return res.status(429).json({
        error: 'User rate limit exceeded',
        message: 'You have exceeded your personal API rate limit. Please slow down.',
        retryAfter: result.retryAfter,
        limit: result.limit,
        resetAt: result.resetAt.toISOString(),
      });
    }

    next();
  } catch (error) {
    console.error('User rate limiter error:', error);
    next();
  }
};

/**
 * Combined rate limiter - checks IP, user, and tenant limits
 * Use this for comprehensive rate limiting on critical endpoints
 */
export const combinedRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = getClientIp(req);
    const userId = (req as any).userId || (req as any).user?.id;
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'];

    // Check IP limit first
    const ipResult = await rateLimitService.checkIpLimit(ip);
    if (!ipResult.allowed) {
      setRateLimitHeaders(res, ipResult);
      return res.status(429).json({
        error: 'IP rate limit exceeded',
        message: 'Too many requests from your IP address.',
        retryAfter: ipResult.retryAfter,
      });
    }

    // Check user limit if authenticated
    if (userId) {
      const userResult = await rateLimitService.checkUserLimit(userId);
      if (!userResult.allowed) {
        setRateLimitHeaders(res, userResult);
        return res.status(429).json({
          error: 'User rate limit exceeded',
          message: 'You have exceeded your personal API rate limit.',
          retryAfter: userResult.retryAfter,
        });
      }
    }

    // Check tenant limit if in tenant context
    if (tenantId) {
      const tenantResult = await rateLimitService.checkTenantLimit(tenantId as string);
      if (!tenantResult.allowed) {
        setRateLimitHeaders(res, tenantResult);
        return res.status(429).json({
          error: 'Tenant rate limit exceeded',
          message: 'Your organization has exceeded its API rate limit.',
          retryAfter: tenantResult.retryAfter,
        });
      }
    }

    // Use the most restrictive remaining count for headers
    setRateLimitHeaders(res, ipResult);
    next();
  } catch (error) {
    console.error('Combined rate limiter error:', error);
    next();
  }
};
