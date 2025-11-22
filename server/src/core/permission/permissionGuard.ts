import { Request, Response, NextFunction } from 'express';

export const permissionGuard = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    next();
  };
};
