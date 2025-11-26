/**
 * Platform Core Layer - Health Check Routes
 * Kubernetes-compatible health endpoints
 */

import { Router, Request, Response } from 'express';
import { healthService } from './healthService';

const router = Router();

/**
 * GET /health
 * Basic health check - returns 200 if service is running
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const health = await healthService.getHealth();
    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /health/live
 * Kubernetes liveness probe
 * Returns 200 if process is alive
 */
router.get('/live', async (_req: Request, res: Response) => {
  try {
    const liveness = await healthService.getLiveness();
    res.status(200).json(liveness);
  } catch (error) {
    res.status(503).json({
      status: 'dead',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /health/ready
 * Kubernetes readiness probe
 * Returns 200 only if all critical dependencies are available
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const readiness = await healthService.getReadiness();
    const statusCode = readiness.status === 'healthy' ? 200 :
                       readiness.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(readiness);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date(),
      error: error.message,
    });
  }
});

/**
 * GET /health/startup
 * Kubernetes startup probe
 * Returns 200 once the application has fully started
 */
router.get('/startup', async (_req: Request, res: Response) => {
  try {
    const readiness = await healthService.getReadiness();
    const isStarted = readiness.status !== 'unhealthy';
    res.status(isStarted ? 200 : 503).json({
      started: isStarted,
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(503).json({
      started: false,
      timestamp: new Date(),
      error: error.message,
    });
  }
});

export default router;
