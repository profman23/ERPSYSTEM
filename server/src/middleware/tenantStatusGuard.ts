/**
 * Tenant Status Guard Middleware
 *
 * Rejects requests from suspended/inactive tenants.
 * System users bypass this check (they manage tenants).
 *
 * Must be placed AFTER authMiddleware + tenantLoader in the middleware chain.
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { tenants } from '../db/schemas';
import { eq } from 'drizzle-orm';
import { TenantSuspendedError } from '../core/errors';
import logger from '../config/logger';

// Cache tenant status for 60 seconds to avoid DB query on every request
const statusCache = new Map<string, { status: string; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export async function tenantStatusGuard(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;

    // System users bypass tenant status check
    if (!user || user.accessScope === 'system') {
      return next();
    }

    const tenantId = user.tenantId;
    if (!tenantId) {
      return next();
    }

    // Check cache first
    const cached = statusCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      if (cached.status !== 'active') {
        throw new TenantSuspendedError(tenantId);
      }
      return next();
    }

    // Query DB
    const result = await db
      .select({ status: tenants.status })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const status = result[0]?.status || 'active';

    // Update cache
    statusCache.set(tenantId, {
      status,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    if (status !== 'active') {
      logger.warn(`Blocked request from suspended tenant: ${tenantId}`);
      throw new TenantSuspendedError(tenantId);
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Invalidate cached tenant status (call when tenant status changes)
 */
export function invalidateTenantStatusCache(tenantId: string): void {
  statusCache.delete(tenantId);
}
