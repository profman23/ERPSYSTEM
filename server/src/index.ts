import express from 'express';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { initializeSocket } from './realtime/socket';
import { initializeRedis } from './services/redisClient';
import { startAllJobs } from './jobs';
import logger from './config/logger';
import { helmetMiddleware, corsMiddleware } from './middleware/securityMiddleware';
import { metricsMiddleware } from './middleware/metricsMiddleware';
import { requestLogger } from './middleware/requestLogger';
import { tenantContextCleanup } from './middleware/tenantLoader';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';
import apiRoutes from './api/routes';
import { seedSuperAdmin } from './db/seed/seedSuperAdmin';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    logger.info('🚀 Starting Veterinary ERP SaaS Server...');

    await initializeRedis();

    // Enable trust proxy for Replit environment and enterprise deployments
    // Required for proper rate limiting and X-Forwarded-For header handling
    app.set('trust proxy', true);

    app.use(helmetMiddleware);
    app.use(corsMiddleware);
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(requestLogger);
    app.use(metricsMiddleware);

    app.get('/health', (req, res) => {
      res.json({ 
        success: true, 
        status: 'healthy', 
        message: 'Veterinary ERP Server - Level 1 Enterprise Infrastructure',
        timestamp: new Date().toISOString(),
      });
    });

    app.use('/api', apiRateLimiter, apiRoutes);

    // Cleanup tenant context after request completes
    app.use(tenantContextCleanup);

    app.use(notFoundHandler);
    app.use(errorHandler);

    await initializeSocket(httpServer);

    httpServer.listen(PORT, async () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`🏥 Veterinary ERP SaaS - Level 1 - Enterprise Infrastructure`);
      
      await seedSuperAdmin();

      startAllJobs();
      
      logger.info('🎉 All systems initialized successfully');
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();
