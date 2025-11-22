import { Request, Response, NextFunction } from 'express';

export const tenantLoader = async (req: Request, res: Response, next: NextFunction) => {
  next();
};
