/**
 * Platform Core Layer - Audit Types
 */

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'permission_granted'
  | 'permission_revoked'
  | 'role_assigned'
  | 'role_revoked'
  | 'password_changed'
  | 'password_reset'
  | 'token_refreshed'
  | 'token_revoked'
  | 'export'
  | 'import'
  | 'bulk_operation'
  | 'config_changed'
  | 'custom';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditEntry {
  id?: string;
  tenantId: string | null;
  userId: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  diff: Record<string, { old: unknown; new: unknown }> | null;
  severity: AuditSeverity;
  clientIp: string | null;
  userAgent: string | null;
  traceId: string | null;
  correlationId: string | null;
  requestPath: string | null;
  requestMethod: string | null;
  statusCode: number | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface AuditLogInput {
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  severity?: AuditSeverity;
  statusCode?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditQueryOptions {
  tenantId?: string;
  userId?: string;
  action?: AuditAction | AuditAction[];
  resourceType?: string;
  resourceId?: string;
  severity?: AuditSeverity | AuditSeverity[];
  startDate?: Date;
  endDate?: Date;
  traceId?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalEntries: number;
  byAction: Record<AuditAction, number>;
  bySeverity: Record<AuditSeverity, number>;
  byResourceType: Record<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
}
