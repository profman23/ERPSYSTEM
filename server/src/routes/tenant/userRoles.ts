/**
 * User Role Assignment Routes - /api/tenant/users/:id/role
 * All routes protected by authMiddleware + tenantLoader
 * Permission enforcement via requirePermission middleware
 *
 * Migrated to BaseController.handle() pattern.
 */

import { Router } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/controller';
import { UserRoleService } from '../../services/userRoleService';
import { requirePermission } from '../../rbac/permissionMiddleware';

const router = Router({ mergeParams: true });

const assignRoleSchema = z.object({
  roleId: z.string().uuid(),
  expiresAt: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
});

// ─── ASSIGN ROLE TO USER ─────────────────────────────────────────────────────
router.post(
  '/',
  requirePermission('users.assign_role'),
  BaseController.handle(
    async ({ tenantId, userId, params, validated }) => {
      return UserRoleService.assignRoleToUser(tenantId, userId, {
        userId: params.id,
        roleId: validated.roleId,
        expiresAt: validated.expiresAt,
      });
    },
    { bodySchema: assignRoleSchema },
  ),
);

// ─── REMOVE ROLE FROM USER ───────────────────────────────────────────────────
router.delete(
  '/',
  requirePermission('users.assign_role'),
  BaseController.handle(async ({ tenantId, params }) => {
    return UserRoleService.removeRoleFromUser(tenantId, params.id);
  }),
);

// ─── GET USER'S CURRENT ROLE ─────────────────────────────────────────────────
router.get(
  '/',
  requirePermission('users.view'),
  BaseController.handle(async ({ tenantId, params }) => {
    return UserRoleService.getUserRole(tenantId, params.id);
  }),
);

export default router;
