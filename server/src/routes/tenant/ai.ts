/**
 * Tenant AI Routes - /api/tenant/ai/*
 * Tenant-specific AI features: chat, settings, approvals, analytics
 *
 * Screen Codes:
 * - ADMIN_AI_SETTINGS: AI settings
 * - ADMIN_AI_APPROVALS: AI approvals
 * - ADMIN_AI_ANALYTICS: AI analytics
 * - ADMIN_AI_LOGS: AI logs
 */

import { Router, Request, Response, NextFunction } from 'express';
import { agiEngine } from '../../ai/engine/agiEngine';
import { AgiSettingsService } from '../../services/AgiSettingsService';
import { AgiUsageService } from '../../services/AgiUsageService';
import { AgiApprovalsService } from '../../services/AgiApprovalsService';
import { AgiLogsService } from '../../services/AgiLogsService';
import { TenantContext } from '../../core/tenant/tenantContext';
import { z } from 'zod';

const router = Router();

// Helper to get tenant ID from request
async function getTenantId(req: Request): Promise<string | null> {
  const tenantContext = (req as any).tenantContext;
  if (!tenantContext) return null;

  if (tenantContext.accessScope === 'system') {
    return await TenantContext.getSystemTenantId();
  }
  return tenantContext.tenantId || null;
}

// Helper to get user ID from request
function getUserId(req: Request): string | null {
  return (req as any).user?.userId || null;
}

// ═══════════════════════════════════════════════════════════════
// CHAT ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/tenant/ai/chat
 * Send a message to the AI assistant
 */
const chatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  context: z.object({
    currentPage: z.string().optional(),
    currentModule: z.string().optional(),
    selectedItems: z.array(z.string()).optional(),
    locale: z.enum(['en', 'ar']).optional(),
  }).optional(),
  formFillState: z.object({
    sessionId: z.string().optional(),
    entity: z.string(),
    action: z.enum(['CREATE', 'UPDATE']),
    collectedFields: z.record(z.unknown()),
    missingRequired: z.array(z.string()),
    isComplete: z.boolean(),
    confirmedByUser: z.boolean(),
  }).optional(),
  history: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).max(20).optional(),
});

router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = await getTenantId(req);
    const userId = getUserId(req);

    if (!tenantId || !userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const request = chatRequestSchema.parse(req.body);
    const response = await agiEngine.processChat(tenantId, userId, request);

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
 * POST /api/tenant/ai/chat/stream
 * Stream a chat response (Server-Sent Events)
 */
router.post('/chat/stream', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = await getTenantId(req);
    const userId = getUserId(req);

    if (!tenantId || !userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const request = chatRequestSchema.parse(req.body);

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream the response
    for await (const chunk of agiEngine.streamChat(tenantId, userId, request)) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.end();
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
// SETTINGS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/tenant/ai/settings
 * Get AI settings for the tenant
 */
router.get('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = await getTenantId(req);

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Tenant context required',
      });
      return;
    }

    const settings = await AgiSettingsService.getSettings(tenantId);
    const isClaudeAvailable = await agiEngine.isClaudeAvailable();

    res.json({
      success: true,
      data: {
        ...settings,
        claudeAvailable: isClaudeAvailable,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenant/ai/settings
 * Update AI settings for the tenant
 */
const updateSettingsSchema = z.object({
  isEnabled: z.boolean().optional(),
  allowVoiceCommands: z.boolean().optional(),
  allowAutonomousActions: z.boolean().optional(),
  requireApprovalForDestructive: z.boolean().optional(),
  defaultModel: z.string().optional(),
  maxTokensPerRequest: z.number().min(100).max(100000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  dailyRequestLimit: z.number().min(0).optional(),
  monthlyRequestLimit: z.number().min(0).optional(),
  defaultAgiLevel: z.enum(['NO_ACCESS', 'READ_ONLY', 'SUGGEST', 'AUTOMATE', 'AUTONOMOUS']).optional(),
  customSystemPrompt: z.string().max(10000).nullable().optional(),
});

router.put('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = await getTenantId(req);

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Tenant context required',
      });
      return;
    }

    const input = updateSettingsSchema.parse(req.body);
    const settings = await AgiSettingsService.updateSettings(tenantId, input);

    res.json({
      success: true,
      message: 'Settings updated',
      data: settings,
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
// APPROVALS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/tenant/ai/approvals
 * Get pending approvals for the tenant
 */
router.get('/approvals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = await getTenantId(req);

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Tenant context required',
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await AgiApprovalsService.getPendingApprovals(tenantId, page, limit);

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
 * GET /api/tenant/ai/approvals/count
 * Get pending approval count (for notifications)
 */
router.get('/approvals/count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = await getTenantId(req);

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Tenant context required',
      });
      return;
    }

    const count = await AgiApprovalsService.getPendingCount(tenantId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenant/ai/approvals/:id
 * Get a specific approval
 */
router.get('/approvals/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = await getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Tenant context required',
      });
      return;
    }

    const approval = await AgiApprovalsService.getById(tenantId, id);

    if (!approval) {
      res.status(404).json({
        success: false,
        error: 'Approval not found',
      });
      return;
    }

    res.json({
      success: true,
      data: approval,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenant/ai/approvals/:id/approve
 * Approve an action
 */
router.post('/approvals/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = await getTenantId(req);
    const userId = getUserId(req);
    const { id } = req.params;

    if (!tenantId || !userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const approval = await AgiApprovalsService.approve(tenantId, id, userId);

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
      if (error.message.includes('Cannot approve') || error.message.includes('expired')) {
        res.status(400).json({
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
 * POST /api/tenant/ai/approvals/:id/reject
 * Reject an action
 */
const rejectSchema = z.object({
  reason: z.string().max(1000).optional(),
});

router.post('/approvals/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = await getTenantId(req);
    const userId = getUserId(req);
    const { id } = req.params;

    if (!tenantId || !userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const { reason } = rejectSchema.parse(req.body);
    const approval = await AgiApprovalsService.reject(tenantId, id, userId, reason);

    res.json({
      success: true,
      message: 'Approval rejected',
      data: approval,
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
// ANALYTICS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/tenant/ai/analytics
 * Get AI analytics for the tenant
 */
router.get('/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = await getTenantId(req);

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Tenant context required',
      });
      return;
    }

    // Default to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    if (req.query.startDate) {
      startDate.setTime(new Date(req.query.startDate as string).getTime());
    }
    if (req.query.endDate) {
      endDate.setTime(new Date(req.query.endDate as string).getTime());
    }

    const analytics = await AgiUsageService.getAnalytics(tenantId, startDate, endDate);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenant/ai/usage
 * Get current usage stats
 */
router.get('/usage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = await getTenantId(req);

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Tenant context required',
      });
      return;
    }

    const settings = await AgiSettingsService.getSettings(tenantId);
    const stats = await AgiUsageService.getUsageStats(
      tenantId,
      settings.dailyRequestLimit,
      settings.monthlyRequestLimit
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
// LOGS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/tenant/ai/logs
 * Get AI logs for the tenant
 */
const logsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  status: z.enum(['SUCCESS', 'FAILED', 'REQUIRES_APPROVAL', 'DENIED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = await getTenantId(req);

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Tenant context required',
      });
      return;
    }

    const query = logsQuerySchema.parse(req.query);

    const result = await AgiLogsService.getLogs(
      tenantId,
      {
        userId: query.userId,
        status: query.status,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        search: query.search,
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

// ═══════════════════════════════════════════════════════════════
// STATUS ROUTE
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/tenant/ai/status
 * Get AI status for the tenant
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = await getTenantId(req);

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Tenant context required',
      });
      return;
    }

    const [settings, isClaudeAvailable, pendingCount] = await Promise.all([
      AgiSettingsService.getSettings(tenantId),
      agiEngine.isClaudeAvailable(),
      AgiApprovalsService.getPendingCount(tenantId),
    ]);

    res.json({
      success: true,
      data: {
        isEnabled: settings.isEnabled,
        claudeAvailable: isClaudeAvailable,
        mode: isClaudeAvailable ? 'FULL' : 'LIMITED',
        pendingApprovals: pendingCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
