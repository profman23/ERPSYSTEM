/**
 * Unified API Response Helpers
 *
 * Every endpoint MUST use these helpers. No raw res.json().
 *
 * Usage:
 *   return ApiResponse.success(res, data);
 *   return ApiResponse.created(res, data, 'Appointment created');
 *   return ApiResponse.paginated(res, items, total, page, limit);
 *   return ApiResponse.noContent(res);
 */

import { Response } from 'express';

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface PaginatedData<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>[];
}

export class ApiResponse {
  /**
   * 200 OK - Standard success response
   */
  static success<T>(res: Response, data: T, message?: string): Response {
    const body: SuccessResponse<T> = { success: true, data };
    if (message) body.message = message;
    return res.status(200).json(body);
  }

  /**
   * 201 Created - Resource created successfully
   */
  static created<T>(res: Response, data: T, message?: string): Response {
    const body: SuccessResponse<T> = { success: true, data };
    if (message) body.message = message;
    return res.status(201).json(body);
  }

  /**
   * 200 OK - Paginated list response
   */
  static paginated<T>(
    res: Response,
    items: T[],
    total: number,
    page: number,
    limit: number,
  ): Response {
    const totalPages = Math.ceil(total / limit);
    const body: SuccessResponse<PaginatedData<T>> = {
      success: true,
      data: {
        data: items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    };
    return res.status(200).json(body);
  }

  /**
   * 204 No Content - Successful operation with no response body
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Error response - used by errorHandler middleware, not controllers directly
   */
  static error(res: Response, statusCode: number, message: string, code?: string, details?: Record<string, unknown>[]): Response {
    const body: ErrorResponse = { success: false, error: message };
    if (code) body.code = code;
    if (details) body.details = details;
    return res.status(statusCode).json(body);
  }
}
