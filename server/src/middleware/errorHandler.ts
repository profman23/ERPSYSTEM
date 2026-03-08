import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../config/logger';
import { AppError } from '../core/errors';
import { ApiResponse } from '../core/response';

/**
 * Global error handler - converts all errors to standard API responses.
 *
 * Error hierarchy:
 *   ZodError       → 400 VALIDATION_ERROR  (auto-mapped from field errors)
 *   AppError       → uses statusCode + code from the error instance
 *   Unknown Error  → 500 INTERNAL_ERROR
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Log with structured context
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    ...(err instanceof AppError && { code: err.code, statusCode: err.statusCode }),
  });

  // Zod validation errors → 400
  if (err instanceof ZodError) {
    return ApiResponse.error(
      res,
      400,
      'Validation error',
      'VALIDATION_ERROR',
      err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    );
  }

  // Application errors (NotFoundError, ForbiddenError, etc.)
  if (err instanceof AppError) {
    return ApiResponse.error(
      res,
      err.statusCode,
      err.message,
      err.code,
      err.details,
    );
  }

  // Unknown / unexpected errors → 500
  const statusCode = (err as any).statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';

  return ApiResponse.error(res, statusCode, message, 'INTERNAL_ERROR');
};

export const notFoundHandler = (req: Request, res: Response) => {
  ApiResponse.error(res, 404, `Route ${req.method} ${req.path} not found`, 'NOT_FOUND');
};
