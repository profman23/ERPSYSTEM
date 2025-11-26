/**
 * Platform Core Layer - Context-Aware Logger
 * Winston logger with automatic request context injection
 */

import winston from 'winston';
import path from 'path';
import { RequestContext } from './requestContext';
import { ContextLogData } from './types';

const logDir = path.join(process.cwd(), 'logs');

/**
 * Custom format that injects request context into every log
 */
const contextFormat = winston.format((info) => {
  const context = RequestContext.getLogData();
  if (context) {
    info.traceId = context.traceId;
    info.correlationId = context.correlationId;
    info.requestId = context.requestId;
    info.spanId = context.spanId;
    info.tenantId = context.tenantId;
    info.userId = context.userId;
    info.branchId = context.branchId;
    info.clientIp = context.clientIp;
    info.requestPath = context.requestPath;
    info.requestMethod = context.requestMethod;
  }
  return info;
});

/**
 * JSON format for file logging (machine-readable)
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  contextFormat(),
  winston.format.json()
);

/**
 * Console format for development (human-readable)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  contextFormat(),
  winston.format.printf(({ timestamp, level, message, traceId, tenantId, userId, stack, ...meta }) => {
    const contextStr = traceId ? `[${traceId}]` : '';
    const tenantStr = tenantId ? `[T:${String(tenantId).substring(0, 8)}]` : '';
    const userStr = userId ? `[U:${String(userId).substring(0, 8)}]` : '';
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${contextStr}${tenantStr}${userStr}: ${stack || message}${metaStr}`;
  })
);

/**
 * Create the context-aware logger
 */
export const contextLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  defaultMeta: { service: 'veterinary-erp-api', version: '1.0.0' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760,
      maxFiles: 10,
      tailable: true,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760,
      maxFiles: 10,
      tailable: true,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      level: 'info',
      maxsize: 10485760,
      maxFiles: 30,
      tailable: true,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  contextLogger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

/**
 * Helper functions for structured logging
 */
export const logWithContext = {
  info: (message: string, meta?: Record<string, unknown>) => {
    contextLogger.info(message, meta);
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    contextLogger.warn(message, meta);
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    contextLogger.error(message, meta);
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    contextLogger.debug(message, meta);
  },
  audit: (action: string, resource: string, meta?: Record<string, unknown>) => {
    const context = RequestContext.get();
    contextLogger.info(`AUDIT: ${action} on ${resource}`, {
      auditAction: action,
      auditResource: resource,
      tenantId: context?.tenantId,
      userId: context?.userId,
      ...meta,
    });
  },
};

/**
 * Create a child logger with additional default metadata
 */
export function createChildLogger(metadata: Record<string, unknown>): winston.Logger {
  return contextLogger.child(metadata);
}

/**
 * Query logger for Drizzle ORM integration
 */
export const queryLogger = {
  logQuery(query: string, params: unknown[]) {
    const context = RequestContext.getLogData();
    contextLogger.debug('DB Query', {
      query: query.substring(0, 500),
      paramCount: params.length,
      traceId: context?.traceId,
      tenantId: context?.tenantId,
    });
  },
};

export default contextLogger;
