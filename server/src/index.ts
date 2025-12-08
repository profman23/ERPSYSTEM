/**
 * Server Entry Point
 * 
 * Initializes and starts the HTTP server with Socket.IO support.
 * The Express app is imported from ./app.ts (side-effect free for testing).
 */

import dotenv from 'dotenv';
import { createServer } from 'http';
import { app } from './app'; // Import configured Express app
import { initializeSocket } from './realtime/socket';
import { initializeRedis } from './services/redisClient';
import { startAllJobs } from './jobs';
import logger from './config/logger';
import { seedSuperAdmin } from './db/seed/seedSuperAdmin';
import { contextLogger } from './core/context';

dotenv.config();

const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    logger.info('🚀 Starting Veterinary ERP SaaS Server...');

    // Initialize Redis for caching and Socket.IO adapter
    await initializeRedis();

    // Initialize Socket.IO with HTTP server
    await initializeSocket(httpServer);

    httpServer.listen(PORT, async () => {
      contextLogger.info(`✅ Server running on port ${PORT}`);
      contextLogger.info(`🏥 Veterinary ERP SaaS - Platform Core Layer Active`);
      contextLogger.info(`📊 Health checks: /health, /health/ready, /health/live`);
      contextLogger.info(`🔗 API versions: /api/v1/*`);
      
      await seedSuperAdmin();

      startAllJobs();
      
      contextLogger.info('🎉 All systems initialized successfully');
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
