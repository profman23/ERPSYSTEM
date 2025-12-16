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

  const redisUrl = process.env.REDIS_URL;
  const config = getRedisConfig();
  
  // If REDIS_URL is provided, use it directly
  if (redisUrl) {
    console.log('🔌 Connecting to Redis via REDIS_URL (Upstash)...');
    const usesTls = redisUrl.startsWith('rediss://');
    
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false, // Connect immediately
      tls: usesTls ? { rejectUnauthorized: false } : undefined,
    });
  } else {
    console.log('🔌 Connecting to Redis via HOST/PORT...');
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
    // Wait for ready state with timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout (5s)'));
      }, 5000);

      if (redisClient!.status === 'ready') {
        clearTimeout(timeout);
        resolve();
      } else {
        redisClient!.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });
        redisClient!.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      }
    });

    await redisClient.ping();
    console.log('✅ Redis connection established successfully');
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
