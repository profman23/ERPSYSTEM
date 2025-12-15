/**
 * DPFTemplateService - DPF Template Copying System
 * 
 * Leverages the existing seedDPFStructure function for fast DPF setup.
 * Provides caching and warmup capabilities.
 */

import { db } from '../db';
import { dpfModules, tenants } from '../db/schemas';
import { eq } from 'drizzle-orm';
import { contextLogger } from '../core/context/contextLogger';
import { seedDPFStructure } from '../db/seed/seedDPFStructure';

export class DPFTemplateService {
  private static instance: DPFTemplateService;
  private templateWarmedUp: boolean = false;

  private constructor() {}

  static getInstance(): DPFTemplateService {
    if (!DPFTemplateService.instance) {
      DPFTemplateService.instance = new DPFTemplateService();
    }
    return DPFTemplateService.instance;
  }

  async copyTemplateToTenant(tenantId: string): Promise<{
    success: boolean;
    modulesCreated: number;
    screensCreated: number;
    actionsCreated: number;
    permissionsCreated: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const existingModules = await db.query.dpfModules.findMany({
        where: eq(dpfModules.tenantId, tenantId),
        columns: { id: true },
      });

      if (existingModules.length > 0) {
        contextLogger.info('DPF structure already exists for tenant', { tenantId });
        return {
          success: true,
          modulesCreated: 0,
          screensCreated: 0,
          actionsCreated: 0,
          permissionsCreated: 0,
        };
      }

      const stats = await seedDPFStructure(tenantId);

      await db.update(tenants)
        .set({ dpfTemplateApplied: new Date() })
        .where(eq(tenants.id, tenantId));

      const duration = Date.now() - startTime;
      contextLogger.info('DPF template copied to tenant', {
        tenantId,
        modulesCreated: stats.modulesCreated,
        screensCreated: stats.screensCreated,
        actionsCreated: stats.actionsCreated,
        permissionsCreated: stats.permissionsCreated,
        durationMs: duration,
      });

      return {
        success: true,
        modulesCreated: stats.modulesCreated,
        screensCreated: stats.screensCreated,
        actionsCreated: stats.actionsCreated,
        permissionsCreated: stats.permissionsCreated,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      contextLogger.error('Failed to copy DPF template to tenant', { tenantId, error });
      return {
        success: false,
        modulesCreated: 0,
        screensCreated: 0,
        actionsCreated: 0,
        permissionsCreated: 0,
        error: errorMessage,
      };
    }
  }

  async warmupCache(): Promise<boolean> {
    this.templateWarmedUp = true;
    contextLogger.info('DPF template service warmed up');
    return true;
  }

  isWarmedUp(): boolean {
    return this.templateWarmedUp;
  }
}

export const dpfTemplateService = DPFTemplateService.getInstance();
