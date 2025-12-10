/**
 * Platform Core Layer - Request Deduplication Middleware
 * Phase 7: Concurrent Duplicate Request Prevention
 * 
 * Prevents duplicate concurrent requests with the same fingerprint
 * from being processed simultaneously. Unlike idempotency (which replays
 * cached responses), deduplication blocks concurrent duplicates and
 * makes them wait for the original request to complete.
 */

import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../../services/redisClient';
import { contextLogger, RequestContext } from '../context';
import { createHash } from 'crypto';

const DEDUP_PREFIX = 'dedup:';
const DEFAULT_DEDUP_WINDOW = 5000;
const DEFAULT_WAIT_TIMEOUT = 10000;
const POLL_INTERVAL = 100;

interface DeduplicationOptions {
  windowMs?: number;
  waitTimeoutMs?: number;
  skipMethods?: string[];
  fingerprintGenerator?: (req: Request) => string;
}

interface DeduplicationRecord {
  fingerprint: string;
  status: 'processing' | 'completed';
  response?: unknown;
  statusCode?: number;
  startedAt: number;
  completedAt?: number;
}

export function createDeduplicationMiddleware(options: DeduplicationOptions = {}) {
  const {
    windowMs = DEFAULT_DEDUP_WINDOW,
    waitTimeoutMs = DEFAULT_WAIT_TIMEOUT,
    skipMethods = ['GET', 'HEAD', 'OPTIONS'],
    fingerprintGenerator = defaultFingerprintGenerator,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (skipMethods.includes(req.method)) {
      return next();
    }

    const redis = getRedisClient();
    if (!redis) {
      return next();
    }

    const fingerprint = fingerprintGenerator(req);
    const dedupKey = `${DEDUP_PREFIX}${fingerprint}`;

    try {
      const existingRecord = await redis.get(dedupKey);

      if (existingRecord) {
        const record: DeduplicationRecord = JSON.parse(existingRecord);

        if (record.status === 'processing') {
          contextLogger.debug('Duplicate request detected, waiting for original', { fingerprint });

          const result = await waitForCompletion(redis, dedupKey, waitTimeoutMs);
          
          if (result) {
            contextLogger.debug('Returning deduplicated response', { fingerprint });
            res.setHeader('X-Deduplicated', 'true');
            return res.status(result.statusCode || 200).json(result.response);
          }

          contextLogger.warn('Wait timeout for duplicate request', { fingerprint });
        }

        if (record.status === 'completed' && record.response) {
          const age = Date.now() - (record.completedAt || record.startedAt);
          if (age < windowMs) {
            contextLogger.debug('Returning recently completed response', { fingerprint, age });
            res.setHeader('X-Deduplicated', 'true');
            return res.status(record.statusCode || 200).json(record.response);
          }
        }
      }

      const processingRecord: DeduplicationRecord = {
        fingerprint,
        status: 'processing',
        startedAt: Date.now(),
      };

      const setResult = await redis.set(
        dedupKey, 
        JSON.stringify(processingRecord), 
        'PX', 
        waitTimeoutMs + windowMs,
        'NX'
      );

      if (setResult !== 'OK') {
        return next();
      }

      const originalJson = res.json.bind(res);
      let responseHandled = false;

      res.json = function(body: any) {
        const statusCode = res.statusCode;
        responseHandled = true;

        setImmediate(async () => {
          try {
            const completedRecord: DeduplicationRecord = {
              fingerprint,
              status: 'completed',
              response: body,
              statusCode,
              startedAt: processingRecord.startedAt,
              completedAt: Date.now(),
            };
            await redis.set(dedupKey, JSON.stringify(completedRecord), 'PX', windowMs);
          } catch (error) {
            contextLogger.error('Failed to update deduplication record', { error, fingerprint });
          }
        });

        return originalJson(body);
      };

      res.on('close', async () => {
        if (!responseHandled) {
          try {
            await redis.del(dedupKey);
            contextLogger.debug('Cleared dedup record on early close', { fingerprint });
          } catch (error) {
            contextLogger.error('Failed to clear dedup record on close', { error, fingerprint });
          }
        }
      });

      next();
    } catch (error) {
      contextLogger.error('Deduplication middleware error', { error, fingerprint });
      next();
    }
  };
}

function defaultFingerprintGenerator(req: Request): string {
  const tenantId = RequestContext.getTenantId() || 'global';
  const userId = RequestContext.getUserId() || 'anonymous';
  
  const content = JSON.stringify({
    tenantId,
    userId,
    method: req.method,
    path: req.path,
    body: req.body,
  });
  
  return createHash('sha256').update(content).digest('hex').substring(0, 32);
}

async function waitForCompletion(
  redis: any,
  key: string,
  timeoutMs: number
): Promise<DeduplicationRecord | null> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const record = await redis.get(key);
    
    if (record) {
      const parsed: DeduplicationRecord = JSON.parse(record);
      if (parsed.status === 'completed') {
        return parsed;
      }
    } else {
      return null;
    }
    
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
  
  return null;
}

export function deduplicationMiddleware(options?: DeduplicationOptions) {
  return createDeduplicationMiddleware(options);
}

export default deduplicationMiddleware;
