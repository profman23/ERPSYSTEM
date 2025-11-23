import { Socket } from 'socket.io';
import logger from '../../config/logger';
import {
  socketEventAuthMiddleware,
  getTenantRoom,
} from '../middleware/socketEventAuth';

/**
 * Socket.IO Connection Handler
 * Handles authenticated connections and enforces tenant isolation
 */
export const handleConnection = (socket: Socket) => {
  // User context is guaranteed to exist due to socketAuthMiddleware
  const user = socket.data.user;

  if (!user) {
    logger.error(`❌ Socket connected without user context: ${socket.id}`);
    socket.disconnect(true);
    return;
  }

  logger.info(
    `🔌 Client connected: ${socket.id} | User: ${user.userId} | Tenant: ${user.tenantId} | Scope: ${user.accessScope}`
  );

  // Auto-join tenant-specific room for isolation
  if (user.tenantId) {
    const tenantRoom = `tenant:${user.tenantId}`;
    socket.join(tenantRoom);
    logger.info(`✅ Socket ${socket.id} joined tenant room: ${tenantRoom}`);
  }

  // Auto-join business line room if applicable
  if (user.businessLineId) {
    const businessLineRoom = `business-line:${user.businessLineId}`;
    socket.join(businessLineRoom);
    logger.info(
      `✅ Socket ${socket.id} joined business line room: ${businessLineRoom}`
    );
  }

  // Auto-join branch room if applicable
  if (user.branchId) {
    const branchRoom = `branch:${user.branchId}`;
    socket.join(branchRoom);
    logger.info(`✅ Socket ${socket.id} joined branch room: ${branchRoom}`);
  }

  // Auto-join user-specific room for private notifications
  const userRoom = `user:${user.userId}`;
  socket.join(userRoom);
  logger.info(`✅ Socket ${socket.id} joined user room: ${userRoom}`);

  // Apply event-level authorization middleware
  socketEventAuthMiddleware(socket);

  // Send connection confirmation with user context
  socket.emit('authenticated', {
    userId: user.userId,
    tenantId: user.tenantId,
    accessScope: user.accessScope,
    rooms: Array.from(socket.rooms),
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    logger.info(
      `🔌 Client disconnected: ${socket.id} | User: ${user.userId} | Reason: ${reason}`
    );
  });

  // Prevent clients from manually joining rooms (security)
  socket.on('join', (room: string) => {
    logger.warn(
      `⚠️ Blocked manual room join attempt: ${socket.id} tried to join ${room}`
    );
    socket.emit('error', {
      message: 'Manual room joining is not allowed. Rooms are auto-assigned.',
    });
  });

  // Prevent clients from leaving auto-assigned rooms
  socket.on('leave', (room: string) => {
    logger.warn(
      `⚠️ Blocked manual room leave attempt: ${socket.id} tried to leave ${room}`
    );
    socket.emit('error', {
      message: 'You cannot leave auto-assigned rooms.',
    });
  });

  // Example: Handle tenant-scoped events
  socket.on('tenant:event', (data) => {
    // Event-level auth middleware already validated:
    // - User is authenticated
    // - data.tenantId exists and is authorized for this user
    // - System users provided valid target tenant
    
    // Get target room (data is already validated by middleware)
    const targetRoom = getTenantRoom(data);

    logger.info(
      `📨 Tenant event from ${socket.id} to room ${targetRoom}: ${JSON.stringify(data)}`
    );
    socket.to(targetRoom).emit('tenant:event', data);
  });
};
