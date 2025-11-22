import { Request, Response, NextFunction } from 'express';

type UserRole = 'super_admin' | 'tenant_admin' | 'manager' | 'staff';

/**
 * Role Guard Middleware
 * Restricts route access to specific roles
 * 
 * Usage: roleGuard(['super_admin', 'tenant_admin'])
 */
export const roleGuard = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(user.role as UserRole)) {
      return res.status(403).json({
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};
