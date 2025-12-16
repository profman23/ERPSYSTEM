import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { handleConnection } from './handlers/connectionHandler';
import { socketAuthMiddleware } from './middleware/socketAuth';
import { getRedisClient } from '../services/redisClient';
import { allowedOrigins } from '../middleware/securityMiddleware';
import logger from '../config/logger';

let io: SocketIOServer;

export const initializeSocket = async (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin
        if (!origin) {
          callback(null, true);
          return;
        }
        
        // Allow all .replit.dev domains for Replit environment
        if (origin.endsWith('.replit.dev')) {
          callback(null, true);
          return;
        }
        
        // Allow configured origins
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn(`❌ Socket.IO CORS rejected origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Apply authentication middleware to ALL connections
  io.use(socketAuthMiddleware);

  const mainRedis = getRedisClient();
  
  if (mainRedis && mainRedis.status === 'ready') {
    try {
      const pubClient = mainRedis.duplicate();
      const subClient = mainRedis.duplicate();

      pubClient.on('error', (err) => logger.warn('Redis pub client error:', err.message));
      subClient.on('error', (err) => logger.warn('Redis sub client error:', err.message));

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          if (pubClient.status === 'ready') {
            resolve();
          } else {
            pubClient.once('ready', () => resolve());
            pubClient.once('error', (err) => reject(err));
          }
        }),
        new Promise<void>((resolve, reject) => {
          if (subClient.status === 'ready') {
            resolve();
          } else {
            subClient.once('ready', () => resolve());
            subClient.once('error', (err) => reject(err));
          }
        }),
      ]);

      io.adapter(createAdapter(pubClient, subClient));
      logger.info('✅ Socket.IO Redis adapter enabled (horizontal scaling ready)');
    } catch (error) {
      logger.warn('⚠️ Socket.IO Redis adapter failed - using default adapter');
    }
  } else {
    logger.info('ℹ️ Socket.IO using default in-memory adapter (Redis unavailable)');
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
