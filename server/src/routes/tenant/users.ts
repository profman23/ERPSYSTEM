/**
 * User Routes (BaseController pattern)
 *
 * Endpoints:
 *   GET    /api/v1/tenant/users           -> List (paginated, searchable, with JOINs)
 *   GET    /api/v1/tenant/users/:id       -> Get by ID (with JOINs)
 *   PUT    /api/v1/tenant/users/:id       -> Update
 *   PATCH  /api/v1/tenant/users/:id/status -> Toggle active status
 *   DELETE /api/v1/tenant/users/:id       -> Soft delete
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { UserService } from '../../services/UserService';
import {
  updateUserSchema,
  listUserSchema,
} from '../../validations/userValidation';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listUserSchema.parse(query);
    return UserService.list(tenantId, params);
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return UserService.getById(tenantId, params.id);
  }),
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return UserService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateUserSchema },
  ),
);

// ─── TOGGLE STATUS ──────────────────────────────────────────────────────────
router.patch(
  '/:id/status',
  BaseController.handle(async ({ tenantId, params, body }) => {
    return UserService.toggleStatus(tenantId, params.id, Boolean(body.isActive));
  }),
);

// ─── DELETE (soft) ───────────────────────────────────────────────────────────
router.delete(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params }) => {
      await UserService.remove(tenantId, params.id);
      return null;
    },
    { statusCode: 204 },
  ),
);

export default router;
