import Redis from 'ioredis';

let redisClient: Redis | null = null;

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number) => {
    if (times > 3) {
      return null;
    }
    const delay = Math.min(times * 100, 1000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  reconnectOnError: () => false,
};

export const initializeRedis = async (): Promise<Redis> => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(REDIS_CONFIG);

  let connectionAttempted = false;

  redisClient.on('connect', () => {
    console.log('✅ Redis client connected');
  });

  redisClient.on('ready', () => {
    console.log('✅ Redis client ready');
  });

  redisClient.on('error', (err) => {
    if (!connectionAttempted) {
      console.error('❌ Redis connection failed:', err.message);
      connectionAttempted = true;
    }
  });

  redisClient.on('close', () => {
    if (!connectionAttempted) {
      console.warn('⚠️ Redis client connection closed');
    }
  });

  redisClient.on('reconnecting', () => {
    if (!connectionAttempted) {
      console.log('🔄 Redis client reconnecting...');
    }
  });

  try {
    await redisClient.connect();
    await redisClient.ping();
    console.log('✅ Redis connection established');
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    console.warn('⚠️ Continuing without Redis - caching disabled');
  }

  return redisClient;
};

export const getRedisClient = (): Redis | null => {
  return redisClient;
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('✅ Redis client closed');
  }
};

export { redisClient };
