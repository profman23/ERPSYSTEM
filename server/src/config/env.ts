/**
 * Environment Validation
 *
 * Validates ALL required environment variables at startup using Zod.
 * Fails fast with clear error messages if any required var is missing.
 *
 * Usage: import { env } from '@/config/env';
 * NEVER access process.env directly after this module is loaded.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(5500),
  SERVER_PORT: z.coerce.number().optional(),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DB_POOL_MIN: z.coerce.number().min(1).optional(),
  DB_POOL_MAX: z.coerce.number().min(1).optional(),

  // JWT — uses SESSION_SECRET as fallback for backward compatibility
  SESSION_SECRET: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),

  // Redis (optional — app works without it using L1 cache)
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().optional(),
  CLIENT_URL: z.string().default('http://localhost:5501'),

  // AI (optional)
  CLAUDE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Replit (optional — auto-detected)
  REPL_SLUG: z.string().optional(),
  REPL_OWNER: z.string().optional(),
}).transform((data) => ({
  ...data,
  // Resolve JWT_SECRET: explicit > SESSION_SECRET > dev fallback
  JWT_SECRET: data.JWT_SECRET || data.SESSION_SECRET || (
    data.NODE_ENV === 'development'
      ? 'dev-jwt-secret-change-in-production'
      : undefined
  ),
})).refine(
  (data) => data.JWT_SECRET && data.JWT_SECRET.length >= 16,
  { message: 'JWT_SECRET (or SESSION_SECRET) must be at least 16 characters. Set JWT_SECRET in .env', path: ['JWT_SECRET'] },
);

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error('\n❌ Environment validation failed:\n' + errors + '\n');
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
