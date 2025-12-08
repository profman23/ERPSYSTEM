/**
 * Scope Guard Middleware - HARDENED Multi-Tenant Access Control
 * 
 * PHASE 3 HARDENED - Dec 2024
 * 
 * SECURITY GUARANTEES:
 * 1. Panel-level access control (system/admin/app API segregation)
 * 2. Resource-level isolation (tenant/business_line/branch)
 * 3. Hierarchical scope enforcement
 * 4. Cross-tenant access prevention
 * 5. Audit trail for access violations
 * 
 * Access Hierarchy:
 * - SYSTEM scope: Full access to all panels and resources
 * - TENANT scope: Access to admin + app panels within their tenant
 * - BRANCH/BUSINESS_LINE/MIXED scope: Access to app panel only, within their scope
 */

import { Request, Response, NextFunction } from 'express';
import { contextLogger } from '../core/context/contextLogger';

type AccessScope = 'system' | 'tenant' | 'business_line' | 'branch' | 'mixed';
type PanelType = 'system' | 'admin' | 'app';

interface ScopeGuardOptions {
  requiredScope?: AccessScope;
  panel?: PanelType;
  allowElevatedAccess?: boolean;
  auditViolations?: boolean;
}

const SCOPE_HIERARCHY: Record<AccessScope, number> = {
  'system': 100,
  'tenant': 80,
  'mixed': 60,
  'business_line': 40,
  'branch': 20,
};

function getPanelFromPath(path: string): PanelType | null {
  // Frontend panel paths (for reference, not used in API)
  if (path.includes('/system/') || path.startsWith('/api/v1/system')) {
    return 'system';
  }
  if (path.includes('/admin/') || path.startsWith('/api/v1/admin')) {
    return 'admin';
  }
  if (path.includes('/app/') || path.startsWith('/api/v1/app')) {
    return 'app';
  }
  
  // API route patterns → panel mapping
  // System panel APIs (only system scope can access)
  if (
    path.startsWith('/api/v1/tenants') ||
    path.includes('/api/v1/hierarchy/tenants') ||
    path.includes('/api/v1/hierarchy/system-users') ||
    path.includes('/api/v1/hierarchy/tenant-admins') ||
    path.includes('/api/v1/hierarchy/system-user-roles')
  ) {
    return 'system';
  }
  
  // Admin panel APIs (tenant + system scope can access)
  if (
    path.startsWith('/api/v1/business-lines') ||
    path.startsWith('/api/v1/branches') ||
    path.startsWith('/api/v1/branch-capacity') ||
    path.startsWith('/api/v1/tenant/') ||
    path.includes('/api/v1/hierarchy/business-lines') ||
    path.includes('/api/v1/hierarchy/branches')
  ) {
    return 'admin';
  }
  
  // App panel APIs (all authenticated users can access)
  if (
    path.startsWith('/api/v1/hierarchy/users') && 
    !path.includes('system-user') && 
    !path.includes('tenant-admin')
  ) {
    return 'app';
  }
  
  return null;
}

function isPanelAccessAllowed(userScope: AccessScope, panel: PanelType): boolean {
  switch (panel) {
    case 'system':
      return userScope === 'system';
    case 'admin':
      return userScope === 'system' || userScope === 'tenant';
    case 'app':
      return true;
    default:
      return false;
  }
}

function getScopeLevel(scope: AccessScope): number {
  return SCOPE_HIERARCHY[scope] || 0;
}

function logAccessViolation(
  req: Request,
  reason: string,
  details: Record<string, unknown>
) {
  const logger = contextLogger.child({ module: 'scopeGuard' });
  logger.warn('Access violation detected', {
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

export const scopeGuard = (requiredScope: AccessScope) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const userScope = (user.accessScope || 'branch') as AccessScope;

    if (userScope === 'system') {
      return next();
    }

    const isTenantAdmin = userScope === 'tenant';
    if (isTenantAdmin) {
      if (requiredScope === 'tenant') {
        const requestedTenantId = req.params.tenantId || req.body.tenantId;
        if (requestedTenantId && user.tenantId !== requestedTenantId) {
          logAccessViolation(req, 'Cross-tenant access attempt', {
            requestedTenantId,
            userTenantId: user.tenantId,
          });
          return res.status(403).json({
            error: 'Access denied. Cross-tenant access not allowed.',
            code: 'CROSS_TENANT_ACCESS',
          });
        }
      }
      return next();
    }

    if (requiredScope === 'tenant') {
      const requestedTenantId = req.params.tenantId || req.body.tenantId;
      
      if (requestedTenantId && user.tenantId !== requestedTenantId) {
        logAccessViolation(req, 'Cross-tenant access attempt', {
          requestedTenantId,
          userTenantId: user.tenantId,
        });
        return res.status(403).json({
          error: 'Access denied. Cross-tenant access not allowed.',
          code: 'CROSS_TENANT_ACCESS',
        });
      }
    }

    if (requiredScope === 'business_line') {
      const requestedBusinessLineId = req.params.businessLineId || req.body.businessLineId;
      
      if (requestedBusinessLineId && user.businessLineId !== requestedBusinessLineId) {
        logAccessViolation(req, 'Cross-business-line access attempt', {
          requestedBusinessLineId,
          userBusinessLineId: user.businessLineId,
        });
        return res.status(403).json({
          error: 'Access denied. Cross-business-line access not allowed.',
          code: 'CROSS_BUSINESS_LINE_ACCESS',
        });
      }
    }

    if (requiredScope === 'branch') {
      const requestedBranchId = req.params.branchId || req.body.branchId;
      
      if (requestedBranchId && user.branchId !== requestedBranchId) {
        logAccessViolation(req, 'Cross-branch access attempt', {
          requestedBranchId,
          userBranchId: user.branchId,
        });
        return res.status(403).json({
          error: 'Access denied. Cross-branch access not allowed.',
          code: 'CROSS_BRANCH_ACCESS',
        });
      }
    }

    next();
  };
};

export const panelGuard = (allowedPanel: PanelType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const userScope = (user.accessScope || 'branch') as AccessScope;

    if (!isPanelAccessAllowed(userScope, allowedPanel)) {
      logAccessViolation(req, 'Panel access violation', {
        allowedPanel,
        userScope,
      });
      return res.status(403).json({
        error: `Access denied. ${allowedPanel} panel requires elevated permissions.`,
        code: 'PANEL_ACCESS_DENIED',
      });
    }

    next();
  };
};

export const scopeGuardAdvanced = (options: ScopeGuardOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const userScope = (user.accessScope || 'branch') as AccessScope;

    if (options.panel) {
      if (!isPanelAccessAllowed(userScope, options.panel)) {
        if (options.auditViolations !== false) {
          logAccessViolation(req, 'Panel access violation', {
            requiredPanel: options.panel,
            userScope,
          });
        }
        return res.status(403).json({
          error: `Access denied. ${options.panel} panel requires elevated permissions.`,
          code: 'PANEL_ACCESS_DENIED',
        });
      }
    }

    if (options.requiredScope) {
      const requiredLevel = getScopeLevel(options.requiredScope);
      const userLevel = getScopeLevel(userScope);

      if (userLevel < requiredLevel && !options.allowElevatedAccess) {
        if (options.auditViolations !== false) {
          logAccessViolation(req, 'Scope level insufficient', {
            requiredScope: options.requiredScope,
            userScope,
            requiredLevel,
            userLevel,
          });
        }
        return res.status(403).json({
          error: 'Access denied. Insufficient permission level.',
          code: 'SCOPE_LEVEL_INSUFFICIENT',
        });
      }
    }

    next();
  };
};

export const requireSystemScope = () => {
  return scopeGuardAdvanced({
    panel: 'system',
    requiredScope: 'system',
    auditViolations: true,
  });
};

export const requireTenantScope = () => {
  return scopeGuardAdvanced({
    panel: 'admin',
    requiredScope: 'tenant',
    auditViolations: true,
  });
};

export const requireBranchScope = () => {
  return scopeGuard('branch');
};

export const autoPanelGuard = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // CRITICAL FIX: Use originalUrl to get full path after router mounting
    // req.path becomes relative (e.g., "/hierarchy") when mounted under /api/v1
    // req.originalUrl contains the full path (e.g., "/api/v1/hierarchy")
    const fullPath = req.originalUrl.split('?')[0]; // Remove query params
    const panel = getPanelFromPath(fullPath);
    
    if (!panel) {
      return next();
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const userScope = (user.accessScope || 'branch') as AccessScope;

    if (!isPanelAccessAllowed(userScope, panel)) {
      logAccessViolation(req, 'Auto panel guard violation', {
        detectedPanel: panel,
        userScope,
        path: fullPath,
        originalUrl: req.originalUrl,
      });
      return res.status(403).json({
        error: `Access denied. You don't have permission to access ${panel} APIs.`,
        code: 'PANEL_ACCESS_DENIED',
      });
    }

    next();
  };
};
