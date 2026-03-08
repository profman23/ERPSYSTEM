import Redis from 'ioredis';
import logger from '../config/logger';

let redisClient: Redis | null = null;
let redisAvailable = false;

export const initializeRedis = async (): Promise<Redis | null> => {
  if (redisClient && redisAvailable) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn('⚠️ No REDIS_URL configured - running without Redis (L1 cache only)');
    return null;
  }

  logger.info('🔌 Connecting to Redis...');
  const usesTls = redisUrl.startsWith('rediss://');

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    connectTimeout: 10000,
    commandTimeout: 5000,
    retryStrategy: (times: number) => {
      if (times > 5) {
        logger.error('❌ Redis max retries exceeded - giving up reconnection');
        return null;
      }
      const delay = Math.min(times * 200, 2000);
      logger.info(`🔄 Redis reconnecting in ${delay}ms (attempt ${times}/5)...`);
      return delay;
    },
    tls: usesTls ? { rejectUnauthorized: false } : undefined,
  });

  redisClient.on('connect', () => {
    logger.info('✅ Redis client connected');
  });

  redisClient.on('ready', () => {
    redisAvailable = true;
    logger.info('✅ Redis client ready - L2 cache enabled');
  });

  redisClient.on('error', (err) => {
    if (redisAvailable) {
      logger.error('❌ Redis error (was connected):', err.message);
    }
    redisAvailable = false;
  });

  redisClient.on('close', () => {
    redisAvailable = false;
    logger.warn('⚠️ Redis connection closed');
  });

  redisClient.on('reconnecting', () => {
    logger.info('🔄 Redis reconnecting...');
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout (10s)'));
      }, 10000);

      if (redisClient!.status === 'ready') {
        clearTimeout(timeout);
        redisAvailable = true;
        resolve();
      } else {
        redisClient!.once('ready', () => {
          clearTimeout(timeout);
          redisAvailable = true;
          resolve();
        });
        redisClient!.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      }
    });

    await redisClient.ping();
    logger.info('✅ Redis connection established - PING successful');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Failed to connect to Redis: ${msg}`);
    logger.warn('⚠️ Continuing without Redis - L1 cache only, rate limiting degraded');
    redisAvailable = false;
  }

  return redisClient;
};

export const getRedisClient = (): Redis | null => {
  if (!redisClient || !redisAvailable) return null;
  return redisClient;
};

export const isRedisAvailable = (): boolean => redisAvailable;

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    redisAvailable = false;
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    }
    redisClient = null;
    logger.info('✅ Redis client closed');
  }
};

export { redisClient };
