/**
 * DPF Screen Controller - HTTP request handlers for screen management
 * Handles validation, tenant extraction, and response formatting
 */

import { Request, Response, NextFunction } from 'express';
import { DPFScreenService } from '../services/DPFScreenService';
import { TenantContext } from '../core/tenant/tenantContext';
import {
  listQuerySchema,
  createScreenSchema,
  updateScreenSchema,
  idParamSchema,
} from '../validations/dpfScreenValidation';
import { ZodError } from 'zod';

/**
 * Helper function to get effective tenant ID from request
 * For system users, returns SYSTEM tenant ID
 * For regular users, returns their tenant ID from context
 */
async function getEffectiveTenantIdFromRequest(req: Request): Promise<string | null> {
  const tenantContext = (req as any).tenantContext;

  if (!tenantContext) {
    return null;
  }

  // For system users, get SYSTEM tenant ID
  if (tenantContext.accessScope === 'system') {
    return await TenantContext.getSystemTenantId();
  }

  return tenantContext.tenantId || null;
}

/**
 * List screens with pagination and filtering
 * GET /api/tenant/dpf/screens or /api/v1/system/dpf/screens
 */
export const listScreens = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = await getEffectiveTenantIdFromRequest(req);
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    const params = listQuerySchema.parse(req.query);
    const result = await DPFScreenService.list(tenantId, params);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
};

/**
 * Get screen by ID
 * GET /api/tenant/dpf/screens/:id
 */
export const getScreenById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = await getEffectiveTenantIdFromRequest(req);
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    const { id } = idParamSchema.parse(req.params);
    const screen = await DPFScreenService.getById(tenantId, id);

    if (!screen) {
      res.status(404).json({
        success: false,
        error: 'Screen not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: screen,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
};

/**
 * Get screen with statistics
 * GET /api/tenant/dpf/screens/:id/stats
 */
export const getScreenWithStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = await getEffectiveTenantIdFromRequest(req);
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    const { id } = idParamSchema.parse(req.params);
    const screenWithStats = await DPFScreenService.getWithStats(tenantId, id);

    if (!screenWithStats) {
      res.status(404).json({
        success: false,
        error: 'Screen not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: screenWithStats,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
};

/**
 * Create new screen
 * POST /api/tenant/dpf/screens
 */
export const createScreen = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = await getEffectiveTenantIdFromRequest(req);
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    const input = createScreenSchema.parse(req.body);
    const newScreen = await DPFScreenService.create(tenantId, input);

    res.status(201).json({
      success: true,
      message: 'Screen created successfully',
      data: newScreen,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
    }

    next(error);
  }
};

/**
 * Update screen
 * PATCH /api/tenant/dpf/screens/:id
 */
export const updateScreen = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = await getEffectiveTenantIdFromRequest(req);
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    const { id } = idParamSchema.parse(req.params);
    const input = updateScreenSchema.parse(req.body);
    const updatedScreen = await DPFScreenService.update(tenantId, id, input);

    res.status(200).json({
      success: true,
      message: 'Screen updated successfully',
      data: updatedScreen,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
    }

    next(error);
  }
};

/**
 * Soft delete screen
 * DELETE /api/tenant/dpf/screens/:id
 */
export const deleteScreen = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = await getEffectiveTenantIdFromRequest(req);
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    const { id } = idParamSchema.parse(req.params);
    await DPFScreenService.delete(tenantId, id);

    res.status(200).json({
      success: true,
      message: 'Screen deactivated successfully',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('Cannot delete')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
    }

    next(error);
  }
};
