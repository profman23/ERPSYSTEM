/**
 * Item Groups Routes
 *
 * Endpoints:
 *   GET    /api/v1/tenant/item-groups           -> List (paginated, searchable, filterable)
 *   GET    /api/v1/tenant/item-groups/:id       -> Get by ID
 *   POST   /api/v1/tenant/item-groups           -> Create
 *   PUT    /api/v1/tenant/item-groups/:id       -> Update
 *   DELETE /api/v1/tenant/item-groups/:id       -> Soft delete
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { ItemGroupService } from '../../services/ItemGroupService';
import {
  createItemGroupSchema,
  updateItemGroupSchema,
  listItemGroupSchema,
} from '../../validations/itemGroupValidation';

const router = Router();

// --- LIST ----------------------------------------------------------------
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listItemGroupSchema.parse(query);
    return ItemGroupService.list(tenantId, params);
  }),
);

// --- GET BY ID -----------------------------------------------------------
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return ItemGroupService.getById(tenantId, params.id);
  }),
);

// --- CREATE --------------------------------------------------------------
router.post(
  '/',
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return ItemGroupService.create(tenantId, validated);
    },
    { bodySchema: createItemGroupSchema, statusCode: 201 },
  ),
);

// --- UPDATE --------------------------------------------------------------
router.put(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return ItemGroupService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateItemGroupSchema },
  ),
);

// --- DELETE (soft) -------------------------------------------------------
router.delete(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params }) => {
      await ItemGroupService.remove(tenantId, params.id);
      return null;
    },
    { statusCode: 204 },
  ),
);

export default router;
