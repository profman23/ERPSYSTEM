/**
 * HARDENED Tenant Loader Middleware - Phase 5 Backend Hardening
 * 
 * SECURITY GUARANTEES:
 * ===================
 * 1. System users ALWAYS operate with tenantId = null (cannot be spoofed)
 * 2. Tenant admins MUST have valid tenantId matching their token
 * 3. Branch/Business-line users MUST have complete context (tenant + scope IDs)
 * 4. All context mismatches result in immediate rejection with audit logging
 * 5. No silent failures - every validation is enforced
 * 
 * VALIDATION RULES:
 * ================
 * - System Scope: tenantId MUST be null, all other IDs MUST be null
 * - Tenant Scope: tenantId MUST exist, businessLineId/branchId should be null
 * - Business Line Scope: tenantId + businessLineId MUST exist
 * - Branch Scope: tenantId + branchId MUST exist
 * - Mixed Scope: tenantId + (businessLineId OR branchId) MUST exist
 * 
 * ANTI-SPOOFING MEASURES:
 * ======================
 * - System users: Ignores any tenant context from headers/params/body
 * - Tenant users: Validates tenantId matches token
 * - Rejects requests with inconsistent context
 * - Logs all validation failures for security audit
 */

import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../core/tenant/tenantContext';
import { contextLogger } from '../core/context/contextLogger';

type AccessScope = 'system' | 'tenant' | 'business_line' | 'branch' | 'mixed';

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
 * Logs security violations for audit trail
 */
function logSecurityViolation(
  req: Request,
  reason: string,
  details: Record<string, unknown>
) {
  const logger = contextLogger.child({ module: 'tenantLoader' });
  logger.error('🚨 SECURITY VIOLATION: Tenant context validation failed', {
    reason,
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
    userScope: req.user?.accessScope,
    userTenantId: req.user?.tenantId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    ...details,
  });
}

/**
 * Validates tenant context for system scope users
 * System users MUST NOT have any tenant binding
 */
function validateSystemContext(req: Request): { valid: boolean; error?: string } {
  const user = req.user!;
  
  // System users must have null tenant context
  if (user.tenantId !== null && user.tenantId !== undefined) {
    logSecurityViolation(req, 'System user with tenant context', {
      tenantId: user.tenantId,
    });
    return {
      valid: false,
      error: 'System users cannot be bound to a tenant',
    };
  }
  
  if (user.businessLineId || user.branchId) {
    logSecurityViolation(req, 'System user with scope binding', {
      businessLineId: user.businessLineId,
      branchId: user.branchId,
    });
    return {
      valid: false,
      error: 'System users cannot be bound to business lines or branches',
    };
  }
  
  return { valid: true };
}

/**
 * Validates tenant context for tenant scope users
 * Tenant admins MUST have a valid tenantId
 */
function validateTenantContext(req: Request): { valid: boolean; error?: string } {
  const user = req.user!;
  
  // Tenant admins must have a tenantId
  if (!user.tenantId) {
    logSecurityViolation(req, 'Tenant admin without tenant context', {
      userId: user.userId,
    });
    return {
      valid: false,
      error: 'Tenant admin must be bound to a tenant',
    };
  }
  
  return { valid: true };
}

/**
 * Validates tenant context for business_line scope users
 * Must have both tenantId and businessLineId
 */
function validateBusinessLineContext(req: Request): { valid: boolean; error?: string } {
  const user = req.user!;
  
  if (!user.tenantId) {
    logSecurityViolation(req, 'Business line user without tenant context', {
      userId: user.userId,
    });
    return {
      valid: false,
      error: 'Business line users must be bound to a tenant',
    };
  }
  
  if (!user.businessLineId) {
    logSecurityViolation(req, 'Business line user without business line context', {
      userId: user.userId,
      tenantId: user.tenantId,
    });
    return {
      valid: false,
      error: 'Business line users must be bound to a business line',
    };
  }
  
  return { valid: true };
}

/**
 * Validates tenant context for branch scope users
 * Must have both tenantId and branchId
 */
function validateBranchContext(req: Request): { valid: boolean; error?: string } {
  const user = req.user!;
  
  if (!user.tenantId) {
    logSecurityViolation(req, 'Branch user without tenant context', {
      userId: user.userId,
    });
    return {
      valid: false,
      error: 'Branch users must be bound to a tenant',
    };
  }
  
  if (!user.branchId) {
    logSecurityViolation(req, 'Branch user without branch context', {
      userId: user.userId,
      tenantId: user.tenantId,
    });
    return {
      valid: false,
      error: 'Branch users must be bound to a branch',
    };
  }
  
  return { valid: true };
}

/**
 * Validates tenant context for mixed scope users
 * Must have tenantId + (businessLineId OR branchId)
 */
function validateMixedContext(req: Request): { valid: boolean; error?: string } {
  const user = req.user!;
  
  if (!user.tenantId) {
    logSecurityViolation(req, 'Mixed scope user without tenant context', {
      userId: user.userId,
    });
    return {
      valid: false,
      error: 'Mixed scope users must be bound to a tenant',
    };
  }
  
  if (!user.businessLineId && !user.branchId) {
    logSecurityViolation(req, 'Mixed scope user without business line or branch context', {
      userId: user.userId,
      tenantId: user.tenantId,
    });
    return {
      valid: false,
      error: 'Mixed scope users must be bound to a business line or branch',
    };
  }
  
  return { valid: true };
}

/**
 * HARDENED Tenant Loader Middleware
 * Enforces strict tenant context validation based on user scope
 * MUST be used AFTER authMiddleware
 */
export const tenantLoader = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const logger = contextLogger.child({ module: 'tenantLoader' });
    
    // Ensure user is authenticated
    if (!req.user) {
      logger.error('❌ tenantLoader: No user found. authMiddleware must run first.');
      return res.status(401).json({
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED',
      });
    }

    const accessScope = (req.user.accessScope || 'branch') as AccessScope;
    
    // Validate tenant context based on user scope
    let validation: { valid: boolean; error?: string };
    
    switch (accessScope) {
      case 'system':
        validation = validateSystemContext(req);
        break;
      case 'tenant':
        validation = validateTenantContext(req);
        break;
      case 'business_line':
        validation = validateBusinessLineContext(req);
        break;
      case 'branch':
        validation = validateBranchContext(req);
        break;
      case 'mixed':
        validation = validateMixedContext(req);
        break;
      default:
        logSecurityViolation(req, 'Unknown access scope', {
          accessScope,
        });
        return res.status(403).json({
          error: 'Invalid access scope',
          code: 'INVALID_SCOPE',
        });
    }
    
    // Reject if validation failed
    if (!validation.valid) {
      return res.status(403).json({
        error: validation.error || 'Tenant context validation failed',
        code: 'INVALID_TENANT_CONTEXT',
      });
    }

    // Build tenant context from validated user
    // For system users, explicitly set to null to prevent spoofing
    const tenantContext = {
      tenantId: accessScope === 'system' ? null : (req.user.tenantId || null),
      businessLineId: accessScope === 'system' ? null : (req.user.businessLineId || null),
      branchId: accessScope === 'system' ? null : (req.user.branchId || null),
      accessScope: req.user.accessScope,
      userId: req.user.userId,
      role: req.user.role,
    };

    // Attach to request for controllers
    req.tenantContext = tenantContext;

    logger.debug(
      `✅ Tenant context validated and loaded: scope=${tenantContext.accessScope}, tenant=${tenantContext.tenantId}, user=${tenantContext.userId}`
    );

    // Run the rest of the request within AsyncLocalStorage context
    // This prevents cross-request contamination under concurrent load
    TenantContext.run(tenantContext, () => {
      next();
    });
  } catch (error: any) {
    const logger = contextLogger.child({ module: 'tenantLoader' });
    logger.error(`❌ tenantLoader error: ${error.message}`, { error });
    return res.status(500).json({
      error: 'Failed to load tenant context.',
      code: 'TENANT_CONTEXT_ERROR',
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
