/**
 * Health Check Routes
 *
 * Comprehensive health monitoring for 3000+ tenant environments
 * Supports Kubernetes/Docker health probes and monitoring systems
 *
 * Endpoints:
 * - GET /health - Quick liveness check
 * - GET /health/ready - Readiness check (all dependencies)
 * - GET /health/metrics - Detailed system metrics
 * - GET /health/dependencies - Individual dependency status
 */

import { Router, Request, Response } from 'express';
import { db, getPoolStats } from '../../db';
import { sql } from 'drizzle-orm';
import { getRedisClient } from '../../services/redisClient';
import { cacheService } from '../../services/CacheService';

const router = Router();

// Track server start time
const serverStartTime = Date.now();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
}

interface DependencyCheck {
  name: string;
  status: 'up' | 'down' | 'degraded';
  latencyMs?: number;
  message?: string;
}

interface ReadinessResponse extends HealthStatus {
  ready: boolean;
  checks: {
    database: boolean;
    redis: boolean;
    cache: boolean;
  };
  dependencies: DependencyCheck[];
}

interface MetricsResponse extends HealthStatus {
  system: {
    memoryUsageMB: number;
    memoryTotalMB: number;
    memoryPercentage: number;
    cpuUsage?: number;
    nodeVersion: string;
    platform: string;
  };
  pool: {
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
  };
  cache: {
    l1Size: number;
    l1HitRatio: number;
    evictions: number;
  };
  redis: {
    connected: boolean;
    latencyMs?: number;
  };
}

/**
 * GET /health
 * Quick liveness check - returns 200 if server is running
 * Used by load balancers and orchestrators
 */
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
  } as HealthStatus);
});

/**
 * GET /health/ready
 * Readiness check - verifies all dependencies are available
 * Used by Kubernetes readiness probes
 */
router.get('/ready', async (req: Request, res: Response) => {
  const checks = {
    database: false,
    redis: false,
    cache: false,
  };
  const dependencies: DependencyCheck[] = [];

  // Check Database
  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = true;
    dependencies.push({
      name: 'PostgreSQL',
      status: 'up',
      latencyMs: Date.now() - dbStart,
    });
  } catch (error: any) {
    dependencies.push({
      name: 'PostgreSQL',
      status: 'down',
      message: error.message,
    });
  }

  // Check Redis
  const redis = getRedisClient();
  const redisStart = Date.now();
  try {
    if (redis && redis.status === 'ready') {
      await redis.ping();
      checks.redis = true;
      dependencies.push({
        name: 'Redis',
        status: 'up',
        latencyMs: Date.now() - redisStart,
      });
    } else {
      dependencies.push({
        name: 'Redis',
        status: 'down',
        message: redis ? `Status: ${redis.status}` : 'Not initialized',
      });
    }
  } catch (error: any) {
    dependencies.push({
      name: 'Redis',
      status: 'down',
      message: error.message,
    });
  }

  // Check Cache Service
  try {
    const stats = await cacheService.getStats();
    checks.cache = stats?.hitRatio !== undefined;
    dependencies.push({
      name: 'CacheService',
      status: checks.cache ? 'up' : 'degraded',
      message: checks.cache ? `Hit ratio: ${((stats?.hitRatio ?? 0) * 100).toFixed(1)}%` : 'No stats available',
    });
  } catch (error: any) {
    dependencies.push({
      name: 'CacheService',
      status: 'degraded',
      message: error.message,
    });
  }

  const allHealthy = checks.database && checks.redis;
  const isReady = checks.database; // Minimum requirement: database must be up

  const response: ReadinessResponse = {
    status: allHealthy ? 'healthy' : isReady ? 'degraded' : 'unhealthy',
    ready: isReady,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    checks,
    dependencies,
  };

  res.status(isReady ? 200 : 503).json(response);
});

/**
 * GET /health/metrics
 * Detailed system metrics for monitoring dashboards
 */
router.get('/metrics', async (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const poolStats = getPoolStats?.() || { totalCount: 0, idleCount: 0, waitingCount: 0 };

  // Get cache stats
  let cacheStats = { size: 0, hitRatio: 0, evictions: 0 };
  try {
    const stats = await cacheService.getStats();
    cacheStats = {
      size: stats?.size || 0,
      hitRatio: stats?.hitRatio || 0,
      evictions: stats?.evictions || 0,
    };
  } catch {}

  // Check Redis latency
  let redisLatency: number | undefined;
  let redisConnected = false;
  const redis = getRedisClient();
  if (redis && redis.status === 'ready') {
    const start = Date.now();
    try {
      await redis.ping();
      redisLatency = Date.now() - start;
      redisConnected = true;
    } catch {}
  }

  const response: MetricsResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    system: {
      memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      memoryTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      memoryPercentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      nodeVersion: process.version,
      platform: process.platform,
    },
    pool: {
      totalConnections: poolStats.totalCount || 0,
      idleConnections: poolStats.idleCount || 0,
      waitingClients: poolStats.waitingCount || 0,
    },
    cache: {
      l1Size: cacheStats.size,
      l1HitRatio: cacheStats.hitRatio,
      evictions: cacheStats.evictions,
    },
    redis: {
      connected: redisConnected,
      latencyMs: redisLatency,
    },
  };

  res.json(response);
});

/**
 * GET /health/dependencies
 * Individual dependency status with detailed info
 */
router.get('/dependencies', async (req: Request, res: Response) => {
  const dependencies: DependencyCheck[] = [];

  // Database check with connection pool info
  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    const poolStats = getPoolStats?.() || {};
    dependencies.push({
      name: 'PostgreSQL',
      status: 'up',
      latencyMs: Date.now() - dbStart,
      message: `Pool: ${poolStats.totalCount || 0} total, ${poolStats.idleCount || 0} idle`,
    });
  } catch (error: any) {
    dependencies.push({
      name: 'PostgreSQL',
      status: 'down',
      message: error.message,
    });
  }

  // Redis check
  const redis = getRedisClient();
  const redisStart = Date.now();
  if (redis) {
    try {
      if (redis.status === 'ready') {
        await redis.ping();
        const info = await redis.info('memory');
        const usedMemory = info.match(/used_memory_human:(.+)/)?.[1]?.trim() || 'unknown';
        dependencies.push({
          name: 'Redis',
          status: 'up',
          latencyMs: Date.now() - redisStart,
          message: `Memory: ${usedMemory}`,
        });
      } else {
        dependencies.push({
          name: 'Redis',
          status: 'degraded',
          message: `Status: ${redis.status}`,
        });
      }
    } catch (error: any) {
      dependencies.push({
        name: 'Redis',
        status: 'down',
        message: error.message,
      });
    }
  } else {
    dependencies.push({
      name: 'Redis',
      status: 'down',
      message: 'Not configured',
    });
  }

  // Cache service check
  try {
    const stats = await cacheService.getStats();
    dependencies.push({
      name: 'L1 Cache',
      status: 'up',
      message: `Size: ${stats?.size || 0}, Hit ratio: ${((stats?.hitRatio || 0) * 100).toFixed(1)}%`,
    });
  } catch (error: any) {
    dependencies.push({
      name: 'L1 Cache',
      status: 'degraded',
      message: error.message,
    });
  }

  res.json({
    timestamp: new Date().toISOString(),
    dependencies,
    summary: {
      total: dependencies.length,
      up: dependencies.filter((d) => d.status === 'up').length,
      down: dependencies.filter((d) => d.status === 'down').length,
      degraded: dependencies.filter((d) => d.status === 'degraded').length,
    },
  });
});

export default router;
