/**
 * Platform Core Layer - Write Safety Module
 * Phase 7: Distributed Transaction Safety
 */

export { lockService } from './lockService';
export { idempotencyMiddleware, createIdempotencyMiddleware } from './idempotencyMiddleware';
export { deduplicationMiddleware, createDeduplicationMiddleware } from './deduplicationMiddleware';
export type {
  IdempotencyRecord,
  DistributedLock,
  IdempotencyOptions,
  LockOptions,
  LockResult,
} from './types';
export {
  DEFAULT_IDEMPOTENCY_TTL,
  DEFAULT_LOCK_TTL,
  DEFAULT_LOCK_RETRY_COUNT,
  DEFAULT_LOCK_RETRY_DELAY,
  LOCK_KEY_PATTERNS,
} from './types';
