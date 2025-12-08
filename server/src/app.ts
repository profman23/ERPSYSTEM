/**
 * Express Application Configuration
 * 
 * This module exports the configured Express app WITHOUT starting the server.
 * Used for:
 * - Testing (Supertest can import without side effects)
 * - Server initialization (index.ts imports and starts it)
 */

import express from 'express';
import { helmetMiddleware, corsMiddleware } from './middleware/securityMiddleware';
import { metricsMiddleware } from './middleware/metricsMiddleware';
import { tenantContextCleanup } from './middleware/tenantLoader';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';
import apiRoutes from './api/routes';
import { requestContextMiddleware } from './core/context';
import { healthRoutes } from './core/health';
import { versionMiddleware } from './core/versioning';

// Create Express app
const app = express();

// Enable trust proxy for Replit environment and enterprise deployments
// Required for proper rate limiting and X-Forwarded-For header handling
app.set('trust proxy', true);

// Security middleware
app.use(helmetMiddleware);
app.use(corsMiddleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request context tracking
app.use(requestContextMiddleware);

// Metrics
app.use(metricsMiddleware);

// Health checks
app.use('/health', healthRoutes);

// API versioning
app.use(versionMiddleware);

// API routes with rate limiting
app.use('/api/v1', apiRateLimiter, apiRoutes);

// API root
app.get('/api', (req, res) => {
  res.json({
    success: true,
    versions: {
      current: 'v1',
      available: ['v1'],
      deprecated: [],
    },
    endpoints: {
      v1: '/api/v1',
    },
    documentation: '/api/docs',
  });
});

// Cleanup tenant context after request completes
app.use(tenantContextCleanup);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Export app for testing and server initialization
export { app };
