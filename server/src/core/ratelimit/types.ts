/**
 * Platform Core Layer - Rate Limiting Types
 */

export type RateLimitType = 'tenant' | 'user' | 'ip' | 'endpoint' | 'global';
export type RateLimitAlgorithm = 'sliding_window' | 'token_bucket' | 'fixed_window';

export interface RateLimitConfig {
  type: RateLimitType;
  maxRequests: number;
  windowMs: number;
  algorithm?: RateLimitAlgorithm;
  burstLimit?: number;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: any) => string;
  skip?: (req: any) => boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
  limit: number;
  current: number;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

export interface RateLimitError {
  error: string;
  message: string;
  traceId: string | null;
  retryAfter: number;
  limit: number;
  resetAt: string;
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  tenant: {
    type: 'tenant',
    maxRequests: 10000,
    windowMs: 60 * 1000,
    algorithm: 'sliding_window',
    burstLimit: 500,
  },
  user: {
    type: 'user',
    maxRequests: 1000,
    windowMs: 60 * 1000,
    algorithm: 'sliding_window',
    burstLimit: 100,
  },
  ip: {
    type: 'ip',
    maxRequests: 500,
    windowMs: 60 * 1000,
    algorithm: 'sliding_window',
    burstLimit: 50,
  },
  auth: {
    type: 'ip',
    maxRequests: 30,
    windowMs: 15 * 60 * 1000,
    algorithm: 'fixed_window',
    skipSuccessfulRequests: true,
  },
  strict: {
    type: 'user',
    maxRequests: 20,
    windowMs: 60 * 1000,
    algorithm: 'token_bucket',
  },
};
