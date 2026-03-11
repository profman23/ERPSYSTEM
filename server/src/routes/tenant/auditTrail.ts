/**
 * Audit Trail Routes — Resource-Level History
 *
 * Exposes the existing AuditService.getResourceTrail() via REST API.
 * Enriches audit entries with user info (name, email) via batch lookup.
 *
 * Endpoints:
 *   GET /api/v1/tenant/audit-trail/:resourceType/:resourceId → Resource history
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { auditService } from '../../core/audit/auditService';
import { db } from '../../db';
import { users } from '../../db/schemas';
import { inArray } from 'drizzle-orm';

const router = Router();

// ─── GET RESOURCE TRAIL ──────────────────────────────────────────────────────
router.get(
  '/:resourceType/:resourceId',
  BaseController.handle(async ({ params }) => {
    const { resourceType, resourceId } = params;

    const trail = await auditService.getResourceTrail(resourceType, resourceId, 50);

    // Batch user lookup — single query for all unique userIds
    const userIds = [...new Set(
      trail.map((e) => e.userId).filter((id): id is string => !!id),
    )];

    const userMap = new Map<string, { id: string; name: string | null; email: string }>();
    if (userIds.length > 0) {
      const usersResult = await db
        .select({ id: users.id, name: users.name, firstName: users.firstName, lastName: users.lastName, email: users.email })
        .from(users)
        .where(inArray(users.id, userIds));
      usersResult.forEach((u) => {
        const displayName = u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || null;
        userMap.set(u.id, { id: u.id, name: displayName, email: u.email });
      });
    }

    // Enrich trail with user info
    return trail.map((entry) => ({
      id: entry.id,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      userId: entry.userId,
      userName: entry.userId ? userMap.get(entry.userId)?.name ?? null : null,
      userEmail: entry.userId ? userMap.get(entry.userId)?.email ?? null : null,
      diff: entry.diff,
      createdAt: entry.createdAt,
    }));
  }),
);

export default router;
