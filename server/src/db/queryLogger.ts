/**
 * Slow Query Logger
 * Phase 8: Performance Foundation
 * 
 * Wraps database queries to log slow queries for performance monitoring.
 */

import { contextLogger } from '../core/context/contextLogger';
import { metricsCollector } from '../core/metrics/metricsCollector';

const SLOW_QUERY_THRESHOLD_MS = 100;

export interface QueryLogContext {
  tenantId?: string;
  userId?: string;
  traceId?: string;
}

/**
 * Wraps a database query function to log execution time.
 * Logs a warning if the query exceeds the slow query threshold.
 * 
 * @param name - A descriptive name for the query
 * @param fn - The async function that performs the query
 * @param context - Optional context information for logging
 * @returns The result of the query function
 */
export async function loggedQuery<T>(
  name: string,
  fn: () => Promise<T>,
  context?: QueryLogContext
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    metricsCollector.recordQuery(name, duration, context);
    
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      contextLogger.warn('Slow query detected', {
        query: name,
        duration_ms: duration,
        threshold_ms: SLOW_QUERY_THRESHOLD_MS,
        ...context,
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    metricsCollector.recordQuery(name, duration, context);
    
    contextLogger.error('Query error', {
      query: name,
      duration_ms: duration,
      error: error instanceof Error ? error.message : String(error),
      ...context,
    });
    
    throw error;
  }
}

/**
 * Decorator-style wrapper for class methods that perform queries.
 * 
 * @param queryName - Name of the query for logging
 */
export function LogQuery(queryName: string) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return loggedQuery(queryName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

export { SLOW_QUERY_THRESHOLD_MS };
