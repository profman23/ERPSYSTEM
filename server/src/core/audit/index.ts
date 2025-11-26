/**
 * Platform Core Layer - Audit Module
 */

export { auditService } from './auditService';
export { Audited, createAuditMiddleware, audit, auditCritical } from './auditDecorator';
export type {
  AuditAction,
  AuditSeverity,
  AuditEntry,
  AuditLogInput,
  AuditQueryOptions,
  AuditStats,
} from './types';
