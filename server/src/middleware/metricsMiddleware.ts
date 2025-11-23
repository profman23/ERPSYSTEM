import promBundle from 'express-prom-bundle';
import { RequestHandler } from 'express';

export const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { project: 'veterinary-erp-saas' },
  promClient: {
    collectDefaultMetrics: {},
  },
}) as unknown as RequestHandler;
