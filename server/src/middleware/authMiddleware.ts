import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

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
 * Authentication middleware
 * Validates JWT token and attaches user to req.user
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
      return res.status(401).json({
        error: 'No token provided. Please login.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

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

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired. Please refresh your token.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token. Please login again.',
      });
    }

    return res.status(401).json({
      error: 'Authentication failed.',
    });
  }
};
