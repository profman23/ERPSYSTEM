/**
 * DPF Module Controller - HTTP request handlers for module management
 * Handles validation, tenant extraction, and response formatting
 */

import { Request, Response, NextFunction } from 'express';
import { DPFModuleService } from '../services/DPFModuleService';
import { TenantContext } from '../core/tenant/tenantContext';
import {
  listQuerySchema,
  createModuleSchema,
  updateModuleSchema,
  idParamSchema,
} from '../validations/dpfModuleValidation';
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
 * List modules with pagination and filtering
 * GET /api/tenant/dpf/modules or /api/v1/system/dpf/modules
 */
export const listModules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = await getEffectiveTenantIdFromRequest(req);
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    // Validate query parameters
    const params = listQuerySchema.parse(req.query);

    // Call service
    const result = await DPFModuleService.list(tenantId, params);

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
 * Get module by ID
 * GET /api/tenant/dpf/modules/:id
 */
export const getModuleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = await getEffectiveTenantIdFromRequest(req);
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    // Validate ID parameter
    const { id } = idParamSchema.parse(req.params);

    // Call service
    const module = await DPFModuleService.getById(tenantId, id);

    if (!module) {
      res.status(404).json({
        success: false,
        error: 'Module not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: module,
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
 * Get module with statistics (screens count, actions count)
 * GET /api/tenant/dpf/modules/:id/stats
 */
export const getModuleWithStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = await getEffectiveTenantIdFromRequest(req);
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    // Validate ID parameter
    const { id } = idParamSchema.parse(req.params);

    // Call service
    const moduleWithStats = await DPFModuleService.getWithStats(tenantId, id);

    if (!moduleWithStats) {
      res.status(404).json({
        success: false,
        error: 'Module not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: moduleWithStats,
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
 * Get module tree with screens — single JOIN, cached
 * GET /api/tenant/dpf/modules/tree
 * Used by ScreenAuthorizationGrid (Single Source of Truth)
 */
export const getModuleTree = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = await getEffectiveTenantIdFromRequest(req);
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    // Allow explicit scope override via query param (for system panel editing tenant roles)
    const scopeOverride = req.query.scope as string | undefined;
    const isSystem = scopeOverride
      ? scopeOverride === 'system'
      : (req as any).tenantContext?.accessScope === 'system';
    const tree = await DPFModuleService.getModuleTree(tenantId, isSystem);

    res.status(200).json({
      success: true,
      data: tree,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new module
 * POST /api/tenant/dpf/modules
 */
export const createModule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = await getEffectiveTenantIdFromRequest(req);
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    // Validate request body
    const input = createModuleSchema.parse(req.body);

    // Call service
    const newModule = await DPFModuleService.create(tenantId, input);

    res.status(201).json({
      success: true,
      message: 'Module created successfully',
      data: newModule,
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

    // Handle business logic errors
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        res.status(409).json({
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
 * Update module
 * PATCH /api/tenant/dpf/modules/:id
 */
export const updateModule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = await getEffectiveTenantIdFromRequest(req);
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    // Validate ID parameter
    const { id } = idParamSchema.parse(req.params);

    // Validate request body
    const input = updateModuleSchema.parse(req.body);

    // Call service
    const updatedModule = await DPFModuleService.update(tenantId, id, input);

    res.status(200).json({
      success: true,
      message: 'Module updated successfully',
      data: updatedModule,
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

    // Handle business logic errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('Cannot modify system modules')) {
        res.status(403).json({
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
 * Soft delete module (deactivate)
 * DELETE /api/tenant/dpf/modules/:id
 */
export const deleteModule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = await getEffectiveTenantIdFromRequest(req);
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    // Validate ID parameter
    const { id } = idParamSchema.parse(req.params);

    // Call service
    await DPFModuleService.delete(tenantId, id);

    res.status(200).json({
      success: true,
      message: 'Module deactivated successfully',
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

    // Handle business logic errors
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
