import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { handleConnection } from './handlers/connectionHandler';
import { getRedisClient } from '../services/redisClient';
import logger from '../config/logger';

let io: SocketIOServer;

export const initializeSocket = async (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const mainRedis = getRedisClient();
  
  if (mainRedis) {
    try {
      const pubClient = mainRedis.duplicate();
      const subClient = mainRedis.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);

      io.adapter(createAdapter(pubClient, subClient));
      logger.info('✅ Socket.IO Redis adapter enabled (horizontal scaling ready)');
    } catch (error) {
      logger.warn('⚠️ Socket.IO Redis adapter failed - using default adapter:', error);
    }
  }

  io.on('connection', handleConnection);

  logger.info('✅ Socket.IO initialized');

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export const getTenantNamespace = (tenantId: string) => {
  return io.of(`/tenant/${tenantId}`);
};
