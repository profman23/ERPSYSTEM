import { Socket } from 'socket.io';
import { AuthService } from '../../services/AuthService';
import logger from '../../config/logger';

/**
 * Socket.IO Authentication Middleware
 * Validates JWT token from handshake and attaches user context
 */
export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    // Get token from handshake auth or query
    const token =
      socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token || typeof token !== 'string') {
      logger.warn(
        `❌ Socket.IO auth failed: No token provided for ${socket.id}`
      );
      return next(
        new Error('Authentication required. Please provide a valid token.')
      );
    }

    // Verify JWT token
    const decoded = AuthService.verifyToken(token);

    // Attach user context to socket
    socket.data.user = {
      userId: decoded.userId,
      role: decoded.role,
      accessScope: decoded.accessScope,
      tenantId: decoded.tenantId,
      businessLineId: decoded.businessLineId,
      branchId: decoded.branchId,
    };

    logger.info(
      `✅ Socket.IO authenticated: user=${decoded.userId}, tenant=${decoded.tenantId}, scope=${decoded.accessScope}`
    );

    next();
  } catch (error: any) {
    logger.warn(`❌ Socket.IO auth failed for ${socket.id}: ${error.message}`);

    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired. Please login again.'));
    }

    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token. Please login again.'));
    }

    return next(new Error('Authentication failed.'));
  }
};
