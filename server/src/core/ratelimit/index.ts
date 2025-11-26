/**
 * Platform Core Layer - Rate Limiting Module
 */

export { rateLimitService } from './rateLimitService';
export {
  combinedRateLimiter,
  createRateLimiter,
  tenantRateLimiter,
  userRateLimiter,
  ipRateLimiter,
  authRateLimiter,
  strictRateLimiter,
} from './rateLimitMiddleware';
export type {
  RateLimitType,
  RateLimitAlgorithm,
  RateLimitConfig,
  RateLimitResult,
  RateLimitHeaders,
  RateLimitError,
} from './types';
export { DEFAULT_RATE_LIMITS } from './types';
