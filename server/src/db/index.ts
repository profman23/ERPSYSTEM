import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schemas';
import logger from '../config/logger';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set!');
}

// Parse connection string to check if SSL is required
const url = new URL(connectionString);
const sslMode = url.searchParams.get('sslmode');

// Dynamic pool sizing based on environment
// Production: 100 connections to handle 50K+ concurrent users via PgBouncer/Neon
const env = process.env.NODE_ENV || 'development';
const poolConfig = {
  development: { min: 2, max: 10 },
  staging: { min: 5, max: 50 },
  production: { min: 10, max: 100 },
}[env] || { min: 2, max: 10 };

const maxPoolSize = parseInt(process.env.DB_POOL_MAX || String(poolConfig.max));
const minPoolSize = parseInt(process.env.DB_POOL_MIN || String(poolConfig.min));

const pool = new Pool({
  connectionString,
  max: maxPoolSize,
  min: minPoolSize,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,       // Fail fast (10s) instead of 30s
  allowExitOnIdle: false,
  ssl: sslMode === 'require' ? {
    rejectUnauthorized: false
  } : false,
});

// Pool error handling - prevent unhandled errors from crashing the process
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message });
});

// Pool statistics helper for monitoring
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    maxSize: maxPoolSize,
    utilizationPercent: Math.round((pool.totalCount / maxPoolSize) * 100),
  };
}

// Pool health monitoring — warns when pool is under pressure, errors at >80%
let lastWarningTime = 0;
setInterval(() => {
  const stats = getPoolStats();
  const now = Date.now();

  // Log error when pool utilization exceeds 80%
  if (stats.utilizationPercent > 80 && now - lastWarningTime > 30000) {
    lastWarningTime = now;
    logger.error('DB pool high utilization', {
      utilization: `${stats.utilizationPercent}%`,
      total: stats.totalCount,
      max: stats.maxSize,
      idle: stats.idleCount,
      waiting: stats.waitingCount,
    });
  } else if (stats.waitingCount > 5 && now - lastWarningTime > 30000) {
    lastWarningTime = now;
    logger.warn('DB pool backlog detected', {
      waiting: stats.waitingCount,
      total: stats.totalCount,
      max: stats.maxSize,
      idle: stats.idleCount,
    });
  }
}, 10000);

logger.info(`Database pool configured: min=${minPoolSize}, max=${maxPoolSize}, timeout=10s (${env})`);

export const db = drizzle(pool, { schema });
export { pool };
