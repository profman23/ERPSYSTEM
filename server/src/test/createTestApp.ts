/**
 * Test App Builder — Creates a minimal Express app for Supertest integration tests.
 *
 * Injects a fake TenantContext via AsyncLocalStorage (bypassing auth middleware)
 * so that BaseController.buildContext() works exactly as in production.
 *
 * Usage:
 *   import { createTestApp } from '@/test/createTestApp';
 *   const app = createTestApp(speciesRouter, { tenantId: 'abc' });
 *   await request(app).get('/').expect(200);
 */

import express, { Router } from 'express';
import { TenantContext } from '../core/tenant/tenantContext';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

interface TestContextOptions {
  tenantId?: string;
  userId?: string;
  accessScope?: string;
  role?: string;
  businessLineId?: string | null;
  branchId?: string | null;
}

const DEFAULTS: Required<Omit<TestContextOptions, 'businessLineId' | 'branchId'>> & {
  businessLineId: string | null;
  branchId: string | null;
} = {
  tenantId: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000010',
  accessScope: 'tenant',
  role: 'admin',
  businessLineId: null,
  branchId: null,
};

/**
 * Build a minimal Express app with:
 *   1. JSON body parser
 *   2. Fake auth middleware (injects TenantContext via AsyncLocalStorage)
 *   3. The provided router mounted at /
 *   4. Global error handler (same as production)
 *
 * Pass `authenticated: false` to skip the auth middleware (tests 401).
 */
export function createTestApp(
  router: Router,
  options: TestContextOptions & { authenticated?: boolean } = {},
) {
  const app = express();
  app.use(express.json());

  const { authenticated = true, ...ctxOpts } = options;

  if (authenticated) {
    // Wrap every request in TenantContext.run() so BaseController picks it up
    app.use((req, _res, next) => {
      const context = {
        tenantId: ctxOpts.tenantId ?? DEFAULTS.tenantId,
        userId: ctxOpts.userId ?? DEFAULTS.userId,
        accessScope: ctxOpts.accessScope ?? DEFAULTS.accessScope,
        role: ctxOpts.role ?? DEFAULTS.role,
        businessLineId: ctxOpts.businessLineId ?? DEFAULTS.businessLineId,
        branchId: ctxOpts.branchId ?? DEFAULTS.branchId,
      };

      TenantContext.run(context, () => {
        next();
      });
    });
  }

  app.use('/', router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
