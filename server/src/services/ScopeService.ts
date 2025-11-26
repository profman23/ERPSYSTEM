/**
 * RBAC Scope Service
 * Implements multi-level access scoping for the multi-tenant hierarchy
 * Scope Levels: tenant > business_line > branch > mixed
 */

import { db } from '../db';
import { eq, and, inArray } from 'drizzle-orm';
import { users, branches, businessLines, tenants } from '../db/schemas';
import { RequestContext } from '../core/context';
import { contextLogger } from '../core/context';

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

export class ScopeService {
  /**
   * Resolve user's effective scope context
   * Returns the scope boundaries for data access
   */
  static async resolveUserScope(userId: string): Promise<ScopeContext | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.tenantId) {
      return null;
    }

    const scopeContext: ScopeContext = {
      scopeType: (user.scope as ScopeType) || 'branch',
      tenantId: user.tenantId,
      businessLineId: user.businessLineId,
      branchId: user.branchId,
      allowedBranchIds: (user.allowedBranchIds as string[]) || [],
    };

    return scopeContext;
  }

  /**
   * Get scope filter for database queries
   * This determines which records the user can access
   */
  static async getScopeFilter(userId: string): Promise<ScopeFilter | null> {
    const scopeContext = await this.resolveUserScope(userId);
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
          filter.businessLineIds = [...new Set(allowedBranches.map(b => b.businessLineId))];
        }
        break;
    }

    return filter;
  }

  /**
   * Check if user can access a specific resource
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
   * Get all branches accessible by user
   */
  static async getAccessibleBranches(userId: string): Promise<string[]> {
    const scopeFilter = await this.getScopeFilter(userId);
    if (!scopeFilter) return [];

    if (!scopeFilter.branchIds) {
      const allBranches = await db.query.branches.findMany({
        where: eq(branches.tenantId, scopeFilter.tenantId),
      });
      return allBranches.map(b => b.id);
    }

    return scopeFilter.branchIds;
  }

  /**
   * Get all business lines accessible by user
   */
  static async getAccessibleBusinessLines(userId: string): Promise<string[]> {
    const scopeFilter = await this.getScopeFilter(userId);
    if (!scopeFilter) return [];

    if (!scopeFilter.businessLineIds) {
      const allLines = await db.query.businessLines.findMany({
        where: eq(businessLines.tenantId, scopeFilter.tenantId),
      });
      return allLines.map(bl => bl.id);
    }

    return scopeFilter.businessLineIds;
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
