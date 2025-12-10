/**
 * Platform Core Layer - Idempotency Middleware
 * Phase 7: Request Deduplication & Distributed Transaction Safety
 * 
 * Features:
 * - Idempotency key support via X-Idempotency-Key header
 * - Automatic request fingerprinting
 * - Response caching for duplicate requests
 * - Multi-tenant isolation
 * - AGI-safe concurrent write protection
 */

import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../../services/redisClient';
import { contextLogger, RequestContext } from '../context';
import { createHash } from 'crypto';
import {
  IdempotencyRecord,
  IdempotencyOptions,
  DEFAULT_IDEMPOTENCY_TTL,
} from './types';

const IDEMPOTENCY_PREFIX = 'idempotency:';

export function createIdempotencyMiddleware(options: IdempotencyOptions = {}) {
  const {
    ttl = DEFAULT_IDEMPOTENCY_TTL,
    skipMethods = ['GET', 'HEAD', 'OPTIONS'],
    keyGenerator = defaultKeyGenerator,
    responseSerializer = defaultResponseSerializer,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (skipMethods.includes(req.method)) {
      return next();
    }

    const idempotencyKey = req.headers['x-idempotency-key'] as string;
    if (!idempotencyKey) {
      return next();
    }

    const redis = getRedisClient();
    if (!redis) {
      return next();
    }

    const tenantId = RequestContext.getTenantId();
    const userId = RequestContext.getUserId();
    const fullKey = `${IDEMPOTENCY_PREFIX}${tenantId || 'global'}:${idempotencyKey}`;
    const requestHash = generateRequestHash(req);

    try {
      const existingRecord = await redis.get(fullKey);

      if (existingRecord) {
        const record: IdempotencyRecord = JSON.parse(existingRecord);

        if (record.requestHash && record.requestHash !== requestHash) {
          contextLogger.warn('Idempotency key reused with different request', {
            key: idempotencyKey,
            tenantId,
          });
          return res.status(422).json({
            error: 'Idempotency key reused with different request parameters',
            code: 'IDEMPOTENCY_KEY_CONFLICT',
          });
        }

        if (record.status === 'pending') {
          contextLogger.debug('Request in progress, returning 409', { key: idempotencyKey });
          return res.status(409).json({
            error: 'Request with this idempotency key is still being processed',
            code: 'IDEMPOTENCY_REQUEST_IN_PROGRESS',
          });
        }

        if (record.status === 'completed' && record.response) {
          contextLogger.debug('Returning cached idempotent response', { key: idempotencyKey });
          res.setHeader('X-Idempotency-Replayed', 'true');
          const statusCode = record.statusCode || 200;
          return res.status(statusCode).json(record.response);
        }

        if (record.status === 'failed') {
          contextLogger.debug('Previous request failed, allowing retry', { key: idempotencyKey });
        }
      }

      const pendingRecord: IdempotencyRecord = {
        key: idempotencyKey,
        status: 'pending',
        createdAt: Date.now(),
        tenantId: tenantId || undefined,
        userId: userId || undefined,
        requestHash,
      };

      await redis.set(fullKey, JSON.stringify(pendingRecord), 'PX', ttl);

      const originalJson = res.json.bind(res);
      res.json = function(body: any) {
        const statusCode = res.statusCode;
        
        setImmediate(async () => {
          try {
            if (statusCode >= 200 && statusCode < 300) {
              const completedRecord: IdempotencyRecord = {
                ...pendingRecord,
                status: 'completed',
                response: responseSerializer(body),
                statusCode,
                completedAt: Date.now(),
              };
              await redis.set(fullKey, JSON.stringify(completedRecord), 'PX', ttl);
              
              contextLogger.debug('Idempotent response cached', { 
                key: idempotencyKey, 
                statusCode,
              });
            } else {
              const failedRecord: IdempotencyRecord = {
                ...pendingRecord,
                status: 'failed',
                error: body?.error || 'Request failed',
                completedAt: Date.now(),
              };
              await redis.set(fullKey, JSON.stringify(failedRecord), 'PX', Math.min(ttl, 60 * 1000));
            }
          } catch (error) {
            contextLogger.error('Failed to update idempotency record', { error, key: idempotencyKey });
          }
        });

        return originalJson(body);
      };

      next();
    } catch (error) {
      contextLogger.error('Idempotency middleware error', { error, key: idempotencyKey });
      next();
    }
  };
}

function defaultKeyGenerator(req: Request): string {
  const tenantId = RequestContext.getTenantId();
  const userId = RequestContext.getUserId();
  return `${tenantId}:${userId}:${req.method}:${req.path}`;
}

function defaultResponseSerializer(result: any): unknown {
  if (result === undefined || result === null) {
    return null;
  }
  
  try {
    return JSON.parse(JSON.stringify(result));
  } catch {
    return { serialized: false };
  }
}

function generateRequestHash(req: Request): string {
  const content = JSON.stringify({
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
  });
  
  return createHash('sha256').update(content).digest('hex').substring(0, 32);
}

export function idempotencyMiddleware(options?: IdempotencyOptions) {
  return createIdempotencyMiddleware(options);
}

export default idempotencyMiddleware;
