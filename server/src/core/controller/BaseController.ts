/**
 * BaseController - Eliminates boilerplate from every controller.
 *
 * What it does automatically:
 *  1. Extracts tenant context (tenantId, userId, accessScope)
 *  2. Resolves targetTenantId (handles system users querying specific tenants)
 *  3. Validates request body/query/params with Zod (if schema provided)
 *  4. Wraps handler in try/catch → forwards errors to global errorHandler
 *  5. Provides typed RequestContext to every handler
 *
 * Usage:
 *
 *   // Simple handler - tenantId auto-resolved
 *   static list = BaseController.handle(async ({ tenantId, query }) => {
 *     const params = listSchema.parse(query);
 *     return AppointmentService.list(tenantId, params);
 *   });
 *
 *   // With Zod body validation
 *   static create = BaseController.handle(
 *     async ({ tenantId, validated }) => {
 *       return AppointmentService.create(tenantId, validated);
 *     },
 *     { bodySchema: createAppointmentSchema }
 *   );
 *
 *   // Return 201 Created
 *   static create = BaseController.handle(
 *     async ({ tenantId, validated }) => {
 *       return AppointmentService.create(tenantId, validated);
 *     },
 *     { bodySchema: createAppointmentSchema, statusCode: 201 }
 *   );
 *
 *   // Paginated response
 *   static list = BaseController.handlePaginated(
 *     async ({ tenantId, query }) => {
 *       const params = listSchema.parse(query);
 *       return AppointmentService.list(tenantId, params);
 *     }
 *   );
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { TenantContext } from '../tenant/tenantContext';
import { ApiResponse } from '../response';
import { UnauthorizedError } from '../errors';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RequestContext {
  /** Resolved tenant ID (for system users: from query param or SYSTEM tenant) */
  tenantId: string;
  /** Current user ID from JWT */
  userId: string;
  /** Access scope: 'system' | 'tenant' | 'business_line' | 'branch' | 'mixed' */
  accessScope: string;
  /** Current user role */
  role: string;
  /** Business line ID (null for system/tenant scope) */
  businessLineId: string | null;
  /** Branch ID (null for system/tenant/BL scope) */
  branchId: string | null;
  /** Whether the current user is a system-level user */
  isSystem: boolean;
  /** Raw Express request (for accessing params, headers, etc.) */
  req: Request;
  /** Express response (rarely needed - prefer returning data) */
  res: Response;
  /** URL params (req.params) */
  params: Record<string, string>;
  /** Query string (req.query) */
  query: Record<string, any>;
  /** Raw request body */
  body: any;
  /** Validated body (only if bodySchema was provided in options) */
  validated: any;
}

export interface HandlerOptions<T = any> {
  /** Zod schema to validate req.body. Result available as ctx.validated */
  bodySchema?: ZodSchema<T>;
  /** Zod schema to validate req.query */
  querySchema?: ZodSchema;
  /** HTTP status code for success (default: 200) */
  statusCode?: number;
  /** Success message (optional) */
  message?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── BaseController ─────────────────────────────────────────────────────────

export class BaseController {
  /**
   * Create an Express handler with automatic:
   *  - Tenant context resolution
   *  - Zod validation
   *  - Error handling
   *  - Standard response formatting
   */
  static handle<T = any>(
    fn: (ctx: RequestContext) => Promise<T>,
    options: HandlerOptions = {},
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ctx = await BaseController.buildContext(req, options);

        const result = await fn(ctx);

        const status = options.statusCode || 200;
        if (status === 201) {
          return ApiResponse.created(res, result, options.message);
        }
        if (status === 204) {
          return ApiResponse.noContent(res);
        }
        return ApiResponse.success(res, result, options.message);
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Create an Express handler that returns paginated data.
   * The handler function must return { items, total, page, limit }.
   */
  static handlePaginated<T>(
    fn: (ctx: RequestContext) => Promise<PaginatedResult<T>>,
    options: Omit<HandlerOptions, 'statusCode'> = {},
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ctx = await BaseController.buildContext(req, options);

        const result = await fn(ctx);

        return ApiResponse.paginated(
          res,
          result.items,
          result.total,
          result.page,
          result.limit,
        );
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Build the RequestContext from the Express request.
   * Handles all tenant resolution logic in one place.
   */
  private static async buildContext(
    req: Request,
    options: HandlerOptions,
  ): Promise<RequestContext> {
    const tenantCtx = TenantContext.getContext();
    if (!tenantCtx) {
      throw new UnauthorizedError('Authentication required');
    }

    // ── Resolve tenant ID ─────────────────────────────────────────────
    let tenantId: string;
    const isSystem = tenantCtx.accessScope === 'system';

    if (isSystem) {
      // System users: check query param first, then body, then fall back to SYSTEM tenant
      const queryTenantId = req.query.tenantId as string | undefined;
      const bodyTenantId = req.body?.tenantId as string | undefined;

      if (queryTenantId) {
        tenantId = queryTenantId;
      } else if (bodyTenantId) {
        tenantId = bodyTenantId;
      } else {
        // Fall back to SYSTEM tenant
        const systemId = await TenantContext.getSystemTenantId();
        if (!systemId) {
          throw new Error('SYSTEM tenant not found. Please run seed script.');
        }
        tenantId = systemId;
      }
    } else {
      if (!tenantCtx.tenantId) {
        throw new UnauthorizedError('Tenant context not found');
      }
      tenantId = tenantCtx.tenantId;
    }

    // ── Validate body if schema provided ──────────────────────────────
    let validated: any = undefined;
    if (options.bodySchema) {
      validated = options.bodySchema.parse(req.body);
    }

    // ── Validate query if schema provided ─────────────────────────────
    let query = req.query as Record<string, any>;
    if (options.querySchema) {
      query = options.querySchema.parse(req.query);
    }

    return {
      tenantId,
      userId: tenantCtx.userId,
      accessScope: tenantCtx.accessScope,
      role: tenantCtx.role,
      businessLineId: tenantCtx.businessLineId,
      branchId: tenantCtx.branchId,
      isSystem,
      req,
      res: req.res as Response,
      params: req.params as Record<string, string>,
      query,
      body: req.body,
      validated,
    };
  }
}
