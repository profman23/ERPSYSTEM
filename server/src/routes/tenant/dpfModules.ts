/**
 * DPF Module Routes - /api/tenant/dpf/modules
 * All routes protected by authMiddleware + tenantLoader
 * Permission enforcement via requirePermission middleware
 *
 * Migrated to BaseController.handle() pattern (no separate controller file).
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { DPFModuleService } from '../../services/DPFModuleService';
import {
  listQuerySchema,
  createModuleSchema,
  updateModuleSchema,
} from '../../validations/dpfModuleValidation';
import { requirePermission } from '../../rbac/permissionMiddleware';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  requirePermission('dpf.modules.view'),
  BaseController.handle(async ({ tenantId, query }) => {
    const params = listQuerySchema.parse(query);
    const result = await DPFModuleService.list(tenantId, params);
    return { data: result.data, pagination: result.pagination };
  }),
);

// ─── MODULE TREE ─────────────────────────────────────────────────────────────
// GET /tree — single JOIN, cached. Used by ScreenAuthorizationGrid.
// Supports ?scope=system|tenant override for system panel editing tenant roles.
router.get(
  '/tree',
  requirePermission('dpf.modules.view'),
  BaseController.handle(async ({ tenantId, query, isSystem }) => {
    // Allow explicit scope override via query param
    const scopeOverride = query.scope as string | undefined;
    const useSystemScope = scopeOverride
      ? scopeOverride === 'system'
      : isSystem;
    return DPFModuleService.getModuleTree(tenantId, useSystemScope);
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  requirePermission('dpf.modules.view'),
  BaseController.handle(async ({ tenantId, params }) => {
    return DPFModuleService.getById(tenantId, params.id);
  }),
);

// ─── GET WITH STATS ──────────────────────────────────────────────────────────
router.get(
  '/:id/stats',
  requirePermission('dpf.modules.view'),
  BaseController.handle(async ({ tenantId, params }) => {
    return DPFModuleService.getWithStats(tenantId, params.id);
  }),
);

// ─── CREATE ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  requirePermission('dpf.modules.create'),
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return DPFModuleService.create(tenantId, validated);
    },
    { bodySchema: createModuleSchema, statusCode: 201 },
  ),
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.patch(
  '/:id',
  requirePermission('dpf.modules.update'),
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return DPFModuleService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateModuleSchema },
  ),
);

// ─── DELETE (soft) ───────────────────────────────────────────────────────────
router.delete(
  '/:id',
  requirePermission('dpf.modules.delete'),
  BaseController.handle(async ({ tenantId, params }) => {
    await DPFModuleService.delete(tenantId, params.id);
    return { message: 'Module deactivated successfully' };
  }),
);

export default router;
