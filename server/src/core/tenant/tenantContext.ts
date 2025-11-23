import { AsyncLocalStorage } from 'async_hooks';

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
   * Legacy methods for backward compatibility (deprecated)
   * These are no-ops now since AsyncLocalStorage manages lifecycle
   */
  static setTenantId(_tenantId: string): void {
    // No-op: AsyncLocalStorage handles setting via run()
    console.warn('TenantContext.setTenantId() is deprecated. Use AsyncLocalStorage via run().');
  }

  static clear(): void {
    // No-op: AsyncLocalStorage auto-clears when request ends
    // Keeping for backward compatibility but no action needed
  }
}
