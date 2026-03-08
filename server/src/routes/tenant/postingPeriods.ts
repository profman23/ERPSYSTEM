/**
 * Posting Periods Routes
 *
 * Follows taxCodes.ts route pattern.
 *
 * Endpoints:
 *   GET    /api/v1/tenant/posting-periods              → List fiscal years (paginated)
 *   GET    /api/v1/tenant/posting-periods/:id          → Get fiscal year by ID
 *   POST   /api/v1/tenant/posting-periods              → Create fiscal year (+ 12 sub-periods)
 *   GET    /api/v1/tenant/posting-periods/:id/sub-periods → List sub-periods
 *   PUT    /api/v1/tenant/posting-periods/sub-periods/:subId → Update sub-period
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { PostingPeriodService } from '../../services/PostingPeriodService';
import {
  createPostingPeriodSchema,
  updateSubPeriodSchema,
  listPostingPeriodSchema,
  listSubPeriodsSchema,
} from '../../validations/postingPeriodValidation';

const router = Router();

// ─── LIST fiscal years ──────────────────────────────────────────────────────
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listPostingPeriodSchema.parse(query);
    return PostingPeriodService.list(tenantId, params);
  }),
);

// ─── GET fiscal year by ID ──────────────────────────────────────────────────
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return PostingPeriodService.getById(tenantId, params.id);
  }),
);

// ─── CREATE fiscal year (+ 12 sub-periods) ──────────────────────────────────
router.post(
  '/',
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return PostingPeriodService.create(tenantId, validated);
    },
    { bodySchema: createPostingPeriodSchema, statusCode: 201 },
  ),
);

// ─── LIST sub-periods for a fiscal year ─────────────────────────────────────
router.get(
  '/:id/sub-periods',
  BaseController.handlePaginated(async ({ tenantId, params, query }) => {
    const listParams = listSubPeriodsSchema.parse(query);
    return PostingPeriodService.getSubPeriods(tenantId, params.id, listParams);
  }),
);

// ─── UPDATE sub-period (status / enable-disable) ────────────────────────────
router.put(
  '/sub-periods/:subId',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return PostingPeriodService.updateSubPeriod(tenantId, params.subId, validated);
    },
    { bodySchema: updateSubPeriodSchema },
  ),
);

export default router;
