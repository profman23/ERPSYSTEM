import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints
 * Prevents brute force attacks on login/register
 * 5 attempts per 15 minutes
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful login attempts from counting
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter for general API endpoints
 * 100 requests per minute per IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests. Please slow down and try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for sensitive operations
 * Create/Update/Delete operations
 * 20 requests per minute
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per window
  message: {
    error: 'Too many modification requests. Please wait before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only apply to mutating methods
  skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
});

/**
 * Token refresh rate limiter
 * 10 token refreshes per 5 minutes
 */
export const tokenRefreshRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 refreshes per window
  message: {
    error: 'Too many token refresh attempts. Please wait before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
