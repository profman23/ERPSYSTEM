import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schemas';

const connectionString = process.env.DATABASE_URL!;

/**
 * Connection Pool Configuration for 3000+ Tenants
 * Optimized for Neon PostgreSQL serverless
 */
const client = postgres(connectionString, {
  max: 100,                    // Maximum connections in pool
  idle_timeout: 30,            // Close idle connections after 30s
  connect_timeout: 5,          // Timeout if no connection available in 5s
  max_lifetime: 60 * 30,       // Max connection lifetime: 30 minutes
  prepare: false,              // Disable prepared statements for serverless
  ssl: 'require',              // Require SSL for Neon
  onnotice: () => {},          // Suppress notices
});

console.log('✅ Database pool configured: max=100, idle_timeout=30s');

export const db = drizzle(client, { schema });
