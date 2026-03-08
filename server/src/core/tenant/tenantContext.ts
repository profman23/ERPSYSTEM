import { AsyncLocalStorage } from 'async_hooks';
import { db } from '../../db';
import { tenants } from '../../db/schemas';
import { eq } from 'drizzle-orm';
import logger from '../../config/logger';

/**
 * AsyncLocalStorage-based Tenant Context
 * Provides request-scoped tenant isolation without global state
 * Safe for concurrent requests - no cross-contamination
 */

interface TenantContextData {
  tenantId: string | null;
  businessLineId: string | null;
  branchId: string | null;
  accessScope: string;
  userId: string;
  role: string;
}

const asyncLocalStorage = new AsyncLocalStorage<TenantContextData>();

// Cache SYSTEM tenant ID to avoid repeated DB queries
let cachedSystemTenantId: string | null = null;

export class TenantContext {
  /**
   * Run a function within a tenant context
   * Used by middleware to establish request-scoped context
   */
  static run<T>(context: TenantContextData, callback: () => T): T {
    return asyncLocalStorage.run(context, callback);
  }

  /**
   * Get the current tenant context (request-scoped)
   * Returns null if called outside of a context
   */
  static getContext(): TenantContextData | null {
    return asyncLocalStorage.getStore() ?? null;
  }

  /**
   * Get current tenant ID (request-scoped)
   * Returns null if no context or user is system-scoped
   */
  static getTenantId(): string | null {
    const context = asyncLocalStorage.getStore();
    return context?.tenantId ?? null;
  }

  /**
   * Get current business line ID (request-scoped)
   */
  static getBusinessLineId(): string | null {
    const context = asyncLocalStorage.getStore();
    return context?.businessLineId ?? null;
  }

  /**
   * Get current branch ID (request-scoped)
   */
  static getBranchId(): string | null {
    const context = asyncLocalStorage.getStore();
    return context?.branchId ?? null;
  }

  /**
   * Get current access scope (request-scoped)
   */
  static getAccessScope(): string | null {
    const context = asyncLocalStorage.getStore();
    return context?.accessScope ?? null;
  }

  /**
   * Get current user ID (request-scoped)
   */
  static getUserId(): string | null {
    const context = asyncLocalStorage.getStore();
    return context?.userId ?? null;
  }

  /**
   * Get SYSTEM tenant ID (cached)
   * Used by controllers that need to operate on SYSTEM tenant for system users
   */
  static async getSystemTenantId(): Promise<string | null> {
    if (cachedSystemTenantId) return cachedSystemTenantId;

    const result = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.code, 'SYSTEM'))
      .limit(1);

    if (result.length > 0) {
      cachedSystemTenantId = result[0].id;
    }

    return cachedSystemTenantId;
  }

  /**
   * Get effective tenant ID for the current context
   * For system users, returns SYSTEM tenant ID
   * For regular users, returns their tenant ID
   */
  static async getEffectiveTenantId(): Promise<string | null> {
    const context = asyncLocalStorage.getStore();
    if (!context) return null;

    // For system users, use SYSTEM tenant
    if (context.accessScope === 'system') {
      return await TenantContext.getSystemTenantId();
    }

    return context.tenantId;
  }

  /**
   * Check if current user is a system user
   */
  static isSystemUser(): boolean {
    const context = asyncLocalStorage.getStore();
    return context?.accessScope === 'system';
  }

  /**
   * Legacy methods for backward compatibility (deprecated)
   * These are no-ops now since AsyncLocalStorage manages lifecycle
   */
  static setTenantId(_tenantId: string): void {
    // No-op: AsyncLocalStorage handles setting via run()
    logger.warn('TenantContext.setTenantId() is deprecated. Use AsyncLocalStorage via run().');
  }

  static clear(): void {
    // No-op: AsyncLocalStorage auto-clears when request ends
    // Keeping for backward compatibility but no action needed
  }
}
