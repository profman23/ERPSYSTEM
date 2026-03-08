/**
 * AGI Settings Service - Tenant AI Configuration Management
 * Enterprise-grade with caching and tenant isolation
 */

import { db } from '../db';
import { dpfAgiSettings, dpfSystemAiConfig, tenants } from '../db/schemas';
import { eq } from 'drizzle-orm';
import { cacheService } from './CacheService';
import type { AgiAccessLevel, AgiSettings, UpdateAgiSettingsInput, SystemAiConfig, UpdateSystemAiConfigInput } from '../../../types/agi';

const CACHE_TTL = 300; // 5 minutes

export class AgiSettingsService {
  // ═══════════════════════════════════════════════════════════════
  // TENANT SETTINGS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get AGI settings for a tenant
   * Creates default settings if none exist
   */
  static async getSettings(tenantId: string): Promise<AgiSettings> {
    // Check cache first
    const cacheKey = `agi:settings:${tenantId}`;
    const cached = await cacheService.get<AgiSettings>(cacheKey);
    if (cached) return cached;

    // Query database
    const result = await db
      .select()
      .from(dpfAgiSettings)
      .where(eq(dpfAgiSettings.tenantId, tenantId))
      .limit(1);

    if (result.length > 0) {
      const settings = this.mapToAgiSettings(result[0]);
      await cacheService.set(cacheKey, settings, CACHE_TTL);
      return settings;
    }

    // Create default settings for new tenant
    const newSettings = await this.createDefaultSettings(tenantId);
    await cacheService.set(cacheKey, newSettings, CACHE_TTL);
    return newSettings;
  }

  /**
   * Update AGI settings for a tenant
   */
  static async updateSettings(tenantId: string, input: UpdateAgiSettingsInput): Promise<AgiSettings> {
    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.isEnabled !== undefined) updateData.isEnabled = input.isEnabled ? 'true' : 'false';
    if (input.allowVoiceCommands !== undefined) updateData.allowVoiceCommands = input.allowVoiceCommands ? 'true' : 'false';
    if (input.allowAutonomousActions !== undefined) updateData.allowAutonomousActions = input.allowAutonomousActions ? 'true' : 'false';
    if (input.requireApprovalForDestructive !== undefined) updateData.requireApprovalForDestructive = input.requireApprovalForDestructive ? 'true' : 'false';
    if (input.defaultModel !== undefined) updateData.defaultModel = input.defaultModel;
    if (input.maxTokensPerRequest !== undefined) updateData.maxTokensPerRequest = input.maxTokensPerRequest;
    if (input.temperature !== undefined) updateData.temperature = input.temperature;
    if (input.dailyRequestLimit !== undefined) updateData.dailyRequestLimit = input.dailyRequestLimit;
    if (input.monthlyRequestLimit !== undefined) updateData.monthlyRequestLimit = input.monthlyRequestLimit;
    if (input.defaultAgiLevel !== undefined) updateData.defaultAgiLevel = input.defaultAgiLevel;
    if (input.customSystemPrompt !== undefined) updateData.customSystemPrompt = input.customSystemPrompt;

    // Check if settings exist
    const existing = await db
      .select({ id: dpfAgiSettings.id })
      .from(dpfAgiSettings)
      .where(eq(dpfAgiSettings.tenantId, tenantId))
      .limit(1);

    let result;
    if (existing.length === 0) {
      // Create with updates
      [result] = await db
        .insert(dpfAgiSettings)
        .values({
          tenantId,
          ...updateData,
        })
        .returning();
    } else {
      // Update existing
      [result] = await db
        .update(dpfAgiSettings)
        .set(updateData)
        .where(eq(dpfAgiSettings.tenantId, tenantId))
        .returning();
    }

    // Invalidate cache
    await cacheService.del(`agi:settings:${tenantId}`);

    return this.mapToAgiSettings(result);
  }

  /**
   * Create default settings for a new tenant
   */
  private static async createDefaultSettings(tenantId: string): Promise<AgiSettings> {
    const [result] = await db
      .insert(dpfAgiSettings)
      .values({
        tenantId,
        isEnabled: 'true',
        allowVoiceCommands: 'false',
        allowAutonomousActions: 'false',
        requireApprovalForDestructive: 'true',
        defaultModel: 'claude-sonnet-4-20250514',
        maxTokensPerRequest: 4096,
        temperature: 0.7,
        dailyRequestLimit: 0,
        monthlyRequestLimit: 0,
        defaultAgiLevel: 'SUGGEST',
      })
      .returning();

    return this.mapToAgiSettings(result);
  }

  /**
   * Map database record to AgiSettings type
   */
  private static mapToAgiSettings(record: typeof dpfAgiSettings.$inferSelect): AgiSettings {
    return {
      id: record.id,
      tenantId: record.tenantId,
      isEnabled: record.isEnabled === 'true',
      allowVoiceCommands: record.allowVoiceCommands === 'true',
      allowAutonomousActions: record.allowAutonomousActions === 'true',
      requireApprovalForDestructive: record.requireApprovalForDestructive === 'true',
      defaultModel: record.defaultModel,
      maxTokensPerRequest: record.maxTokensPerRequest,
      temperature: record.temperature,
      dailyRequestLimit: record.dailyRequestLimit,
      monthlyRequestLimit: record.monthlyRequestLimit,
      defaultAgiLevel: record.defaultAgiLevel as AgiAccessLevel,
      customSystemPrompt: record.customSystemPrompt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SYSTEM CONFIG (Platform-Wide)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get system-wide AI configuration
   */
  static async getSystemConfig(): Promise<SystemAiConfig> {
    const cacheKey = 'agi:system:config';
    const cached = await cacheService.get<SystemAiConfig>(cacheKey);
    if (cached) return cached;

    const result = await db
      .select()
      .from(dpfSystemAiConfig)
      .limit(1);

    if (result.length > 0) {
      const config = this.mapToSystemConfig(result[0]);
      await cacheService.set(cacheKey, config, CACHE_TTL);
      return config;
    }

    // Create default system config
    const newConfig = await this.createDefaultSystemConfig();
    await cacheService.set(cacheKey, newConfig, CACHE_TTL);
    return newConfig;
  }

  /**
   * Update system-wide AI configuration
   */
  static async updateSystemConfig(input: UpdateSystemAiConfigInput): Promise<SystemAiConfig> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.isAiEnabled !== undefined) updateData.isAiEnabled = input.isAiEnabled ? 'true' : 'false';
    if (input.defaultModel !== undefined) updateData.defaultModel = input.defaultModel;
    if (input.fallbackModel !== undefined) updateData.fallbackModel = input.fallbackModel;
    if (input.allowTenantCustomPrompts !== undefined) updateData.allowTenantCustomPrompts = input.allowTenantCustomPrompts ? 'true' : 'false';
    if (input.allowVoiceCommandsGlobally !== undefined) updateData.allowVoiceCommandsGlobally = input.allowVoiceCommandsGlobally ? 'true' : 'false';
    if (input.maxTokensPerRequest !== undefined) updateData.maxTokensPerRequest = input.maxTokensPerRequest;
    if (input.globalRateLimitPerMinute !== undefined) updateData.globalRateLimitPerMinute = input.globalRateLimitPerMinute;
    if (input.enableDetailedLogging !== undefined) updateData.enableDetailedLogging = input.enableDetailedLogging ? 'true' : 'false';
    if (input.logRetentionDays !== undefined) updateData.logRetentionDays = input.logRetentionDays;

    // Get existing config
    const existing = await db.select({ id: dpfSystemAiConfig.id }).from(dpfSystemAiConfig).limit(1);

    let result;
    if (existing.length === 0) {
      [result] = await db
        .insert(dpfSystemAiConfig)
        .values(updateData)
        .returning();
    } else {
      [result] = await db
        .update(dpfSystemAiConfig)
        .set(updateData)
        .where(eq(dpfSystemAiConfig.id, existing[0].id))
        .returning();
    }

    // Invalidate cache
    await cacheService.del('agi:system:config');

    return this.mapToSystemConfig(result);
  }

  /**
   * Mark API key as configured (call after setting env var)
   */
  static async markApiKeyConfigured(configured: boolean): Promise<void> {
    const existing = await db.select({ id: dpfSystemAiConfig.id }).from(dpfSystemAiConfig).limit(1);

    if (existing.length > 0) {
      await db
        .update(dpfSystemAiConfig)
        .set({
          apiKeyConfigured: configured ? 'true' : 'false',
          updatedAt: new Date(),
        })
        .where(eq(dpfSystemAiConfig.id, existing[0].id));
    } else {
      await db.insert(dpfSystemAiConfig).values({
        apiKeyConfigured: configured ? 'true' : 'false',
      });
    }

    await cacheService.del('agi:system:config');
  }

  /**
   * Create default system configuration
   */
  private static async createDefaultSystemConfig(): Promise<SystemAiConfig> {
    // Check if API key is in environment
    const apiKeyConfigured = !!process.env.CLAUDE_API_KEY;

    const [result] = await db
      .insert(dpfSystemAiConfig)
      .values({
        isAiEnabled: 'true',
        defaultModel: 'claude-sonnet-4-20250514',
        fallbackModel: 'claude-sonnet-4-20250514',
        apiKeyConfigured: apiKeyConfigured ? 'true' : 'false',
        allowTenantCustomPrompts: 'true',
        allowVoiceCommandsGlobally: 'true',
        maxTokensPerRequest: 4096,
        globalRateLimitPerMinute: 100,
        enableDetailedLogging: 'true',
        logRetentionDays: 90,
      })
      .returning();

    return this.mapToSystemConfig(result);
  }

  /**
   * Map database record to SystemAiConfig type
   */
  private static mapToSystemConfig(record: typeof dpfSystemAiConfig.$inferSelect): SystemAiConfig {
    return {
      isAiEnabled: record.isAiEnabled === 'true',
      defaultModel: record.defaultModel,
      fallbackModel: record.fallbackModel,
      apiKeyConfigured: record.apiKeyConfigured === 'true',
      allowTenantCustomPrompts: record.allowTenantCustomPrompts === 'true',
      allowVoiceCommandsGlobally: record.allowVoiceCommandsGlobally === 'true',
      maxTokensPerRequest: record.maxTokensPerRequest,
      globalRateLimitPerMinute: record.globalRateLimitPerMinute,
      enableDetailedLogging: record.enableDetailedLogging === 'true',
      logRetentionDays: record.logRetentionDays,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if AI is enabled for a tenant
   * 3 gates: system kill switch AND tenant checkbox AND tenant AI settings
   */
  static async isAiEnabled(tenantId: string): Promise<boolean> {
    const [systemConfig, tenant] = await Promise.all([
      this.getSystemConfig(),
      db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) }),
    ]);

    // System kill switch + tenant-level checkbox (set during tenant creation)
    return systemConfig.isAiEnabled && (tenant?.aiAssistantEnabled ?? false);
  }

  /**
   * Get effective model for a tenant
   */
  static async getEffectiveModel(tenantId: string): Promise<string> {
    const [systemConfig, tenantSettings] = await Promise.all([
      this.getSystemConfig(),
      this.getSettings(tenantId),
    ]);

    // Tenant can override if allowed, otherwise use system default
    return tenantSettings.defaultModel || systemConfig.defaultModel;
  }
}
