/**
 * RBAC Scope Service - AGI-Ready with Hot Path Caching
 * Phase 7: Implements multi-level access scoping with L1/L2 cache integration
 * 
 * Scope Levels: tenant > business_line > branch > mixed
 * 
 * Performance Target: 99%+ cache hit ratio for getScopeFilter()
 */

import { db } from '../db';
import { eq, and, inArray } from 'drizzle-orm';
import { users, branches, businessLines, tenants } from '../db/schemas';
import { RequestContext } from '../core/context';
import { contextLogger } from '../core/context';
import { cacheService } from '../core/cache';
import { CACHE_KEYS, CACHE_TAGS } from '../core/cache/types';

export type ScopeType = 'tenant' | 'business_line' | 'branch' | 'mixed';

export interface ScopeContext {
  scopeType: ScopeType;
  tenantId: string;
  businessLineId?: string | null;
  branchId?: string | null;
  allowedBranchIds?: string[];
}

export interface ScopeFilter {
  tenantId: string;
  businessLineIds?: string[];
  branchIds?: string[];
}

const SCOPE_CACHE_TTL = 2 * 60 * 1000;
const SCOPE_STALE_TIME = 5 * 60 * 1000;

export class ScopeService {
  /**
   * Resolve tenant ID for a user - from context or database
   * Used to ensure consistent tenant scoping even in background jobs
   */
  private static async resolveTenantId(userId: string): Promise<string | null> {
    const contextTenantId = RequestContext.getTenantId();
    if (contextTenantId) return contextTenantId;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { tenantId: true },
    });
    return user?.tenantId || null;
  }

  /**
   * Resolve user's effective scope context (CACHED)
   * Returns the scope boundaries for data access
   */
  static async resolveUserScope(userId: string): Promise<ScopeContext | null> {
    const tenantId = await this.resolveTenantId(userId);
    if (!tenantId) {
      return null;
    }

    const cacheKey = CACHE_KEYS.scopeContext(tenantId, userId);
    
    return cacheService.getStale(
      cacheKey,
      async () => {
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (!user || !user.tenantId) {
          return null;
        }

        const scopeContext: ScopeContext = {
          scopeType: (user.accessScope as ScopeType) || 'branch',
          tenantId: user.tenantId,
          businessLineId: user.businessLineId,
          branchId: user.branchId,
          allowedBranchIds: (user.allowedBranchIds as string[]) || [],
        };

        return scopeContext;
      },
      {
        ttl: SCOPE_CACHE_TTL,
        staleWhileRevalidate: true,
        staleTime: SCOPE_STALE_TIME,
        tags: [CACHE_TAGS.SCOPES, CACHE_TAGS.USERS],
        priority: 'critical',
        tenantScoped: true,
        explicitTenantId: tenantId,
      }
    );
  }

  /**
   * Get scope filter for database queries (HOT PATH - AGGRESSIVELY CACHED)
   * This determines which records the user can access
   * 
   * Performance: L1 cache hit target 99%+
   */
  static async getScopeFilter(userId: string): Promise<ScopeFilter | null> {
    const tenantId = await this.resolveTenantId(userId);
    if (!tenantId) {
      return null;
    }

    const cacheKey = CACHE_KEYS.scopeFilter(tenantId, userId);
    
    return cacheService.getStale(
      cacheKey,
      async () => {
        const scopeContext = await this.resolveUserScopeUncached(userId);
        if (!scopeContext) return null;

        const filter: ScopeFilter = {
          tenantId: scopeContext.tenantId,
        };

        switch (scopeContext.scopeType) {
          case 'tenant':
            break;

          case 'business_line':
            if (scopeContext.businessLineId) {
              const branchesInLine = await db.query.branches.findMany({
                where: and(
                  eq(branches.tenantId, scopeContext.tenantId),
                  eq(branches.businessLineId, scopeContext.businessLineId)
                ),
              });
              filter.businessLineIds = [scopeContext.businessLineId];
              filter.branchIds = branchesInLine.map(b => b.id);
            }
            break;

          case 'branch':
            if (scopeContext.branchId) {
              filter.branchIds = [scopeContext.branchId];
              if (scopeContext.businessLineId) {
                filter.businessLineIds = [scopeContext.businessLineId];
              }
            }
            break;

          case 'mixed':
            if (scopeContext.allowedBranchIds && scopeContext.allowedBranchIds.length > 0) {
              filter.branchIds = scopeContext.allowedBranchIds;
              const allowedBranches = await db.query.branches.findMany({
                where: inArray(branches.id, scopeContext.allowedBranchIds),
              });
              filter.businessLineIds = [...new Set(allowedBranches.map(b => b.businessLineId).filter(Boolean))] as string[];
            }
            break;
        }

        return filter;
      },
      {
        ttl: SCOPE_CACHE_TTL,
        staleWhileRevalidate: true,
        staleTime: SCOPE_STALE_TIME,
        tags: [CACHE_TAGS.SCOPES, CACHE_TAGS.HIERARCHY],
        priority: 'critical',
        tenantScoped: true,
        explicitTenantId: tenantId,
      }
    );
  }

  /**
   * Internal uncached scope filter for fallback
   */
  private static async getScopeFilterUncached(userId: string): Promise<ScopeFilter | null> {
    const scopeContext = await this.resolveUserScopeUncached(userId);
    if (!scopeContext) return null;

    const filter: ScopeFilter = { tenantId: scopeContext.tenantId };

    switch (scopeContext.scopeType) {
      case 'tenant':
        break;
      case 'business_line':
        if (scopeContext.businessLineId) {
          const branchesInLine = await db.query.branches.findMany({
            where: and(
              eq(branches.tenantId, scopeContext.tenantId),
              eq(branches.businessLineId, scopeContext.businessLineId)
            ),
          });
          filter.businessLineIds = [scopeContext.businessLineId];
          filter.branchIds = branchesInLine.map(b => b.id);
        }
        break;
      case 'branch':
        if (scopeContext.branchId) {
          filter.branchIds = [scopeContext.branchId];
          if (scopeContext.businessLineId) {
            filter.businessLineIds = [scopeContext.businessLineId];
          }
        }
        break;
      case 'mixed':
        if (scopeContext.allowedBranchIds && scopeContext.allowedBranchIds.length > 0) {
          filter.branchIds = scopeContext.allowedBranchIds;
          const allowedBranches = await db.query.branches.findMany({
            where: inArray(branches.id, scopeContext.allowedBranchIds),
          });
          filter.businessLineIds = [...new Set(allowedBranches.map(b => b.businessLineId).filter(Boolean))] as string[];
        }
        break;
    }

    return filter;
  }

  /**
   * Internal uncached scope resolution for cache factory
   */
  private static async resolveUserScopeUncached(userId: string): Promise<ScopeContext | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.tenantId) {
      return null;
    }

    return {
      scopeType: (user.accessScope as ScopeType) || 'branch',
      tenantId: user.tenantId,
      businessLineId: user.businessLineId,
      branchId: user.branchId,
      allowedBranchIds: (user.allowedBranchIds as string[]) || [],
    };
  }

  /**
   * Invalidate scope cache for a user
   * Called when user's scope or assignments change
   */
  static async invalidateUserScope(userId: string, tenantId?: string): Promise<void> {
    const tid = tenantId || RequestContext.getTenantId();
    if (!tid) {
      await cacheService.invalidateByTags([CACHE_TAGS.SCOPES]);
      contextLogger.debug('User scope cache invalidated via tags (no tenant context)', { userId });
      return;
    }

    await cacheService.delete(CACHE_KEYS.scopeFilter(tid, userId));
    await cacheService.delete(CACHE_KEYS.scopeContext(tid, userId));
    await cacheService.delete(CACHE_KEYS.userBranches(tid, userId));
    await cacheService.delete(CACHE_KEYS.userBusinessLines(tid, userId));
    
    contextLogger.debug('User scope cache invalidated', { userId, tenantId: tid });
  }

  /**
   * Invalidate all scope caches for a tenant
   * Called when tenant hierarchy changes
   */
  static async invalidateTenantScopes(tenantId: string): Promise<void> {
    await cacheService.invalidateByTags([CACHE_TAGS.SCOPES]);
    contextLogger.debug('Tenant scope caches invalidated', { tenantId });
  }

  /**
   * Check if user can access a specific resource (CACHED)
   */
  static async canAccessResource(
    userId: string,
    resourceTenantId: string,
    resourceBusinessLineId?: string | null,
    resourceBranchId?: string | null
  ): Promise<boolean> {
    const scopeFilter = await this.getScopeFilter(userId);
    if (!scopeFilter) return false;

    if (scopeFilter.tenantId !== resourceTenantId) {
      return false;
    }

    const scopeContext = await this.resolveUserScope(userId);
    if (!scopeContext) return false;

    switch (scopeContext.scopeType) {
      case 'tenant':
        return true;

      case 'business_line':
        if (resourceBusinessLineId) {
          return scopeFilter.businessLineIds?.includes(resourceBusinessLineId) || false;
        }
        return true;

      case 'branch':
        if (resourceBranchId) {
          return scopeFilter.branchIds?.includes(resourceBranchId) || false;
        }
        if (resourceBusinessLineId) {
          return scopeFilter.businessLineIds?.includes(resourceBusinessLineId) || false;
        }
        return true;

      case 'mixed':
        if (resourceBranchId) {
          return scopeFilter.branchIds?.includes(resourceBranchId) || false;
        }
        return true;
    }

    return false;
  }

  /**
   * Get all branches accessible by user (CACHED)
   */
  static async getAccessibleBranches(userId: string): Promise<string[]> {
    const tenantId = await this.resolveTenantId(userId);
    if (!tenantId) {
      return [];
    }

    const cacheKey = CACHE_KEYS.userBranches(tenantId, userId);
    
    return cacheService.getStale(
      cacheKey,
      async () => {
        const scopeFilter = await this.getScopeFilter(userId);
        if (!scopeFilter) return [];

        if (!scopeFilter.branchIds) {
          const allBranches = await db.query.branches.findMany({
            where: eq(branches.tenantId, scopeFilter.tenantId),
          });
          return allBranches.map(b => b.id);
        }

        return scopeFilter.branchIds;
      },
      {
        ttl: SCOPE_CACHE_TTL,
        staleWhileRevalidate: true,
        staleTime: SCOPE_STALE_TIME,
        tags: [CACHE_TAGS.SCOPES, CACHE_TAGS.HIERARCHY],
        priority: 'high',
        tenantScoped: true,
        explicitTenantId: tenantId,
      }
    );
  }

  /**
   * Get all business lines accessible by user (CACHED)
   */
  static async getAccessibleBusinessLines(userId: string): Promise<string[]> {
    const tenantId = await this.resolveTenantId(userId);
    if (!tenantId) {
      return [];
    }

    const cacheKey = CACHE_KEYS.userBusinessLines(tenantId, userId);
    
    return cacheService.getStale(
      cacheKey,
      async () => {
        const scopeFilter = await this.getScopeFilter(userId);
        if (!scopeFilter) return [];

        if (!scopeFilter.businessLineIds) {
          const allLines = await db.query.businessLines.findMany({
            where: eq(businessLines.tenantId, scopeFilter.tenantId),
          });
          return allLines.map(bl => bl.id);
        }

        return scopeFilter.businessLineIds;
      },
      {
        ttl: SCOPE_CACHE_TTL,
        staleWhileRevalidate: true,
        staleTime: SCOPE_STALE_TIME,
        tags: [CACHE_TAGS.SCOPES, CACHE_TAGS.HIERARCHY],
        priority: 'high',
        tenantScoped: true,
        explicitTenantId: tenantId,
      }
    );
  }

  /**
   * Build Drizzle query filter based on user scope
   */
  static buildScopeCondition(
    scopeFilter: ScopeFilter,
    options: {
      tenantIdColumn: any;
      businessLineIdColumn?: any;
      branchIdColumn?: any;
    }
  ) {
    const conditions: any[] = [eq(options.tenantIdColumn, scopeFilter.tenantId)];

    if (scopeFilter.branchIds && options.branchIdColumn) {
      conditions.push(inArray(options.branchIdColumn, scopeFilter.branchIds));
    }

    if (scopeFilter.businessLineIds && options.businessLineIdColumn && !scopeFilter.branchIds) {
      conditions.push(inArray(options.businessLineIdColumn, scopeFilter.businessLineIds));
    }

    return and(...conditions);
  }

  /**
   * Log scope evaluation for audit
   */
  static async logScopeEvaluation(
    userId: string,
    action: string,
    resource: string,
    allowed: boolean
  ): Promise<void> {
    const traceId = RequestContext.getTraceId();
    contextLogger.info('Scope evaluation', {
      traceId,
      userId,
      action,
      resource,
      allowed,
    });
  }
}

export default ScopeService;
