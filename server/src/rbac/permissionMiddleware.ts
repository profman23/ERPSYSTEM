/**
 * DPF Permission Middleware
 * Automatic permission enforcement for Express routes and Socket.IO events
 */

import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';
import { dpfEngine } from './dpfEngine';
import { dpfRegistry } from './dpfRegistry';
import { PermissionCheckRequest, PermissionScope } from './dpfTypes';
import logger from '../config/logger';
import { TenantContext } from '../core/tenant/tenantContext';

/**
 * Express middleware for API endpoint permission checking
 * Usage: app.post('/api/patients', requirePermission('PATIENT:CREATE'), handler)
 */
export function requirePermission(permissionCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user and tenant from request (set by authMiddleware and tenantLoader)
      const user = (req as any).user;
      const tenantContext = TenantContext.getContext();

      if (!user || !tenantContext) {
        logger.warn(`⚠️ DPF: Permission check failed - no user or tenant context`);
        return res.status(401).json({
          success: false,
          message: 'Unauthorized. Please authenticate first.',
        });
      }

      // Check permission
      const checkRequest: PermissionCheckRequest = {
        userId: user.userId,
        tenantId: tenantContext.tenantId!,
        permissionCode,
      };

      const result = await dpfEngine.checkPermission(checkRequest);

      if (!result.granted) {
        logger.warn(
          `⚠️ DPF: Permission denied for user ${user.userId} - ${permissionCode}: ${result.reason}`
        );
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to perform this action.',
          requiredPermission: permissionCode,
        });
      }

      // Permission granted - attach permission info to request
      (req as any).permission = {
        code: permissionCode,
        agiLevel: result.effectiveAgiLevel,
      };

      logger.debug(`✅ DPF: Permission granted for user ${user.userId} - ${permissionCode}`);
      next();
    } catch (error) {
      logger.error(`❌ DPF: Permission middleware error:`, error);
      res.status(500).json({
        success: false,
        message: 'Permission check failed',
      });
    }
  };
}

/**
 * Express middleware for dynamic API endpoint permission checking
 * Auto-detects required permission based on registered endpoint
 */
export function requireApiPermission() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const tenantContext = TenantContext.getContext();

      if (!user || !tenantContext) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      // Get action for this endpoint
      const endpoint = req.path;
      const action = await dpfRegistry.getActionByEndpoint(tenantContext.tenantId!, endpoint);

      if (!action) {
        // No registered action for this endpoint - allow (for now)
        logger.warn(`⚠️ DPF: No registered action for endpoint ${endpoint} - allowing access`);
        return next();
      }

      // Check permission
      const checkRequest: PermissionCheckRequest = {
        userId: user.userId,
        tenantId: tenantContext.tenantId!,
        apiEndpoint: endpoint,
      };

      const result = await dpfEngine.checkPermission(checkRequest);

      if (!result.granted) {
        logger.warn(
          `⚠️ DPF: API permission denied for user ${user.userId} - ${endpoint}: ${result.reason}`
        );
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to access this endpoint.',
          requiredPermissions: result.matchedPermissions,
        });
      }

      (req as any).permission = {
        action: action,
        agiLevel: result.effectiveAgiLevel,
      };

      logger.debug(`✅ DPF: API permission granted for ${endpoint}`);
      next();
    } catch (error) {
      logger.error(`❌ DPF: API permission middleware error:`, error);
      res.status(500).json({
        success: false,
        message: 'Permission check failed',
      });
    }
  };
}

/**
 * Socket.IO middleware for event permission checking
 * Integrates with existing socketEventAuth middleware
 */
export async function checkSocketPermission(
  socket: Socket,
  eventName: string
): Promise<boolean> {
  try {
    const user = socket.data.user;
    if (!user) {
      logger.warn(`⚠️ DPF: Socket permission check - no user context`);
      return false;
    }

    // Get action for this socket event
    const action = await dpfRegistry.getActionBySocketEvent(user.tenantId || '', eventName);

    if (!action) {
      // No registered action for this event - deny by default (whitelist approach)
      logger.warn(`⚠️ DPF: No registered action for socket event ${eventName} - denying access`);
      return false;
    }

    // Check permission
    const checkRequest: PermissionCheckRequest = {
      userId: user.userId,
      tenantId: user.tenantId || '',
      socketEvent: eventName,
    };

    const result = await dpfEngine.checkPermission(checkRequest);

    if (!result.granted) {
      logger.warn(
        `⚠️ DPF: Socket permission denied for user ${user.userId} - ${eventName}: ${result.reason}`
      );
      return false;
    }

    logger.debug(`✅ DPF: Socket permission granted for ${eventName}`);
    return true;
  } catch (error) {
    logger.error(`❌ DPF: Socket permission check error:`, error);
    return false;
  }
}

/**
 * Check module access (for UI navigation)
 */
export async function checkModuleAccess(
  userId: string,
  tenantId: string,
  moduleCode: string
): Promise<boolean> {
  try {
    const checkRequest: PermissionCheckRequest = {
      userId,
      tenantId,
      moduleCode,
    };

    const result = await dpfEngine.checkPermission(checkRequest);
    return result.granted;
  } catch (error) {
    logger.error(`❌ DPF: Module access check error:`, error);
    return false;
  }
}

/**
 * Get user's accessible modules (for UI menu generation)
 */
export async function getUserAccessibleModules(
  userId: string,
  tenantId: string
): Promise<string[]> {
  try {
    // This would check all modules and return accessible ones
    // For now, return empty array (to be implemented with full module scanning)
    logger.debug(`DPF: Getting accessible modules for user ${userId}`);
    return [];
  } catch (error) {
    logger.error(`❌ DPF: Get accessible modules error:`, error);
    return [];
  }
}

/**
 * Bulk permission check helper (for UI state management)
 */
export async function checkMultiplePermissions(
  userId: string,
  tenantId: string,
  permissionCodes: string[]
): Promise<Record<string, boolean>> {
  return dpfEngine.checkMultiplePermissions(userId, tenantId, permissionCodes);
}
