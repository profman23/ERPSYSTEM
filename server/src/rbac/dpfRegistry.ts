/**
 * DPF Registry - Central Auto-Registration System
 * All modules, screens, and actions register here
 * Tenant-isolated with in-memory caching for performance
 */

import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import {
  dpfModules,
  dpfScreens,
  dpfActions,
  dpfPermissions,
} from '../db/schemas';
import {
  DPFModuleRegistration,
  DPFScreenRegistration,
  DPFActionRegistration,
  DPFModule,
  DPFScreen,
  DPFAction,
  DPFPermission,
  DPFRegistryCache,
  PermissionType,
  ActionType,
} from './dpfTypes';
import logger from '../config/logger';
import { cacheService } from '../services/cacheService';

class DPFRegistry {
  private cache: Map<string, DPFRegistryCache> = new Map(); // tenantId -> cache
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Register a module (auto-called by modules on startup)
   */
  async registerModule(
    tenantId: string,
    registration: DPFModuleRegistration
  ): Promise<DPFModule> {
    try {
      // Check if module already exists
      const existing = await db
        .select()
        .from(dpfModules)
        .where(
          and(
            eq(dpfModules.tenantId, tenantId),
            eq(dpfModules.moduleCode, registration.moduleCode)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing module
        const updated = await db
          .update(dpfModules)
          .set({
            moduleName: registration.moduleName,
            moduleNameAr: registration.moduleNameAr,
            description: registration.description,
            descriptionAr: registration.descriptionAr,
            category: registration.category,
            icon: registration.icon,
            route: registration.route,
            sortOrder: registration.sortOrder,
            isSystemModule: registration.isSystemModule ? 'true' : 'false',
            requiredAgiLevel: registration.requiredAgiLevel,
            metadata: registration.metadata,
            updatedAt: new Date(),
          })
          .where(eq(dpfModules.id, existing[0].id))
          .returning();

        logger.info(`✅ DPF: Updated module ${registration.moduleCode} for tenant ${tenantId}`);
        await this.invalidateCache(tenantId);
        return this.mapModule(updated[0]);
      }

      // Create new module
      const inserted = await db
        .insert(dpfModules)
        .values({
          tenantId,
          moduleCode: registration.moduleCode,
          moduleName: registration.moduleName,
          moduleNameAr: registration.moduleNameAr,
          description: registration.description,
          descriptionAr: registration.descriptionAr,
          category: registration.category,
          icon: registration.icon,
          route: registration.route,
          sortOrder: registration.sortOrder || '0',
          isActive: 'true',
          isSystemModule: registration.isSystemModule ? 'true' : 'false',
          requiredAgiLevel: registration.requiredAgiLevel,
          metadata: registration.metadata,
        })
        .returning();

      logger.info(`✅ DPF: Registered new module ${registration.moduleCode} for tenant ${tenantId}`);
      await this.invalidateCache(tenantId);
      return this.mapModule(inserted[0]);
    } catch (error) {
      logger.error(`❌ DPF: Failed to register module ${registration.moduleCode}:`, error);
      throw error;
    }
  }

  /**
   * Register a screen (auto-called by components on mount)
   */
  async registerScreen(
    tenantId: string,
    registration: DPFScreenRegistration
  ): Promise<DPFScreen> {
    try {
      // Get module ID
      const module = await this.getModuleByCode(tenantId, registration.moduleCode);
      if (!module) {
        throw new Error(`Module ${registration.moduleCode} not found for tenant ${tenantId}`);
      }

      // Check if screen already exists
      const existing = await db
        .select()
        .from(dpfScreens)
        .where(
          and(
            eq(dpfScreens.tenantId, tenantId),
            eq(dpfScreens.moduleId, module.id),
            eq(dpfScreens.screenCode, registration.screenCode)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing screen
        const updated = await db
          .update(dpfScreens)
          .set({
            screenName: registration.screenName,
            screenNameAr: registration.screenNameAr,
            description: registration.description,
            descriptionAr: registration.descriptionAr,
            route: registration.route,
            componentPath: registration.componentPath,
            requiredAgiLevel: registration.requiredAgiLevel,
            metadata: registration.metadata,
            updatedAt: new Date(),
          })
          .where(eq(dpfScreens.id, existing[0].id))
          .returning();

        await this.invalidateCache(tenantId);
        return this.mapScreen(updated[0]);
      }

      // Create new screen
      const inserted = await db
        .insert(dpfScreens)
        .values({
          tenantId,
          moduleId: module.id,
          screenCode: registration.screenCode,
          screenName: registration.screenName,
          screenNameAr: registration.screenNameAr,
          description: registration.description,
          descriptionAr: registration.descriptionAr,
          route: registration.route,
          componentPath: registration.componentPath,
          isActive: 'true',
          requiredAgiLevel: registration.requiredAgiLevel,
          metadata: registration.metadata,
        })
        .returning();

      logger.info(`✅ DPF: Registered screen ${registration.screenCode} for module ${registration.moduleCode}`);
      await this.invalidateCache(tenantId);
      return this.mapScreen(inserted[0]);
    } catch (error) {
      logger.error(`❌ DPF: Failed to register screen ${registration.screenCode}:`, error);
      throw error;
    }
  }

  /**
   * Register an action (auto-called by API routes, Socket.IO handlers, buttons)
   */
  async registerAction(
    tenantId: string,
    registration: DPFActionRegistration
  ): Promise<DPFAction> {
    try {
      // Get module ID
      const module = await this.getModuleByCode(tenantId, registration.moduleCode);
      if (!module) {
        throw new Error(`Module ${registration.moduleCode} not found for tenant ${tenantId}`);
      }

      // Get screen ID (optional)
      let screenId: string | undefined;
      if (registration.screenCode) {
        const screen = await this.getScreenByCode(tenantId, registration.moduleCode, registration.screenCode);
        screenId = screen?.id;
      }

      // Check if action already exists
      const existing = await db
        .select()
        .from(dpfActions)
        .where(
          and(
            eq(dpfActions.tenantId, tenantId),
            eq(dpfActions.moduleId, module.id),
            eq(dpfActions.actionCode, registration.actionCode)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing action
        const updated = await db
          .update(dpfActions)
          .set({
            screenId,
            actionName: registration.actionName,
            actionNameAr: registration.actionNameAr,
            description: registration.description,
            descriptionAr: registration.descriptionAr,
            actionType: registration.actionType,
            actionCategory: registration.actionCategory,
            httpMethod: registration.httpMethod,
            apiEndpoint: registration.apiEndpoint,
            socketEvent: registration.socketEvent,
            requiredScope: registration.requiredScope,
            requiredAgiLevel: registration.requiredAgiLevel,
            isDestructive: registration.isDestructive ? 'true' : 'false',
            voiceCommandsEn: registration.voiceCommandsEn as any,
            voiceCommandsAr: registration.voiceCommandsAr as any,
            metadata: registration.metadata,
            updatedAt: new Date(),
          })
          .where(eq(dpfActions.id, existing[0].id))
          .returning();

        await this.invalidateCache(tenantId);
        return this.mapAction(updated[0]);
      }

      // Create new action
      const inserted = await db
        .insert(dpfActions)
        .values({
          tenantId,
          moduleId: module.id,
          screenId,
          actionCode: registration.actionCode,
          actionName: registration.actionName,
          actionNameAr: registration.actionNameAr,
          description: registration.description,
          descriptionAr: registration.descriptionAr,
          actionType: registration.actionType,
          actionCategory: registration.actionCategory,
          httpMethod: registration.httpMethod,
          apiEndpoint: registration.apiEndpoint,
          socketEvent: registration.socketEvent,
          requiredScope: registration.requiredScope,
          requiredAgiLevel: registration.requiredAgiLevel,
          isDestructive: registration.isDestructive ? 'true' : 'false',
          isActive: 'true',
          voiceCommandsEn: registration.voiceCommandsEn as any,
          voiceCommandsAr: registration.voiceCommandsAr as any,
          metadata: registration.metadata,
        })
        .returning();

      logger.info(`✅ DPF: Registered action ${registration.actionCode} for module ${registration.moduleCode}`);
      await this.invalidateCache(tenantId);

      // Auto-create permission for this action
      await this.autoCreatePermission(tenantId, this.mapAction(inserted[0]));

      return this.mapAction(inserted[0]);
    } catch (error) {
      logger.error(`❌ DPF: Failed to register action ${registration.actionCode}:`, error);
      throw error;
    }
  }

  /**
   * Auto-create permission for an action
   */
  private async autoCreatePermission(tenantId: string, action: DPFAction): Promise<void> {
    try {
      const permissionCode = `${action.actionCode}`;

      // Check if permission already exists
      const existing = await db
        .select()
        .from(dpfPermissions)
        .where(eq(dpfPermissions.permissionCode, permissionCode))
        .limit(1);

      if (existing.length > 0) {
        return; // Permission already exists
      }

      // Create permission
      await db.insert(dpfPermissions).values({
        tenantId,
        permissionCode,
        permissionName: action.actionName,
        permissionNameAr: action.actionNameAr,
        description: action.description,
        descriptionAr: action.descriptionAr,
        moduleId: action.moduleId,
        screenId: action.screenId,
        actionId: action.id,
        permissionType: this.mapActionTypeToPermissionType(action.actionType),
        requiredScope: action.requiredScope,
        isActive: 'true',
      });

      logger.info(`✅ DPF: Auto-created permission ${permissionCode}`);
    } catch (error) {
      logger.error(`❌ DPF: Failed to auto-create permission for action ${action.actionCode}:`, error);
    }
  }

  /**
   * Get module by code
   */
  async getModuleByCode(tenantId: string, moduleCode: string): Promise<DPFModule | null> {
    const modules = await db
      .select()
      .from(dpfModules)
      .where(
        and(eq(dpfModules.tenantId, tenantId), eq(dpfModules.moduleCode, moduleCode))
      )
      .limit(1);

    return modules.length > 0 ? this.mapModule(modules[0]) : null;
  }

  /**
   * Get screen by code
   */
  async getScreenByCode(
    tenantId: string,
    moduleCode: string,
    screenCode: string
  ): Promise<DPFScreen | null> {
    const module = await this.getModuleByCode(tenantId, moduleCode);
    if (!module) return null;

    const screens = await db
      .select()
      .from(dpfScreens)
      .where(
        and(
          eq(dpfScreens.tenantId, tenantId),
          eq(dpfScreens.moduleId, module.id),
          eq(dpfScreens.screenCode, screenCode)
        )
      )
      .limit(1);

    return screens.length > 0 ? this.mapScreen(screens[0]) : null;
  }

  /**
   * Get action by API endpoint
   */
  async getActionByEndpoint(tenantId: string, endpoint: string): Promise<DPFAction | null> {
    const actions = await db
      .select()
      .from(dpfActions)
      .where(
        and(eq(dpfActions.tenantId, tenantId), eq(dpfActions.apiEndpoint, endpoint))
      )
      .limit(1);

    return actions.length > 0 ? this.mapAction(actions[0]) : null;
  }

  /**
   * Get action by Socket.IO event
   */
  async getActionBySocketEvent(tenantId: string, event: string): Promise<DPFAction | null> {
    const actions = await db
      .select()
      .from(dpfActions)
      .where(
        and(eq(dpfActions.tenantId, tenantId), eq(dpfActions.socketEvent, event))
      )
      .limit(1);

    return actions.length > 0 ? this.mapAction(actions[0]) : null;
  }

  /**
   * Invalidate cache for tenant
   */
  private async invalidateCache(tenantId: string): Promise<void> {
    this.cache.delete(tenantId);
    await cacheService.del(`dpf:registry:${tenantId}`);
  }

  /**
   * Map database types to domain types
   */
  private mapModule(data: any): DPFModule {
    return {
      ...data,
      isActive: data.isActive === 'true',
      isSystemModule: data.isSystemModule === 'true',
    };
  }

  private mapScreen(data: any): DPFScreen {
    return {
      ...data,
      isActive: data.isActive === 'true',
    };
  }

  private mapAction(data: any): DPFAction {
    return {
      ...data,
      isDestructive: data.isDestructive === 'true',
      isActive: data.isActive === 'true',
      voiceCommandsEn: data.voiceCommandsEn || [],
      voiceCommandsAr: data.voiceCommandsAr || [],
    };
  }

  private mapActionTypeToPermissionType(actionType: ActionType): PermissionType {
    switch (actionType) {
      case ActionType.API:
        return PermissionType.API;
      case ActionType.SOCKET:
        return PermissionType.SOCKET;
      default:
        return PermissionType.ACTION;
    }
  }
}

export const dpfRegistry = new DPFRegistry();
