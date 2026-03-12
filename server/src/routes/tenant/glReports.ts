/**
 * GL Report Routes
 *
 * Endpoints:
 *   GET /api/v1/tenant/gl-reports/trial-balance   → Trial Balance (fiscal year, period range, branch)
 *   GET /api/v1/tenant/gl-reports/account-ledger   → Account Ledger (account, date range, paginated)
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { GLReportService } from '../../services/GLReportService';
import {
  trialBalanceSchema,
  accountLedgerSchema,
  accountBalanceParamsSchema,
} from '../../validations/glReportValidation';

const router = Router();

// ─── TRIAL BALANCE ──────────────────────────────────────────────────────────
router.get(
  '/trial-balance',
  BaseController.handle(async ({ tenantId, query }) => {
    const params = trialBalanceSchema.parse(query);
    return GLReportService.trialBalance(tenantId, params);
  }),
);

// ─── ACCOUNT BALANCE (single account) ────────────────────────────────────────
router.get(
  '/account-balance/:accountId',
  BaseController.handle(async ({ tenantId, params, query }) => {
    const { accountId } = params;
    const { fiscalYear } = accountBalanceParamsSchema.parse(query);
    return GLReportService.getAccountBalance(tenantId, accountId, fiscalYear);
  }),
);

// ─── ACCOUNT LEDGER ─────────────────────────────────────────────────────────
router.get(
  '/account-ledger',
  BaseController.handle(async ({ tenantId, query }) => {
    const params = accountLedgerSchema.parse(query);
    return GLReportService.accountLedger(tenantId, params);
  }),
);

export default router;
