/**
 * Platform Core Layer - Event Bus Types
 * Interface for future event-driven architecture
 */

export type EventPriority = 'low' | 'normal' | 'high' | 'critical';
export type EventStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

export interface DomainEvent<T = unknown> {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  tenantId: string | null;
  userId: string | null;
  payload: T;
  metadata: EventMetadata;
  timestamp: Date;
  version: number;
}

export interface EventMetadata {
  traceId: string | null;
  correlationId: string | null;
  causationId: string | null;
  source: string;
  priority: EventPriority;
}

export interface EventHandler<T = unknown> {
  eventType: string;
  handle: (event: DomainEvent<T>) => Promise<void>;
  priority?: EventPriority;
  retries?: number;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  active: boolean;
}

export const EVENT_TYPES = {
  TENANT_CREATED: 'tenant.created',
  TENANT_UPDATED: 'tenant.updated',
  TENANT_DELETED: 'tenant.deleted',

  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',

  ROLE_ASSIGNED: 'role.assigned',
  ROLE_REVOKED: 'role.revoked',
  PERMISSION_GRANTED: 'permission.granted',
  PERMISSION_REVOKED: 'permission.revoked',

  PATIENT_CREATED: 'patient.created',
  PATIENT_UPDATED: 'patient.updated',
  PATIENT_DELETED: 'patient.deleted',

  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_UPDATED: 'appointment.updated',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_COMPLETED: 'appointment.completed',
  APPOINTMENT_REMINDER: 'appointment.reminder',

  INVENTORY_LOW: 'inventory.low',
  INVENTORY_RESTOCKED: 'inventory.restocked',

  BILLING_INVOICE_CREATED: 'billing.invoice.created',
  BILLING_PAYMENT_RECEIVED: 'billing.payment.received',
  BILLING_PAYMENT_FAILED: 'billing.payment.failed',

  LAB_RESULT_RECEIVED: 'lab.result.received',

  QUOTA_WARNING: 'quota.warning',
  QUOTA_EXCEEDED: 'quota.exceeded',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];
