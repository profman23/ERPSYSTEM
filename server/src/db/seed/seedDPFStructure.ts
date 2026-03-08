/**
 * DPF Structure Sync Script (SAP B1 Style)
 * Syncs static DPF structure to database for a given tenant
 *
 * Features:
 * - Reads dpfStructure.ts as source of truth
 * - Creates/updates modules and screens only (no actions)
 * - 100% idempotent (safe to run multiple times)
 * - Soft-deletes orphaned modules/screens removed from dpfStructure.ts
 * - Detailed logging of all changes
 */

import { db } from '../index';
import { eq, and, not, ne, ilike, inArray } from 'drizzle-orm';
import { dpfModules, dpfScreens, dpfRoleScreenAuthorizations, tenants } from '../schemas';
import { dpfRoles } from '../schemas/dpfRoles';
import { DPF_STRUCTURE, getDPFStatistics } from '../../rbac/dpfStructure';
import logger from '../../config/logger';
import { cacheService } from '../../services/CacheService';

interface SyncStats {
  modulesCreated: number;
  modulesUpdated: number;
  modulesDeactivated: number;
  screensCreated: number;
  screensUpdated: number;
  screensDeactivated: number;
  actionsCreated: number;
  permissionsCreated: number;
  authorizationsGranted: number;
}

/**
 * Sync DPF structure for a specific tenant
 */
export async function seedDPFStructure(tenantId: string): Promise<SyncStats> {
  const stats: SyncStats = {
    modulesCreated: 0,
    modulesUpdated: 0,
    modulesDeactivated: 0,
    screensCreated: 0,
    screensUpdated: 0,
    screensDeactivated: 0,
    actionsCreated: 0,
    permissionsCreated: 0,
    authorizationsGranted: 0,
  };

  // Track newly created screen codes to grant to built-in roles
  const newScreenCodes: string[] = [];

  logger.info(`\n${'═'.repeat(70)}`);
  logger.info(`  DPF STRUCTURE SYNC (SAP B1 Style) - Tenant: ${tenantId}`);
  logger.info(`${'═'.repeat(70)}\n`);

  const dpfStats = getDPFStatistics();
  logger.info(`📊 Source Structure: ${dpfStats.totalModules} modules, ${dpfStats.totalScreens} screens\n`);

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
          newScreenCodes.push(screenDef.screenCode);
          logger.info(`  ✅ Created screen: ${moduleDef.moduleCode} → ${screenDef.screenCode}`);
        } else {
          stats.screensUpdated++;
          logger.info(`  ♻️  Updated screen: ${moduleDef.moduleCode} → ${screenDef.screenCode}`);
        }
      }
    }

    // Auto-grant new screens to built-in roles (Full Authorization)
    // This ensures built-in roles (TENANT_ADMIN, etc.) always have access
    // to newly added screens without manual intervention.
    if (newScreenCodes.length > 0) {
      stats.authorizationsGranted += await grantNewScreensToBuiltInRoles(
        tenantId,
        newScreenCodes,
      );
    }

    // Backfill: ensure ALL screens have authorizations for built-in roles.
    // Covers screens that were added before this auto-grant logic existed.
    const allScreenCodes = DPF_STRUCTURE.flatMap((m) => m.screens.map((s) => s.screenCode));
    stats.authorizationsGranted += await grantNewScreensToBuiltInRoles(
      tenantId,
      allScreenCodes,
    );

    // Deactivate orphaned modules/screens not in DPF_STRUCTURE
    const orphanResult = await deactivateOrphanedModulesAndScreens(tenantId);
    stats.modulesDeactivated = orphanResult.modulesDeactivated;
    stats.screensDeactivated = orphanResult.screensDeactivated;
    if (orphanResult.modulesDeactivated > 0 || orphanResult.screensDeactivated > 0) {
      logger.info(`🧹 Cleanup: deactivated ${orphanResult.modulesDeactivated} orphan module(s), ${orphanResult.screensDeactivated} orphan screen(s)`);
    }

    // Invalidate cached module tree so changes are immediately visible
    await cacheService.del(`tenant:${tenantId}:dpf:module-tree:tenant`);
    await cacheService.del(`tenant:${tenantId}:dpf:module-tree:system`);

    // Print summary
    logger.info(`\n${'═'.repeat(70)}`);
    logger.info(`  SYNC COMPLETE - Summary`);
    logger.info(`${'═'.repeat(70)}`);
    logger.info(`Modules: ${stats.modulesCreated} created, ${stats.modulesUpdated} updated, ${stats.modulesDeactivated} deactivated`);
    logger.info(`Screens: ${stats.screensCreated} created, ${stats.screensUpdated} updated, ${stats.screensDeactivated} deactivated`);
    if (stats.authorizationsGranted > 0) {
      logger.info(`Authorizations: ${stats.authorizationsGranted} granted to built-in roles`);
    }
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

  // Determine if this is a system module from the definition
  const isSystemModule = moduleDef.isSystemModule === true ? 'true' : 'false';

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
        isSystemModule,
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
      isSystemModule,
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
  // Check if screen exists (by screenCode only — supports moving between modules)
  const existing = await db
    .select()
    .from(dpfScreens)
    .where(
      and(
        eq(dpfScreens.tenantId, tenantId),
        eq(dpfScreens.screenCode, screenDef.screenCode)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing screen (including moduleId if screen moved to a different module)
    const updated = await db
      .update(dpfScreens)
      .set({
        moduleId,
        screenName: screenDef.screenName,
        screenNameAr: screenDef.screenNameAr,
        description: screenDef.description,
        descriptionAr: screenDef.descriptionAr,
        route: screenDef.route,
        sortOrder: screenDef.sortOrder || '0',
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
      sortOrder: screenDef.sortOrder || '0',
      isActive: 'true',
    })
    .returning();

  return { screenId: inserted[0].id, created: true };
}

/**
 * Auto-grant new screens to built-in roles with Full Authorization (level 2).
 *
 * When the DPF structure adds a new screen, existing built-in roles (e.g.
 * TENANT_ADMIN) won't have an authorization row for it yet. This function
 * fills that gap so admins don't have to manually grant every new screen.
 *
 * Idempotent: uses ON CONFLICT DO NOTHING — safe to run repeatedly.
 */
async function grantNewScreensToBuiltInRoles(
  tenantId: string,
  screenCodes: string[],
): Promise<number> {
  // Find all built-in roles for this tenant
  const builtInRoles = await db
    .select({ id: dpfRoles.id, roleName: dpfRoles.roleName })
    .from(dpfRoles)
    .where(
      and(
        eq(dpfRoles.tenantId, tenantId),
        eq(dpfRoles.isBuiltIn, 'true'),
      ),
    );

  if (builtInRoles.length === 0) return 0;

  let granted = 0;

  for (const role of builtInRoles) {
    const rows = screenCodes.map((screenCode) => ({
      tenantId,
      roleId: role.id,
      screenCode,
      authorizationLevel: 2, // Full Authorization
    }));

    // ON CONFLICT DO NOTHING prevents duplicates if the row already exists
    await db
      .insert(dpfRoleScreenAuthorizations)
      .values(rows)
      .onConflictDoNothing({ target: [dpfRoleScreenAuthorizations.roleId, dpfRoleScreenAuthorizations.screenCode] });

    granted += rows.length;
    logger.info(`  🔑 Granted ${screenCodes.length} new screen(s) to ${role.roleName}`);
  }

  return granted;
}

/**
 * Deactivate modules and screens that exist in DB but NOT in dpfStructure.ts.
 * Ensures removed definitions don't linger as active orphans.
 * Safe: soft-delete only (isActive='false'), never hard-delete.
 */
async function deactivateOrphanedModulesAndScreens(
  tenantId: string
): Promise<{ modulesDeactivated: number; screensDeactivated: number }> {
  const definedModuleCodes = DPF_STRUCTURE.map(m => m.moduleCode);
  const definedScreenCodes = DPF_STRUCTURE.flatMap(m => m.screens.map(s => s.screenCode));

  // Deactivate orphaned screens first (before modules, FK dependency)
  const screensResult = await db
    .update(dpfScreens)
    .set({ isActive: 'false', updatedAt: new Date() })
    .where(and(
      eq(dpfScreens.tenantId, tenantId),
      eq(dpfScreens.isActive, 'true'),
      not(inArray(dpfScreens.screenCode, definedScreenCodes)),
    ))
    .returning({ id: dpfScreens.id });

  // Deactivate duplicate screens (same screenCode in wrong module after a move)
  // Build screenCode → expected moduleCode map from DPF_STRUCTURE
  for (const moduleDef of DPF_STRUCTURE) {
    const moduleRow = await db
      .select({ id: dpfModules.id })
      .from(dpfModules)
      .where(and(eq(dpfModules.tenantId, tenantId), eq(dpfModules.moduleCode, moduleDef.moduleCode)))
      .limit(1);
    if (moduleRow.length === 0) continue;

    const expectedModuleId = moduleRow[0].id;
    for (const screenDef of moduleDef.screens) {
      const dupes = await db
        .update(dpfScreens)
        .set({ isActive: 'false', updatedAt: new Date() })
        .where(and(
          eq(dpfScreens.tenantId, tenantId),
          eq(dpfScreens.screenCode, screenDef.screenCode),
          eq(dpfScreens.isActive, 'true'),
          ne(dpfScreens.moduleId, expectedModuleId),
        ))
        .returning({ id: dpfScreens.id });
      if (dupes.length > 0) {
        screensResult.push(...dupes);
        logger.info(`  🧹 Deactivated ${dupes.length} duplicate screen(s): ${screenDef.screenCode}`);
      }
    }
  }

  // Deactivate orphaned modules
  const modulesResult = await db
    .update(dpfModules)
    .set({ isActive: 'false', updatedAt: new Date() })
    .where(and(
      eq(dpfModules.tenantId, tenantId),
      eq(dpfModules.isActive, 'true'),
      not(inArray(dpfModules.moduleCode, definedModuleCodes)),
    ))
    .returning({ id: dpfModules.id });

  return {
    modulesDeactivated: modulesResult.length,
    screensDeactivated: screensResult.length,
  };
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

  logger.info(`✅ Modules in DB:  ${modules.length}`);
  logger.info(`✅ Screens in DB:  ${screens.length}`);

  const dpfStats = getDPFStatistics();

  if (modules.length !== dpfStats.totalModules) {
    logger.warn(`⚠️  Module count mismatch! Expected ${dpfStats.totalModules}, got ${modules.length}`);
  }
  if (screens.length !== dpfStats.totalScreens) {
    logger.warn(`⚠️  Screen count mismatch! Expected ${dpfStats.totalScreens}, got ${screens.length}`);
  }

  logger.info(`${'═'.repeat(70)}\n`);
}

/**
 * Sync DPF structure for ALL tenants (excluding code reservations).
 *
 * Called on server startup to ensure new screens + authorizations
 * are propagated to every tenant's built-in roles.
 * Idempotent and safe to run on every boot.
 */
export async function syncAllTenantsDPF(): Promise<void> {
  const allTenants = await db
    .select({ id: tenants.id, code: tenants.code, name: tenants.name })
    .from(tenants)
    .where(not(ilike(tenants.name, '%__CODE_RESERVATION__%')));

  if (allTenants.length === 0) return;

  const BATCH_SIZE = 10;
  const startTime = Date.now();
  logger.info(`🔄 Syncing DPF for ${allTenants.length} tenant(s) in batches of ${BATCH_SIZE}...`);

  // Process tenants in parallel batches for faster startup
  for (let i = 0; i < allTenants.length; i += BATCH_SIZE) {
    const batch = allTenants.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (t) => {
        try {
          const result = await seedDPFStructure(t.id);
          if (result.screensCreated > 0 || result.authorizationsGranted > 0) {
            logger.info(`  ${t.code}: +${result.screensCreated} screens, +${result.authorizationsGranted} authorizations`);
          }
        } catch (err) {
          logger.error(`  Error syncing DPF for ${t.code}:`, err);
        }
      })
    );
  }

  const duration = Date.now() - startTime;
  logger.info(`✅ DPF sync complete for ${allTenants.length} tenants in ${duration}ms`);
}
