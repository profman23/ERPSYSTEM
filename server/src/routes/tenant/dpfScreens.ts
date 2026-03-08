/**
 * DPF Screen Routes - /api/tenant/dpf/screens
 * All routes protected by authMiddleware + tenantLoader
 * Permission enforcement via requirePermission middleware
 *
 * Migrated to BaseController pattern — no separate controller file needed.
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { DPFScreenService } from '../../services/DPFScreenService';
import {
  listQuerySchema,
  createScreenSchema,
  updateScreenSchema,
} from '../../validations/dpfScreenValidation';
import { requirePermission } from '../../rbac/permissionMiddleware';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  requirePermission('dpf.screens.view'),
  BaseController.handle(async ({ tenantId, query }) => {
    const params = listQuerySchema.parse(query);
    return DPFScreenService.list(tenantId, params);
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  requirePermission('dpf.screens.view'),
  BaseController.handle(async ({ tenantId, params }) => {
    return DPFScreenService.getById(tenantId, params.id);
  }),
);

// ─── GET WITH STATS ──────────────────────────────────────────────────────────
router.get(
  '/:id/stats',
  requirePermission('dpf.screens.view'),
  BaseController.handle(async ({ tenantId, params }) => {
    return DPFScreenService.getWithStats(tenantId, params.id);
  }),
);

// ─── CREATE ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  requirePermission('dpf.screens.create'),
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return DPFScreenService.create(tenantId, validated);
    },
    { bodySchema: createScreenSchema, statusCode: 201 },
  ),
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.patch(
  '/:id',
  requirePermission('dpf.screens.update'),
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return DPFScreenService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateScreenSchema },
  ),
);

// ─── DELETE (soft) ───────────────────────────────────────────────────────────
router.delete(
  '/:id',
  requirePermission('dpf.screens.delete'),
  BaseController.handle(async ({ tenantId, params }) => {
    await DPFScreenService.delete(tenantId, params.id);
    return null;
  }),
);

export default router;
