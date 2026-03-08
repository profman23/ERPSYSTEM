/**
 * Declarative Route Metadata System - Phase 5 Backend Hardening
 * 
 * REPLACES: Implicit panel detection via string matching in autoPanelGuard
 * 
 * PURPOSE:
 * ========
 * 1. Every route MUST explicitly declare its access requirements
 * 2. No route can exist without declaring panel/scope/auth requirements
 * 3. Eliminates fragile string pattern matching
 * 4. Enables compile-time verification of route protection
 * 5. Future-proof: new routes must declare metadata or fail fast
 * 
 * METADATA STRUCTURE:
 * ==================
 * {
 *   panel: 'system' | 'admin' | 'app',      // Which panel owns this route
 *   requireAuth: boolean,                    // Authentication required
 *   requiredScope?: AccessScope[],           // Allowed user scopes
 *   description?: string                     // Route purpose (for docs)
 * }
 * 
 * USAGE:
 * ======
 * router.get('/path', 
 *   routeMetadata({ panel: 'system', requireAuth: true, requiredScope: ['system'] }),
 *   authMiddleware,
 *   controller
 * );
 */

import { Request, Response, NextFunction } from 'express';
import { contextLogger } from '../core/context/contextLogger';

export type AccessScope = 'system' | 'tenant' | 'business_line' | 'branch' | 'mixed';
export type PanelType = 'system' | 'admin' | 'app' | 'public';

export interface RouteMetadata {
  panel: PanelType;
  requireAuth: boolean;
  requiredScope?: AccessScope[];
  description?: string;
}

// Registry to track all routes with metadata (for auditing)
const routeRegistry = new Map<string, RouteMetadata>();

/**
 * Gets panel access rules
 */
function isPanelAccessAllowed(userScope: AccessScope, panel: PanelType): boolean {
  switch (panel) {
    case 'system':
      return userScope === 'system';
    case 'admin':
      // mixed scope = multi-branch user (SAP B1 style) — needs read access to admin APIs
      return userScope === 'system' || userScope === 'tenant' || userScope === 'mixed';
    case 'app':
      return true; // All authenticated users can access app panel
    case 'public':
      return true; // Public routes (login, etc.)
    default:
      return false;
  }
}

/**
 * Logs access violations for audit trail
 */
function logAccessViolation(
  req: Request,
  reason: string,
  metadata: RouteMetadata,
  details: Record<string, unknown>
) {
  const logger = contextLogger.child({ module: 'routeMetadata' });
  logger.error('🚨 ROUTE ACCESS VIOLATION', {
    reason,
    path: req.path,
    method: req.method,
    requiredPanel: metadata.panel,
    requiredScope: metadata.requiredScope,
    userId: req.user?.userId,
    userScope: req.user?.accessScope,
    userTenantId: req.user?.tenantId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    ...details,
  });
}

/**
 * Declarative route metadata middleware
 * 
 * ENFORCES:
 * - Panel access control
 * - Scope validation
 * - Authentication requirements
 * 
 * MUST be the FIRST middleware on every route (before authMiddleware)
 * This attaches metadata to the request for downstream validation
 */
export function routeMetadata(metadata: RouteMetadata) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Attach metadata to request for downstream middleware
    (req as any).routeMetadata = metadata;

    // Register route for auditing (only in development)
    if (process.env.NODE_ENV !== 'production') {
      const routeKey = `${req.method} ${req.route?.path || req.path}`;
      if (!routeRegistry.has(routeKey)) {
        routeRegistry.set(routeKey, metadata);
      }
    }

    next();
  };
}

/**
 * Route metadata enforcer middleware
 * 
 * CRITICAL ARCHITECTURAL PATTERN:
 * ===============================
 * This middleware MUST run AFTER authMiddleware to ensure:
 * 1. req.user is populated (if token is valid)
 * 2. Enforcement ALWAYS happens (even if auth fails)
 * 
 * KEY INSIGHT: This middleware runs REGARDLESS of auth outcome
 * - If requireAuth=true and no user → 401
 * - If requireAuth=false → allow through
 * - If user exists → validate scope/panel access
 * 
 * This ensures NO route can bypass authorization checks
 */
export function enforceRouteMetadata() {
  return (req: Request, res: Response, next: NextFunction) => {
    const metadata = (req as any).routeMetadata as RouteMetadata | undefined;
    const logger = contextLogger.child({ module: 'routeMetadata' });

    // If no metadata, route is misconfigured - FAIL FAST
    if (!metadata) {
      logger.error('🚨 CRITICAL: Route missing metadata declaration', {
        path: req.path,
        method: req.method,
      });
      return res.status(500).json({
        error: 'Internal server error: Route misconfiguration',
        code: 'ROUTE_METADATA_MISSING',
      });
    }

    // Check authentication requirement FIRST
    if (metadata.requireAuth && !req.user) {
      logger.warn('Unauthenticated access attempt to protected route', {
        path: req.path,
        method: req.method,
        panel: metadata.panel,
      });
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Public routes with no auth - allow immediately
    if (metadata.panel === 'public' && !metadata.requireAuth) {
      return next();
    }

    // If not authenticated and route doesn't require auth, allow
    if (!req.user && !metadata.requireAuth) {
      return next();
    }

    // From this point, user MUST be authenticated
    if (!req.user) {
      logger.error('LOGIC ERROR: User required but not authenticated', {
        path: req.path,
        metadata,
      });
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const userScope = (req.user.accessScope || 'branch') as AccessScope;

    // Panel access validation
    if (!isPanelAccessAllowed(userScope, metadata.panel)) {
      logAccessViolation(req, 'Panel access denied', metadata, {
        userScope,
        requiredPanel: metadata.panel,
      });
      return res.status(403).json({
        error: `Access denied. You don't have permission to access ${metadata.panel} APIs.`,
        code: 'PANEL_ACCESS_DENIED',
      });
    }

    // Scope validation (if specified)
    if (metadata.requiredScope && metadata.requiredScope.length > 0) {
      if (!metadata.requiredScope.includes(userScope)) {
        logAccessViolation(req, 'Scope access denied', metadata, {
          userScope,
          requiredScope: metadata.requiredScope,
        });
        return res.status(403).json({
          error: 'Access denied. Insufficient permissions.',
          code: 'SCOPE_ACCESS_DENIED',
        });
      }
    }

    // All validations passed
    logger.debug('Route access granted', {
      path: req.path,
      method: req.method,
      panel: metadata.panel,
      userScope,
    });

    next();
  };
}

/**
 * Audit helper: Get all registered routes
 * Useful for verifying all routes have metadata
 */
export function getRouteRegistry(): Map<string, RouteMetadata> {
  return new Map(routeRegistry);
}

/**
 * Audit helper: Check for routes without metadata
 * Returns array of routes that may be unprotected
 */
export function auditRouteProtection(): string[] {
  const unprotectedRoutes: string[] = [];
  
  // In production, this would scan the Express router
  // For now, return empty array (registry tracks declared routes)
  
  return unprotectedRoutes;
}

// Export helper to create common metadata patterns
export const RoutePatterns = {
  systemOnly: (description?: string): RouteMetadata => ({
    panel: 'system',
    requireAuth: true,
    requiredScope: ['system'],
    description,
  }),
  
  adminPanel: (description?: string): RouteMetadata => ({
    panel: 'admin',
    requireAuth: true,
    requiredScope: ['system', 'tenant', 'mixed'],
    description,
  }),
  
  appPanel: (description?: string): RouteMetadata => ({
    panel: 'app',
    requireAuth: true,
    description,
  }),
  
  publicRoute: (description?: string): RouteMetadata => ({
    panel: 'public',
    requireAuth: false,
    description,
  }),
};
