/**
 * DPF Action Routes - /api/tenant/dpf/actions
 * All routes protected by authMiddleware + tenantLoader
 * Permission enforcement via requirePermission middleware
 *
 * Migrated to BaseController pattern — no separate controller file needed.
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { DPFActionService } from '../../services/DPFActionService';
import {
  listQuerySchema,
  createActionSchema,
  updateActionSchema,
} from '../../validations/dpfActionValidation';
import { requirePermission } from '../../rbac/permissionMiddleware';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  requirePermission('dpf.actions.view'),
  BaseController.handle(async ({ tenantId, query }) => {
    const params = listQuerySchema.parse(query);
    return DPFActionService.list(tenantId, params);
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  requirePermission('dpf.actions.view'),
  BaseController.handle(async ({ tenantId, params }) => {
    return DPFActionService.getById(tenantId, params.id);
  }),
);

// ─── CREATE ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  requirePermission('dpf.actions.create'),
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return DPFActionService.create(tenantId, validated);
    },
    { bodySchema: createActionSchema, statusCode: 201 },
  ),
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.patch(
  '/:id',
  requirePermission('dpf.actions.update'),
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return DPFActionService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateActionSchema },
  ),
);

// ─── DELETE (soft) ───────────────────────────────────────────────────────────
router.delete(
  '/:id',
  requirePermission('dpf.actions.delete'),
  BaseController.handle(async ({ tenantId, params }) => {
    await DPFActionService.delete(tenantId, params.id);
    return null;
  }),
);

export default router;
