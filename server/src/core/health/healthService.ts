/**
 * Platform Core Layer - Health Service
 * Enterprise-grade health checks following Kubernetes patterns
 */

import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { getRedisClient } from '../../services/redisClient';
import {
  HealthStatus,
  ComponentHealth,
  SystemHealth,
  SystemMetrics,
  ReadinessCheck,
  LivenessProbe,
} from './types';

const startTime = Date.now();
const VERSION = process.env.npm_package_version || '1.0.0';
const ENVIRONMENT = process.env.NODE_ENV || 'development';

class HealthService {
  private readinessChecks: ReadinessCheck[] = [];

  constructor() {
    this.registerDefaultChecks();
  }

  /**
   * Register default health checks
   */
  private registerDefaultChecks(): void {
    this.registerCheck({
      name: 'database',
      critical: true,
      timeout: 5000,
      check: async () => this.checkDatabase(),
    });

    this.registerCheck({
      name: 'redis',
      critical: false,
      timeout: 3000,
      check: async () => this.checkRedis(),
    });
  }

  /**
   * Register a new readiness check
   */
  registerCheck(check: ReadinessCheck): void {
    this.readinessChecks.push(check);
  }

  /**
   * Basic liveness probe (is the process alive?)
   */
  async getLiveness(): Promise<LivenessProbe> {
    return {
      status: 'alive',
      timestamp: new Date(),
      pid: process.pid,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };
  }

  /**
   * Full readiness check (all components ready?)
   */
  async getReadiness(): Promise<SystemHealth> {
    const components: ComponentHealth[] = [];
    let overallStatus: HealthStatus = 'healthy';

    for (const check of this.readinessChecks) {
      try {
        const result = await Promise.race([
          check.check(),
          new Promise<ComponentHealth>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Health check timeout: ${check.name}`)),
              check.timeout || 5000
            )
          ),
        ]);
        components.push(result);

        if (result.status === 'unhealthy' && check.critical) {
          overallStatus = 'unhealthy';
        } else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
          overallStatus = 'degraded';
        }
      } catch (error: any) {
        components.push({
          name: check.name,
          status: 'unhealthy',
          message: error.message,
          lastCheck: new Date(),
        });

        if (check.critical) {
          overallStatus = 'unhealthy';
        }
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: VERSION,
      environment: ENVIRONMENT,
      components,
      metrics: this.getSystemMetrics(),
    };
  }

  /**
   * Simple health check (basic + essential components)
   */
  async getHealth(): Promise<{ status: string; timestamp: Date }> {
    return {
      status: 'ok',
      timestamp: new Date(),
    };
  }

  /**
   * Database health check
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      return {
        name: 'database',
        status: 'healthy',
        latency: Date.now() - start,
        message: 'PostgreSQL connected',
        lastCheck: new Date(),
        metadata: {
          type: 'postgresql',
          provider: 'neon',
        },
      };
    } catch (error: any) {
      return {
        name: 'database',
        status: 'unhealthy',
        latency: Date.now() - start,
        message: error.message,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Redis health check
   */
  private async checkRedis(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      const redis = getRedisClient();
      if (!redis) {
        return {
          name: 'redis',
          status: 'degraded',
          latency: Date.now() - start,
          message: 'Redis not configured (graceful degradation)',
          lastCheck: new Date(),
        };
      }

      await redis.ping();
      return {
        name: 'redis',
        status: 'healthy',
        latency: Date.now() - start,
        message: 'Redis connected',
        lastCheck: new Date(),
      };
    } catch (error: any) {
      return {
        name: 'redis',
        status: 'degraded',
        latency: Date.now() - start,
        message: `Redis unavailable: ${error.message}`,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Get system metrics
   */
  private getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
        percentUsed: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
    };
  }
}

export const healthService = new HealthService();
export default healthService;
