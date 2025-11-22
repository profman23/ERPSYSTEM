import { Request, Response, NextFunction } from 'express';

type AccessScope = 'system' | 'tenant' | 'business_line' | 'branch';

/**
 * Scope Guard Middleware
 * Enforces tenant, business line, or branch isolation
 * 
 * Usage: scopeGuard('tenant') - only allows users within same tenant
 */
export const scopeGuard = (requiredScope: AccessScope) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    // System-level users have access to everything
    if (user.accessScope === 'system') {
      return next();
    }

    // Check tenant-level isolation
    if (requiredScope === 'tenant') {
      const requestedTenantId = req.params.tenantId || req.body.tenantId;
      
      if (requestedTenantId && user.tenantId !== requestedTenantId) {
        return res.status(403).json({
          error: 'Access denied. Cross-tenant access not allowed.',
        });
      }
    }

    // Check business line-level isolation
    if (requiredScope === 'business_line') {
      const requestedBusinessLineId = req.params.businessLineId || req.body.businessLineId;
      
      if (requestedBusinessLineId && user.businessLineId !== requestedBusinessLineId) {
        return res.status(403).json({
          error: 'Access denied. Cross-business-line access not allowed.',
        });
      }
    }

    // Check branch-level isolation
    if (requiredScope === 'branch') {
      const requestedBranchId = req.params.branchId || req.body.branchId;
      
      if (requestedBranchId && user.branchId !== requestedBranchId) {
        return res.status(403).json({
          error: 'Access denied. Cross-branch access not allowed.',
        });
      }
    }

    next();
  };
};
