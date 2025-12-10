/**
 * Platform Core Layer - Write Safety Types
 * Phase 7: Distributed Transaction Safety
 */

export interface IdempotencyRecord {
  key: string;
  status: 'pending' | 'completed' | 'failed';
  response?: unknown;
  statusCode?: number;
  error?: string;
  createdAt: number;
  completedAt?: number;
  tenantId?: string;
  userId?: string;
  requestHash?: string;
}

export interface DistributedLock {
  key: string;
  owner: string;
  acquiredAt: number;
  expiresAt: number;
  renewCount: number;
}

export interface IdempotencyOptions {
  ttl?: number;
  keyGenerator?: (req: any) => string;
  responseSerializer?: (result: any) => unknown;
  skipMethods?: string[];
}

export interface LockOptions {
  ttl?: number;
  retryCount?: number;
  retryDelay?: number;
  extendable?: boolean;
}

export interface LockResult {
  acquired: boolean;
  lock?: DistributedLock;
  existingOwner?: string;
}

export const DEFAULT_IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;
export const DEFAULT_LOCK_TTL = 30 * 1000;
export const DEFAULT_LOCK_RETRY_COUNT = 3;
export const DEFAULT_LOCK_RETRY_DELAY = 100;

export const LOCK_KEY_PATTERNS = {
  userCreate: (tenantId: string, email: string) => 
    `lock:tenant:${tenantId}:user:create:${email}`,
  userUpdate: (userId: string) => 
    `lock:user:update:${userId}`,
  permissionAssign: (userId: string, permissionId: string) => 
    `lock:permission:assign:${userId}:${permissionId}`,
  roleUpdate: (roleId: string) => 
    `lock:role:update:${roleId}`,
  branchUpdate: (branchId: string) => 
    `lock:branch:update:${branchId}`,
  tenantConfig: (tenantId: string, configKey: string) => 
    `lock:tenant:${tenantId}:config:${configKey}`,
  bulkOperation: (tenantId: string, operationType: string) => 
    `lock:tenant:${tenantId}:bulk:${operationType}`,
  agiTask: (taskId: string) => 
    `lock:agi:task:${taskId}`,
};
