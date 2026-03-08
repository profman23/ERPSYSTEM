/**
 * System AI Routes - /api/v1/system/ai/*
 * Platform-wide AI configuration, monitoring, and chat for System Admins
 *
 * Screen Codes:
 * - SYS_AI_CONFIG: AI configuration
 * - SYS_AI_MONITORING: AI monitoring
 * - SYS_AI_LOGS: AI logs
 */

import { Router, Request, Response, NextFunction } from 'express';
import { AgiSettingsService } from '../../services/AgiSettingsService';
import { AgiUsageService } from '../../services/AgiUsageService';
import { AgiLogsService } from '../../services/AgiLogsService';
import { AgiApprovalsService } from '../../services/AgiApprovalsService';
import { agiEngine } from '../../ai/engine/agiEngine';
import { db } from '../../db';
import { tenants } from '../../db/schemas';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Cache SYSTEM tenant ID
let cachedSystemTenantId: string | null = null;

async function getSystemTenantId(): Promise<string | null> {
  if (cachedSystemTenantId) return cachedSystemTenantId;

  const result = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.code, 'SYSTEM'))
    .limit(1);

  if (result.length > 0) {
    cachedSystemTenantId = result[0].id;
  }

  return cachedSystemTenantId;
}

const router = Router();

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/v1/system/ai/config
 * Get system-wide AI configuration
 */
router.get('/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await AgiSettingsService.getSystemConfig();
    const isClaudeAvailable = await agiEngine.isClaudeAvailable();

    res.json({
      success: true,
      data: {
        ...config,
        claudeAvailable: isClaudeAvailable,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/system/ai/config
 * Update system-wide AI configuration
 */
const updateConfigSchema = z.object({
  isAiEnabled: z.boolean().optional(),
  defaultModel: z.string().optional(),
  fallbackModel: z.string().optional(),
  allowTenantCustomPrompts: z.boolean().optional(),
  allowVoiceCommandsGlobally: z.boolean().optional(),
  maxTokensPerRequest: z.number().min(100).max(100000).optional(),
  globalRateLimitPerMinute: z.number().min(1).max(10000).optional(),
  enableDetailedLogging: z.boolean().optional(),
  logRetentionDays: z.number().min(1).max(365).optional(),
});

router.put('/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateConfigSchema.parse(req.body);
    const config = await AgiSettingsService.updateSystemConfig(input);

    res.json({
      success: true,
      message: 'AI configuration updated',
      data: config,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════
// MONITORING ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/v1/system/ai/monitoring
 * Get platform-wide AI monitoring stats
 */
router.get('/monitoring', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await AgiUsageService.getSystemMonitoring();
    const config = await AgiSettingsService.getSystemConfig();
    const isClaudeAvailable = await agiEngine.isClaudeAvailable();

    res.json({
      success: true,
      data: {
        ...stats,
        apiStatus: isClaudeAvailable ? 'HEALTHY' : 'DOWN',
        isAiEnabled: config.isAiEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/system/ai/monitoring/tenants
 * Get AI usage by tenant
 */
router.get('/monitoring/tenants', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await AgiUsageService.getSystemMonitoring();

    res.json({
      success: true,
      data: stats.topTenants,
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════
// LOGS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/v1/system/ai/logs
 * Get platform-wide AI logs
 */
const logsQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  status: z.enum(['SUCCESS', 'FAILED', 'REQUIRES_APPROVAL', 'DENIED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = logsQuerySchema.parse(req.query);

    const result = await AgiLogsService.getSystemLogs(
      {
        tenantId: query.tenantId,
        status: query.status,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      },
      query.page,
      query.limit
    );

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
});

/**
 * GET /api/v1/system/ai/logs/stats
 * Get log statistics
 */
router.get('/logs/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await AgiLogsService.getSystemStats(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// CHAT ROUTES (System Admin)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/system/ai/chat
 * System Admin chat with AI assistant
 */
const chatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  context: z.object({
    currentPage: z.string().optional(),
    currentModule: z.string().optional(),
    selectedItems: z.array(z.string()).optional(),
    locale: z.enum(['en', 'ar']).optional(),
  }).optional(),
});

router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // For system users, use SYSTEM tenant
    const systemTenantId = await getSystemTenantId();
    if (!systemTenantId) {
      res.status(500).json({
        success: false,
        error: 'System tenant not configured',
      });
      return;
    }

    const request = chatRequestSchema.parse(req.body);
    const response = await agiEngine.processChat(systemTenantId, userId, request);

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
});

/**
 * GET /api/v1/system/ai/approvals
 * Get pending approvals for system operations
 */
router.get('/approvals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const systemTenantId = await getSystemTenantId();
    if (!systemTenantId) {
      res.status(500).json({
        success: false,
        error: 'System tenant not configured',
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await AgiApprovalsService.getPendingApprovals(systemTenantId, page, limit);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/system/ai/approvals/:id/approve
 * Approve a system AI action
 */
router.post('/approvals/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const systemTenantId = await getSystemTenantId();
    if (!systemTenantId) {
      res.status(500).json({
        success: false,
        error: 'System tenant not configured',
      });
      return;
    }

    const approval = await AgiApprovalsService.approve(systemTenantId, id, userId);

    res.json({
      success: true,
      message: 'Approval granted',
      data: approval,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
    }
    next(error);
  }
});

/**
 * POST /api/v1/system/ai/approvals/:id/reject
 * Reject a system AI action
 */
router.post('/approvals/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const systemTenantId = await getSystemTenantId();
    if (!systemTenantId) {
      res.status(500).json({
        success: false,
        error: 'System tenant not configured',
      });
      return;
    }

    const reason = req.body?.reason;
    const approval = await AgiApprovalsService.reject(systemTenantId, id, userId, reason);

    res.json({
      success: true,
      message: 'Approval rejected',
      data: approval,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/v1/system/ai/health
 * Health check for AI subsystem
 */
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isClaudeAvailable = await agiEngine.isClaudeAvailable();
    const config = await AgiSettingsService.getSystemConfig();

    res.json({
      success: true,
      data: {
        status: config.isAiEnabled ? (isClaudeAvailable ? 'HEALTHY' : 'DEGRADED') : 'DISABLED',
        claudeApi: isClaudeAvailable ? 'CONNECTED' : 'NOT_CONFIGURED',
        patternMatching: 'AVAILABLE',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;
