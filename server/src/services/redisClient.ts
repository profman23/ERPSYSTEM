import Redis from 'ioredis';

let redisClient: Redis | null = null;

const getRedisConfig = () => {
  // Prefer REDIS_URL for single connection string (Upstash, etc.)
  if (process.env.REDIS_URL) {
    return {
      connectionString: process.env.REDIS_URL,
      retryStrategy: (times: number) => {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 100, 1000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      reconnectOnError: () => false,
    };
  }

  // Fallback to individual environment variables
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times: number) => {
      if (times > 3) {
        return null;
      }
      return Math.min(times * 100, 1000);
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    reconnectOnError: () => false,
  };
};

export const initializeRedis = async (): Promise<Redis> => {
  if (redisClient) {
    return redisClient;
  }

  const config = getRedisConfig();
  
  // If REDIS_URL is provided, use it directly
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, {
      retryStrategy: config.retryStrategy,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      enableReadyCheck: config.enableReadyCheck,
      lazyConnect: config.lazyConnect,
      tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
    });
  } else {
    redisClient = new Redis(config as any);
  }

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
