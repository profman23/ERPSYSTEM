/**
 * Server Entry Point
 * 
 * Initializes and starts the HTTP server with Socket.IO support.
 * The Express app is imported from ./app.ts (side-effect free for testing).
 */

import './config/env'; // Validate env vars FIRST — fail fast if missing
import { createServer } from 'http';
import { app } from './app'; // Import configured Express app
import { initializeSocket } from './realtime/socket';
import { initializeRedis, closeRedis } from './services/redisClient';
import { startAllJobs } from './jobs';
import logger from './config/logger';
import { seedSuperAdmin } from './db/seed/seedSuperAdmin';
import { syncAllTenantsDPF } from './db/seed/seedDPFStructure';
import { DocumentNumberSeriesService } from './services/DocumentNumberSeriesService';
import { contextLogger } from './core/context';

const httpServer = createServer(app);
const PORT = process.env.SERVER_PORT || process.env.PORT || 5500;

// ===================================================================
// GRACEFUL SHUTDOWN
// ===================================================================

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`\n🛑 ${signal} received - starting graceful shutdown...`);

  // Stop accepting new connections
  httpServer.close(() => {
    logger.info('✅ HTTP server closed - no new connections');
  });

  // Give in-flight requests time to complete (30s max)
  const shutdownTimeout = setTimeout(() => {
    logger.error('⚠️ Graceful shutdown timed out after 30s - forcing exit');
    process.exit(1);
  }, 30000);

  try {
    // Close Redis connection
    await closeRedis();
    logger.info('✅ Redis connection closed');
  } catch (err) {
    logger.error('⚠️ Error closing Redis:', err);
  }

  try {
    // Close database pool
    const { pool } = await import('./db/index');
    if (pool) {
      await pool.end();
      logger.info('✅ Database pool closed');
    }
  } catch (err) {
    logger.error('⚠️ Error closing database pool:', err);
  }

  clearTimeout(shutdownTimeout);
  logger.info('🏁 Graceful shutdown complete');
  process.exit(0);
}

// ===================================================================
// SERVER STARTUP
// ===================================================================

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

      // Non-blocking: DPF sync runs in background after server is ready
      syncAllTenantsDPF().catch((err) =>
        logger.error('Background DPF sync failed:', err)
      );

      // Non-blocking: backfill runs in background
      DocumentNumberSeriesService.backfillExistingBranches().catch((err) =>
        logger.error('Background doc number backfill failed:', err)
      );

      startAllJobs();

      contextLogger.info('🎉 Server ready — background tasks running');
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ===================================================================
// PROCESS EVENT HANDLERS
// ===================================================================

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();
