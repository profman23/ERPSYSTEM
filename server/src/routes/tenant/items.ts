/**
 * Items Routes (Item Master Data)
 *
 * Pattern: follows species.ts route template.
 *
 * Endpoints:
 *   GET    /api/v1/tenant/items              → List (paginated, filtered)
 *   GET    /api/v1/tenant/items/:id          → Get by ID
 *   POST   /api/v1/tenant/items              → Create (auto-generate code)
 *   PUT    /api/v1/tenant/items/:id          → Update (optimistic locking)
 *   DELETE /api/v1/tenant/items/:id          → Soft delete
 *   POST   /api/v1/tenant/items/:id/image   → Upload image
 *   DELETE /api/v1/tenant/items/:id/image   → Remove image
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BaseController } from '../../core/controller';
import { ItemService } from '../../services/ItemService';
import { createUpload } from '../../middleware/uploadMiddleware';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  createItemSchema,
  updateItemSchema,
  listItemsSchema,
} from '../../validations/itemValidation';

const router = Router();
const upload = createUpload('items');

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listItemsSchema.parse(query);
    return ItemService.list(tenantId, params);
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return ItemService.getById(tenantId, params.id);
  }),
);

// ─── CREATE ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return ItemService.create(tenantId, validated);
    },
    { bodySchema: createItemSchema, statusCode: 201 },
  ),
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return ItemService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateItemSchema },
  ),
);

// ─── DELETE (soft) ───────────────────────────────────────────────────────────
router.delete(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params }) => {
      await ItemService.remove(tenantId, params.id);
      return null;
    },
    { statusCode: 204 },
  ),
);

// ─── UPLOAD IMAGE ────────────────────────────────────────────────────────────
router.post(
  '/:id/image',
  upload.single('image'),
  BaseController.handle(async ({ tenantId, params, req }) => {
    const file = req.file;
    if (!file) {
      throw new (await import('../../core/errors')).ValidationError(
        'No image file provided',
        [{ field: 'image', message: 'Image file is required' }],
      );
    }

    const imageUrl = `/uploads/items/${file.filename}`;
    return ItemService.uploadImage(tenantId, params.id, imageUrl);
  }),
);

// ─── REMOVE IMAGE ────────────────────────────────────────────────────────────
router.delete(
  '/:id/image',
  BaseController.handle(async ({ tenantId, params }) => {
    const oldImageUrl = await ItemService.removeImage(tenantId, params.id);

    // Delete file from disk
    if (oldImageUrl) {
      const filePath = path.resolve(__dirname, '../../../public', oldImageUrl.replace(/^\//, ''));
      fs.unlink(filePath, () => {
        // Ignore errors — file may already be deleted
      });
    }

    return { message: 'Image removed' };
  }),
);

export default router;
