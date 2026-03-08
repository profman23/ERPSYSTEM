/**
 * DPF User Custom Permissions Routes
 * Routes for managing user-specific permission overrides (GRANT/DENY)
 *
 * Migrated to BaseController.handle() pattern.
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { DPFUserCustomPermissionService } from '../../services/DPFUserCustomPermissionService';
import {
  listCustomPermissionsQuerySchema,
  grantPermissionSchema,
  denyPermissionSchema,
  bulkGrantPermissionsSchema,
  updateCustomPermissionSchema,
} from '../../validations/dpfUserCustomPermissionValidation';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
// GET /api/v1/tenant/dpf/custom-permissions?userId=xxx&permissionType=GRANT&page=1&limit=20
router.get(
  '/',
  BaseController.handle(async ({ tenantId, query }) => {
    const params = listCustomPermissionsQuerySchema.parse(query);
    return DPFUserCustomPermissionService.list(tenantId, params);
  }),
);

// ─── GRANT PERMISSION ────────────────────────────────────────────────────────
// POST /api/v1/tenant/dpf/custom-permissions/grant
router.post(
  '/grant',
  BaseController.handle(
    async ({ tenantId, userId, validated }) => {
      return DPFUserCustomPermissionService.grantPermission(tenantId, userId, validated);
    },
    { bodySchema: grantPermissionSchema, statusCode: 201 },
  ),
);

// ─── DENY PERMISSION ─────────────────────────────────────────────────────────
// POST /api/v1/tenant/dpf/custom-permissions/deny
router.post(
  '/deny',
  BaseController.handle(
    async ({ tenantId, userId, validated }) => {
      return DPFUserCustomPermissionService.denyPermission(tenantId, userId, validated);
    },
    { bodySchema: denyPermissionSchema, statusCode: 201 },
  ),
);

// ─── BULK GRANT ──────────────────────────────────────────────────────────────
// POST /api/v1/tenant/dpf/custom-permissions/bulk-grant
router.post(
  '/bulk-grant',
  BaseController.handle(
    async ({ tenantId, userId, validated }) => {
      return DPFUserCustomPermissionService.bulkGrantPermissions(tenantId, userId, validated);
    },
    { bodySchema: bulkGrantPermissionsSchema, statusCode: 201 },
  ),
);

// ─── GET USER CUSTOM PERMISSIONS ─────────────────────────────────────────────
// GET /api/v1/tenant/dpf/custom-permissions/user/:userId
router.get(
  '/user/:userId',
  BaseController.handle(async ({ tenantId, params }) => {
    return DPFUserCustomPermissionService.getUserCustomPermissions(tenantId, params.userId);
  }),
);

// ─── GET USER EFFECTIVE PERMISSIONS ──────────────────────────────────────────
// GET /api/v1/tenant/dpf/custom-permissions/user/:userId/effective
router.get(
  '/user/:userId/effective',
  BaseController.handle(async ({ tenantId, params }) => {
    return DPFUserCustomPermissionService.getUserEffectivePermissions(tenantId, params.userId);
  }),
);

// ─── UPDATE CUSTOM PERMISSION ────────────────────────────────────────────────
// PATCH /api/v1/tenant/dpf/custom-permissions/:id
router.patch(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return DPFUserCustomPermissionService.updateCustomPermission(tenantId, params.id, validated);
    },
    { bodySchema: updateCustomPermissionSchema },
  ),
);

// ─── REVOKE CUSTOM PERMISSION ────────────────────────────────────────────────
// DELETE /api/v1/tenant/dpf/custom-permissions/:id
router.delete(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return DPFUserCustomPermissionService.revokeCustomPermission(tenantId, params.id);
  }),
);

export default router;
