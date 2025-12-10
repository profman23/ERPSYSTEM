/**
 * Platform Core Layer - Query Logger & Instrumentation
 * Phase 7: Slow Query Detection
 * 
 * Wraps database queries with timing instrumentation
 * and automatic slow query detection.
 */

import { metricsCollector } from './metricsCollector';
import { contextLogger, RequestContext } from '../context';
import { SLOW_QUERY_THRESHOLD_MS } from './types';

export interface QueryContext {
  tenantId?: string;
  userId?: string;
  traceId?: string;
}

export async function instrumentQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  context?: QueryContext
): Promise<T> {
  const startTime = performance.now();
  const traceId = context?.traceId || RequestContext.getTraceId();
  const tenantId = context?.tenantId || RequestContext.getTenantId();
  const userId = context?.userId || RequestContext.getUserId();

  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;

    metricsCollector.recordQuery(queryName, duration, {
      tenantId: tenantId || undefined,
      userId: userId || undefined,
      traceId: traceId || undefined,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    metricsCollector.recordQuery(`${queryName}:error`, duration, {
      tenantId: tenantId || undefined,
      userId: userId || undefined,
      traceId: traceId || undefined,
    });

    contextLogger.error('Query failed', {
      query: queryName,
      duration,
      error,
      tenantId,
      userId,
      traceId,
    });

    throw error;
  }
}

export function createQueryWrapper<TArgs extends any[], TResult>(
  queryName: string,
  queryFn: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    return instrumentQuery(queryName, () => queryFn(...args));
  };
}

export class QueryTimer {
  private startTime: number;
  private queryName: string;
  private context?: QueryContext;

  constructor(queryName: string, context?: QueryContext) {
    this.queryName = queryName;
    this.context = context;
    this.startTime = performance.now();
  }

  end(success: boolean = true): number {
    const duration = performance.now() - this.startTime;
    const name = success ? this.queryName : `${this.queryName}:error`;

    metricsCollector.recordQuery(name, duration, {
      tenantId: this.context?.tenantId || RequestContext.getTenantId() || undefined,
      userId: this.context?.userId || RequestContext.getUserId() || undefined,
      traceId: this.context?.traceId || RequestContext.getTraceId() || undefined,
    });

    return duration;
  }
}

export default instrumentQuery;
