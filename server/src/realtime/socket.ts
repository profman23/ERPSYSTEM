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
    // Transport: prefer WebSocket, fallback to polling
    transports: ['websocket', 'polling'],

    // Payload limits: prevent large message attacks (100KB max)
    maxHttpBufferSize: 1e5,

    // Keepalive: detect dead connections faster
    pingInterval: 25000,
    pingTimeout: 20000,

    // Connection upgrade timeout
    upgradeTimeout: 10000,

    // Limit per-message overhead
    httpCompression: true,

    cors: {
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (origin.endsWith('.replit.dev')) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn(`Socket.IO CORS rejected origin: ${origin}`);
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

  // Clean up socket.data on disconnect to prevent memory leaks
  io.on('connection', (socket) => {
    socket.on('disconnect', () => {
      socket.data = {};
    });
  });

  // Heap memory monitoring - shed connections under pressure
  const HEAP_CHECK_INTERVAL = 60000; // Check every 60s
  const HEAP_WARN_THRESHOLD = 0.75;   // 75% heap used
  const HEAP_SHED_THRESHOLD = 0.90;   // 90% heap used

  setInterval(() => {
    const mem = process.memoryUsage();
    const heapUsedRatio = mem.heapUsed / mem.heapTotal;

    if (heapUsedRatio > HEAP_SHED_THRESHOLD) {
      const sockets = io.sockets.sockets;
      const count = sockets.size;
      if (count === 0) return; // No connections to shed
      const toShed = Math.ceil(count * 0.1); // Shed 10% of connections
      logger.error(
        `Heap at ${(heapUsedRatio * 100).toFixed(1)}% - shedding ${toShed}/${count} connections`
      );

      let shed = 0;
      for (const [, socket] of sockets) {
        if (shed >= toShed) break;
        socket.disconnect(true);
        shed++;
      }
    } else if (heapUsedRatio > HEAP_WARN_THRESHOLD) {
      logger.warn(
        `Heap at ${(heapUsedRatio * 100).toFixed(1)}% ` +
        `(${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB) - ` +
        `${io.sockets.sockets.size} active connections`
      );
    }
  }, HEAP_CHECK_INTERVAL);

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
