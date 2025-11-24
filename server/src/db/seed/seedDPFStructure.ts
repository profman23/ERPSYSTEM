/**
 * DPF Structure Sync Script
 * Syncs static DPF structure to database for a given tenant
 * 
 * Features:
 * - Reads dpfStructure.ts as source of truth
 * - Creates/updates modules, screens, actions
 * - Auto-generates permissions for all actions
 * - 100% idempotent (safe to run multiple times)
 * - Never deletes data (additive only)
 * - Detailed logging of all changes
 */

import { db } from '../index';
import { eq, and } from 'drizzle-orm';
import {
  dpfModules,
  dpfScreens,
  dpfActions,
  dpfPermissions,
} from '../schemas';
import { DPF_STRUCTURE, getDPFStatistics } from '../../rbac/dpfStructure';
import logger from '../../config/logger';

interface SyncStats {
  modulesCreated: number;
  modulesUpdated: number;
  screensCreated: number;
  screensUpdated: number;
  actionsCreated: number;
  actionsUpdated: number;
  permissionsCreated: number;
}

/**
 * Sync DPF structure for a specific tenant
 */
export async function seedDPFStructure(tenantId: string): Promise<SyncStats> {
  const stats: SyncStats = {
    modulesCreated: 0,
    modulesUpdated: 0,
    screensCreated: 0,
    screensUpdated: 0,
    actionsCreated: 0,
    actionsUpdated: 0,
    permissionsCreated: 0,
  };

  logger.info(`\n${'═'.repeat(70)}`);
  logger.info(`  DPF STRUCTURE SYNC - Tenant: ${tenantId}`);
  logger.info(`${'═'.repeat(70)}\n`);

  const dpfStats = getDPFStatistics();
  logger.info(`📊 Source Structure: ${dpfStats.totalModules} modules, ${dpfStats.totalScreens} screens, ${dpfStats.totalActions} actions\n`);

  try {
    // Sync each module
    for (const moduleDef of DPF_STRUCTURE) {
      const moduleResult = await syncModule(tenantId, moduleDef);
      
      if (moduleResult.created) {
        stats.modulesCreated++;
        logger.info(`✅ Created module: ${moduleDef.moduleCode}`);
      } else {
        stats.modulesUpdated++;
        logger.info(`♻️  Updated module: ${moduleDef.moduleCode}`);
      }

      // Sync screens for this module
      for (const screenDef of moduleDef.screens) {
        const screenResult = await syncScreen(tenantId, moduleResult.moduleId, moduleDef.moduleCode, screenDef);
        
        if (screenResult.created) {
          stats.screensCreated++;
          logger.info(`  ✅ Created screen: ${moduleDef.moduleCode} → ${screenDef.screenCode}`);
        } else {
          stats.screensUpdated++;
          logger.info(`  ♻️  Updated screen: ${moduleDef.moduleCode} → ${screenDef.screenCode}`);
        }

        // Sync actions for this screen
        for (const actionDef of screenDef.actions) {
          const actionResult = await syncAction(
            tenantId,
            moduleResult.moduleId,
            screenResult.screenId,
            moduleDef.moduleCode,
            screenDef.screenCode,
            actionDef
          );

          if (actionResult.created) {
            stats.actionsCreated++;
            logger.info(`    ✅ Created action: ${actionDef.actionCode}`);
          } else {
            stats.actionsUpdated++;
            logger.info(`    ♻️  Updated action: ${actionDef.actionCode}`);
          }

          // Auto-create permission for this action
          const permissionCreated = await syncPermission(
            tenantId,
            moduleResult.moduleId,
            screenResult.screenId,
            actionResult.actionId,
            actionDef
          );

          if (permissionCreated) {
            stats.permissionsCreated++;
            logger.info(`    🔐 Created permission: ${actionDef.actionCode}`);
          }
        }
      }
    }

    // Print summary
    logger.info(`\n${'═'.repeat(70)}`);
    logger.info(`  SYNC COMPLETE - Summary`);
    logger.info(`${'═'.repeat(70)}`);
    logger.info(`Modules:     ${stats.modulesCreated} created, ${stats.modulesUpdated} updated`);
    logger.info(`Screens:     ${stats.screensCreated} created, ${stats.screensUpdated} updated`);
    logger.info(`Actions:     ${stats.actionsCreated} created, ${stats.actionsUpdated} updated`);
    logger.info(`Permissions: ${stats.permissionsCreated} created`);
    logger.info(`${'═'.repeat(70)}\n`);

    return stats;
  } catch (error) {
    logger.error('❌ DPF sync failed:', error);
    throw error;
  }
}

/**
 * Sync a single module (create or update)
 */
async function syncModule(
  tenantId: string,
  moduleDef: any
): Promise<{ moduleId: string; created: boolean }> {
  // Check if module exists
  const existing = await db
    .select()
    .from(dpfModules)
    .where(
      and(
        eq(dpfModules.tenantId, tenantId),
        eq(dpfModules.moduleCode, moduleDef.moduleCode)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing module
    const updated = await db
      .update(dpfModules)
      .set({
        moduleName: moduleDef.moduleName,
        moduleNameAr: moduleDef.moduleNameAr,
        description: moduleDef.description,
        descriptionAr: moduleDef.descriptionAr,
        category: moduleDef.category,
        icon: moduleDef.icon,
        sortOrder: moduleDef.sortOrder,
        isActive: 'true',
        isSystemModule: 'true',
        updatedAt: new Date(),
      })
      .where(eq(dpfModules.id, existing[0].id))
      .returning();

    return { moduleId: updated[0].id, created: false };
  }

  // Create new module
  const inserted = await db
    .insert(dpfModules)
    .values({
      tenantId,
      moduleCode: moduleDef.moduleCode,
      moduleName: moduleDef.moduleName,
      moduleNameAr: moduleDef.moduleNameAr,
      description: moduleDef.description,
      descriptionAr: moduleDef.descriptionAr,
      category: moduleDef.category,
      icon: moduleDef.icon,
      sortOrder: moduleDef.sortOrder,
      isActive: 'true',
      isSystemModule: 'true',
    })
    .returning();

  return { moduleId: inserted[0].id, created: true };
}

/**
 * Sync a single screen (create or update)
 */
async function syncScreen(
  tenantId: string,
  moduleId: string,
  moduleCode: string,
  screenDef: any
): Promise<{ screenId: string; created: boolean }> {
  // Check if screen exists
  const existing = await db
    .select()
    .from(dpfScreens)
    .where(
      and(
        eq(dpfScreens.tenantId, tenantId),
        eq(dpfScreens.moduleId, moduleId),
        eq(dpfScreens.screenCode, screenDef.screenCode)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing screen
    const updated = await db
      .update(dpfScreens)
      .set({
        screenName: screenDef.screenName,
        screenNameAr: screenDef.screenNameAr,
        description: screenDef.description,
        descriptionAr: screenDef.descriptionAr,
        route: screenDef.route,
        isActive: 'true',
        updatedAt: new Date(),
      })
      .where(eq(dpfScreens.id, existing[0].id))
      .returning();

    return { screenId: updated[0].id, created: false };
  }

  // Create new screen
  const inserted = await db
    .insert(dpfScreens)
    .values({
      tenantId,
      moduleId,
      screenCode: screenDef.screenCode,
      screenName: screenDef.screenName,
      screenNameAr: screenDef.screenNameAr,
      description: screenDef.description,
      descriptionAr: screenDef.descriptionAr,
      route: screenDef.route,
      isActive: 'true',
    })
    .returning();

  return { screenId: inserted[0].id, created: true };
}

/**
 * Sync a single action (create or update)
 */
async function syncAction(
  tenantId: string,
  moduleId: string,
  screenId: string,
  moduleCode: string,
  screenCode: string,
  actionDef: any
): Promise<{ actionId: string; created: boolean }> {
  // Check if action exists
  const existing = await db
    .select()
    .from(dpfActions)
    .where(
      and(
        eq(dpfActions.tenantId, tenantId),
        eq(dpfActions.moduleId, moduleId),
        eq(dpfActions.actionCode, actionDef.actionCode)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing action
    const updated = await db
      .update(dpfActions)
      .set({
        screenId,
        actionName: actionDef.actionName,
        actionNameAr: actionDef.actionNameAr,
        description: actionDef.description,
        descriptionAr: actionDef.descriptionAr,
        actionType: 'CRUD',
        actionCategory: actionDef.actionType,
        isActive: 'true',
        updatedAt: new Date(),
      })
      .where(eq(dpfActions.id, existing[0].id))
      .returning();

    return { actionId: updated[0].id, created: false };
  }

  // Create new action
  const inserted = await db
    .insert(dpfActions)
    .values({
      tenantId,
      moduleId,
      screenId,
      actionCode: actionDef.actionCode,
      actionName: actionDef.actionName,
      actionNameAr: actionDef.actionNameAr,
      description: actionDef.description,
      descriptionAr: actionDef.descriptionAr,
      actionType: 'CRUD',
      actionCategory: actionDef.actionType,
      isActive: 'true',
    })
    .returning();

  return { actionId: inserted[0].id, created: true };
}

/**
 * Sync permission for an action (create if doesn't exist)
 */
async function syncPermission(
  tenantId: string,
  moduleId: string,
  screenId: string,
  actionId: string,
  actionDef: any
): Promise<boolean> {
  // Check if permission exists
  const existing = await db
    .select()
    .from(dpfPermissions)
    .where(
      and(
        eq(dpfPermissions.tenantId, tenantId),
        eq(dpfPermissions.permissionCode, actionDef.actionCode)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return false; // Permission already exists
  }

  // Create permission
  await db.insert(dpfPermissions).values({
    tenantId,
    permissionCode: actionDef.actionCode,
    permissionName: actionDef.actionName,
    permissionNameAr: actionDef.actionNameAr,
    description: actionDef.description,
    descriptionAr: actionDef.descriptionAr,
    moduleId,
    screenId,
    actionId,
    permissionType: 'ACTION',
    isActive: 'true',
  });

  return true;
}

/**
 * Validate DPF structure in database
 */
export async function validateDPFStructure(tenantId: string): Promise<void> {
  logger.info(`\n${'═'.repeat(70)}`);
  logger.info(`  DPF VALIDATION - Tenant: ${tenantId}`);
  logger.info(`${'═'.repeat(70)}\n`);

  const modules = await db.select().from(dpfModules).where(eq(dpfModules.tenantId, tenantId));
  const screens = await db.select().from(dpfScreens).where(eq(dpfScreens.tenantId, tenantId));
  const actions = await db.select().from(dpfActions).where(eq(dpfActions.tenantId, tenantId));
  const permissions = await db.select().from(dpfPermissions).where(eq(dpfPermissions.tenantId, tenantId));

  logger.info(`✅ Modules in DB:     ${modules.length}`);
  logger.info(`✅ Screens in DB:     ${screens.length}`);
  logger.info(`✅ Actions in DB:     ${actions.length}`);
  logger.info(`✅ Permissions in DB: ${permissions.length}`);

  const dpfStats = getDPFStatistics();
  
  if (modules.length !== dpfStats.totalModules) {
    logger.warn(`⚠️  Module count mismatch! Expected ${dpfStats.totalModules}, got ${modules.length}`);
  }
  if (screens.length !== dpfStats.totalScreens) {
    logger.warn(`⚠️  Screen count mismatch! Expected ${dpfStats.totalScreens}, got ${screens.length}`);
  }
  if (actions.length !== dpfStats.totalActions) {
    logger.warn(`⚠️  Action count mismatch! Expected ${dpfStats.totalActions}, got ${actions.length}`);
  }

  logger.info(`${'═'.repeat(70)}\n`);
}
