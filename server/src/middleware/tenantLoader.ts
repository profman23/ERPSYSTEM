import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../core/tenant/tenantContext';
import logger from '../config/logger';

// Extend Express Request to include tenantContext
declare global {
  namespace Express {
    interface Request {
      tenantContext?: {
        tenantId: string | null;
        businessLineId: string | null;
        branchId: string | null;
        accessScope: string;
        userId: string;
        role: string;
      };
    }
  }
}

/**
 * Tenant Loader Middleware
 * Populates tenantContext from authenticated user using AsyncLocalStorage
 * MUST be used AFTER authMiddleware
 * Safe for concurrent requests - no cross-contamination
 */
export const tenantLoader = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      logger.error('❌ tenantLoader: No user found. authMiddleware must run first.');
      return res.status(401).json({
        error: 'Authentication required.',
      });
    }

    // Build tenant context from user
    const tenantContext = {
      tenantId: req.user.tenantId,
      businessLineId: req.user.businessLineId,
      branchId: req.user.branchId,
      accessScope: req.user.accessScope,
      userId: req.user.userId,
      role: req.user.role,
    };

    // Attach to request for controllers
    req.tenantContext = tenantContext;

    logger.debug(
      `✅ Tenant context loaded: tenant=${tenantContext.tenantId}, scope=${tenantContext.accessScope}, user=${tenantContext.userId}`
    );

    // Run the rest of the request within AsyncLocalStorage context
    // This prevents cross-request contamination under concurrent load
    TenantContext.run(tenantContext, () => {
      next();
    });
  } catch (error: any) {
    logger.error(`❌ tenantLoader error: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to load tenant context.',
    });
  }
};

/**
 * Cleanup middleware (no-op for AsyncLocalStorage)
 * AsyncLocalStorage automatically clears context when request ends
 * Keeping for backward compatibility
 */
export const tenantContextCleanup = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // No cleanup needed - AsyncLocalStorage handles lifecycle automatically
  next();
};
