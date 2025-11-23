import { Socket } from 'socket.io';
import logger from '../../config/logger';

/**
 * Event Type Registry
 * Defines required scope validation for each event type
 */
const EVENT_SCHEMAS: Record<
  string,
  {
    requiresTenant: boolean;
    requiresBusinessLine: boolean;
    requiresBranch: boolean;
  }
> = {
  'tenant:event': { requiresTenant: true, requiresBusinessLine: false, requiresBranch: false },
  'business-line:event': {
    requiresTenant: true,
    requiresBusinessLine: true,
    requiresBranch: false,
  },
  'branch:event': { requiresTenant: true, requiresBusinessLine: true, requiresBranch: true },
  'user:notification': { requiresTenant: false, requiresBusinessLine: false, requiresBranch: false },
  // Add more event types here as needed
};

/**
 * Socket.IO Event Authorization Middleware (Packet Middleware)
 * Uses socket.use() to ACTUALLY block unauthorized events before handlers execute
 * This is the ONLY way to prevent cross-tenant event leakage
 */
export const socketEventAuthMiddleware = (socket: Socket) => {
  /**
   * socket.use() is packet middleware - it can call next(err) to BLOCK events
   * Unlike onAny, this actually prevents handlers from executing
   */
  socket.use((packet, next) => {
    const user = socket.data.user;

    if (!user) {
      logger.error(`❌ Packet from unauthorized socket ${socket.id}`);
      return next(new Error('Unauthorized. Please authenticate first.'));
    }

    // Packet format: [eventName, ...args]
    const eventName = packet[0];
    const eventData = packet[1]; // First argument is event data

    // Allow internal/system events
    if (
      typeof eventName !== 'string' ||
      eventName.startsWith('ack:') ||
      eventName === 'disconnect' ||
      eventName === 'error' ||
      eventName === 'authenticated'
    ) {
      return next(); // Pass through
    }

    // Get event schema (if registered)
    const schema = EVENT_SCHEMAS[eventName];

    if (!schema) {
      // Unregistered events are BLOCKED by default for security
      logger.warn(
        `⚠️ Unregistered event BLOCKED: ${eventName} from ${socket.id}. Add to EVENT_SCHEMAS to allow.`
      );
      return next(
        new Error('Event type not allowed. Please register this event type first.')
      );
    }

    // CRITICAL: Validate required scope fields based on event schema
    if (schema.requiresTenant) {
      // Tenant field is MANDATORY for tenant-scoped events - must be non-empty string
      if (
        !eventData?.tenantId ||
        typeof eventData.tenantId !== 'string' ||
        eventData.tenantId.trim() === ''
      ) {
        logger.warn(
          `⚠️ BLOCKED: Tenant-scoped event missing or invalid tenantId: ${eventName} from ${socket.id}`
        );
        return next(new Error('This event requires a valid non-empty tenantId.'));
      }

      // Non-system users can ONLY emit to their own tenant
      if (user.accessScope !== 'system' && eventData.tenantId !== user.tenantId) {
        logger.warn(
          `⚠️ BLOCKED: Cross-tenant event: ${socket.id} (tenant=${user.tenantId}) tried to emit ${eventName} to tenant ${eventData.tenantId}`
        );
        return next(
          new Error('You do not have permission to emit events to other tenants.')
        );
      }

      // System users MUST provide a valid target tenant (cannot be their own null or empty)
      if (user.accessScope === 'system') {
        if (
          !eventData.tenantId ||
          typeof eventData.tenantId !== 'string' ||
          eventData.tenantId.trim() === ''
        ) {
          logger.warn(
            `⚠️ BLOCKED: System user ${user.userId} emitting ${eventName} with invalid target tenantId: "${eventData.tenantId}"`
          );
          return next(
            new Error('System users must specify a valid non-empty target tenantId.')
          );
        }
        logger.debug(
          `✅ System user ${user.userId} emitting ${eventName} to tenant ${eventData.tenantId}`
        );
      }
    }

    // Validate business line scope (if required)
    if (schema.requiresBusinessLine) {
      if (
        !eventData?.businessLineId ||
        typeof eventData.businessLineId !== 'string' ||
        eventData.businessLineId.trim() === ''
      ) {
        logger.warn(
          `⚠️ BLOCKED: Business-line-scoped event missing or invalid businessLineId: ${eventName} from ${socket.id}`
        );
        return next(new Error('This event requires a valid non-empty businessLineId.'));
      }

      // Business line users can only emit to their own business line
      if (
        user.accessScope === 'business_line' &&
        eventData.businessLineId !== user.businessLineId
      ) {
        logger.warn(
          `⚠️ BLOCKED: Cross-business-line event: ${socket.id} tried to emit ${eventName} to business line ${eventData.businessLineId}`
        );
        return next(
          new Error('You do not have permission to emit events to other business lines.')
        );
      }
    }

    // Validate branch scope (if required)
    if (schema.requiresBranch) {
      if (
        !eventData?.branchId ||
        typeof eventData.branchId !== 'string' ||
        eventData.branchId.trim() === ''
      ) {
        logger.warn(
          `⚠️ BLOCKED: Branch-scoped event missing or invalid branchId: ${eventName} from ${socket.id}`
        );
        return next(new Error('This event requires a valid non-empty branchId.'));
      }

      // Branch users can only emit to their own branch
      if (user.accessScope === 'branch' && eventData.branchId !== user.branchId) {
        logger.warn(
          `⚠️ BLOCKED: Cross-branch event: ${socket.id} tried to emit ${eventName} to branch ${eventData.branchId}`
        );
        return next(new Error('You do not have permission to emit events to other branches.'));
      }
    }

    // Event is valid - allow it to reach handlers
    logger.debug(
      `📨 Valid event ${eventName} from ${socket.id} (user=${user.userId}, scope=${user.accessScope})`
    );
    next();
  });
};

/**
 * Helper: Get target room for tenant-scoped broadcast
 * NEVER trusts client data - uses authenticated context and validated payload
 * Payload is guaranteed to be validated by middleware before this is called
 */
export const getTenantRoom = (eventData: { tenantId: string }): string => {
  return `tenant:${eventData.tenantId}`;
};

/**
 * Helper: Get target room for business line broadcast
 */
export const getBusinessLineRoom = (eventData: { businessLineId: string }): string => {
  return `business-line:${eventData.businessLineId}`;
};

/**
 * Helper: Get target room for branch broadcast
 */
export const getBranchRoom = (eventData: { branchId: string }): string => {
  return `branch:${eventData.branchId}`;
};

/**
 * Helper: Get user-specific room
 */
export const getUserRoom = (userId: string): string => {
  return `user:${userId}`;
};
