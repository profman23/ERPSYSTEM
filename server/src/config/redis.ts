import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;

export const initializeRedis = async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redisClient = createClient({
    url: redisUrl,
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  console.log('✅ Redis client ready (not connected - placeholder)');

  return redisClient;
};

export const getRedisClient = () => {
  if (!redisClient) {
    console.warn('Redis client not initialized');
  }
  return redisClient;
};
