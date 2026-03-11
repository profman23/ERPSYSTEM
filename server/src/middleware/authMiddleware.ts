import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { RequestContext } from '../core/context';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        accessScope: string;
        tenantId: string | null;
        businessLineId: string | null;
        branchId: string | null;
      };
    }
  }
}

/**
 * PASSIVE Authentication Middleware - Phase 5 Backend Hardening
 * 
 * CRITICAL ARCHITECTURAL CHANGE:
 * ==============================
 * This middleware ALWAYS calls next(), even if authentication fails.
 * It sets req.user if token is valid, leaves it undefined otherwise.
 * 
 * Authorization enforcement happens in enforceRouteMetadata(), which runs
 * AFTER this middleware and checks if req.user is present when required.
 * 
 * This pattern ensures:
 * 1. enforceRouteMetadata() ALWAYS executes (deterministic)
 * 2. Authorization cannot be bypassed (mathematical guarantee)
 * 3. Route protection doesn't depend on auth middleware implementation
 * 
 * WHY THIS MATTERS:
 * If authMiddleware returns early, enforceRouteMetadata() never runs,
 * breaking the security guarantee that all routes are protected.
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // CRITICAL: Don't reject here, let enforceRouteMetadata() handle it
      req.user = undefined;
      return next();
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify and decode token
      const decoded = AuthService.verifyToken(token);

      // Attach user to request
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
        accessScope: decoded.accessScope,
        tenantId: decoded.tenantId,
        businessLineId: decoded.businessLineId,
        branchId: decoded.branchId,
      };

      // Enrich RequestContext with auth data (for audit trail, logging, etc.)
      const context = RequestContext.get();
      if (context) {
        context.tenantId = decoded.tenantId;
        context.userId = decoded.userId;
        context.branchId = decoded.branchId;
        context.businessLineId = decoded.businessLineId;
        context.accessScope = decoded.accessScope;
        context.role = decoded.role;
      }
    } catch (error: any) {
      // Token verification failed - leave req.user undefined
      // Let enforceRouteMetadata() reject the request
      req.user = undefined;
    }

    next();
  } catch (error: any) {
    // Unexpected error - leave req.user undefined and continue
    req.user = undefined;
    next();
  }
};
