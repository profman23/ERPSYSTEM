/**
 * Hierarchy Controller
 * Manages multi-tenant hierarchy: Tenant → Business Line → Branch → User
 */

import { Request, Response } from 'express';
import { HierarchyService } from '../../services/HierarchyService';
import { ScopeService } from '../../services/ScopeService';
import { contextLogger } from '../../core/context';
import { z } from 'zod';

const createTenantSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(255),
  country: z.string().max(100).optional(),
  timezone: z.string().max(100).optional(),
  subscriptionPlan: z.enum(['trial', 'standard', 'professional', 'enterprise']).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
  address: z.string().optional(),
});

const createBusinessLineSchema = z.object({
  tenantId: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(255),
  businessLineType: z.enum([
    'general', 'emergency', 'surgery', 'grooming', 'pharmacy',
    'laboratory', 'boarding', 'rehabilitation', 'dental', 'imaging', 'specialty', 'mobile'
  ]).optional(),
  description: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
});

const createBranchSchema = z.object({
  businessLineId: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(255),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  address: z.string().optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  timezone: z.string().max(100).optional(),
});

const createUserSchema = z.object({
  branchId: z.string().uuid(),
  code: z.string().max(50).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  password: z.string().min(8),
  role: z.string().max(50).optional(),
  accessScope: z.enum(['tenant', 'business_line', 'branch', 'mixed']).optional(),
});

export const hierarchyController = {
  async createTenant(req: Request, res: Response) {
    try {
      const validation = createTenantSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const tenant = await HierarchyService.createTenant(validation.data);

      res.status(201).json({
        success: true,
        data: tenant,
        message: 'Tenant created successfully',
      });
    } catch (error: any) {
      contextLogger.error('Failed to create tenant', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create tenant',
      });
    }
  },

  async createBusinessLine(req: Request, res: Response) {
    try {
      const validation = createBusinessLineSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const businessLine = await HierarchyService.createBusinessLine(validation.data);

      res.status(201).json({
        success: true,
        data: businessLine,
        message: 'Business line created successfully',
      });
    } catch (error: any) {
      contextLogger.error('Failed to create business line', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create business line',
      });
    }
  },

  async createBranch(req: Request, res: Response) {
    try {
      const validation = createBranchSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const branch = await HierarchyService.createBranch(validation.data);

      res.status(201).json({
        success: true,
        data: branch,
        message: 'Branch created successfully',
      });
    } catch (error: any) {
      contextLogger.error('Failed to create branch', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create branch',
      });
    }
  },

  async createUser(req: Request, res: Response) {
    try {
      const validation = createUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const capacityOk = await HierarchyService.validateBranchCapacity(validation.data.branchId);
      if (!capacityOk) {
        return res.status(400).json({
          success: false,
          error: 'User quota exceeded for this tenant',
        });
      }

      const user = await HierarchyService.createUser(validation.data);

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully',
      });
    } catch (error: any) {
      contextLogger.error('Failed to create user', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create user',
      });
    }
  },

  async getTenantHierarchy(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;

      const hierarchy = await HierarchyService.getTenantHierarchy(tenantId);
      if (!hierarchy) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found',
        });
      }

      res.json({
        success: true,
        data: hierarchy,
      });
    } catch (error: any) {
      contextLogger.error('Failed to get tenant hierarchy', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get tenant hierarchy',
      });
    }
  },

  async getUserContext(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const context = await HierarchyService.resolveUserContext(userId);
      if (!context) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      res.json({
        success: true,
        data: context,
      });
    } catch (error: any) {
      contextLogger.error('Failed to get user context', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user context',
      });
    }
  },

  async getUserScope(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const scope = await ScopeService.resolveUserScope(userId);
      if (!scope) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const accessibleBranches = await ScopeService.getAccessibleBranches(userId);
      const accessibleBusinessLines = await ScopeService.getAccessibleBusinessLines(userId);

      res.json({
        success: true,
        data: {
          scope,
          accessibleBranches,
          accessibleBusinessLines,
        },
      });
    } catch (error: any) {
      contextLogger.error('Failed to get user scope', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user scope',
      });
    }
  },
};

export default hierarchyController;
