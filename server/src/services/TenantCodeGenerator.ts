/**
 * TenantCodeGenerator - Lock-Free Unique Tenant Code Generation
 * 
 * Generates unique tenant codes using a combination of:
 * 1. Redis SETNX for uniqueness verification (primary)
 * 2. Database fallback with retry logic
 * 
 * Code Format: VET-[6chars]-[timestamp]
 * Example: VET-A3B9C2-1733865234
 */

import { db } from '../db';
import { tenants } from '../db/schemas';
import { eq } from 'drizzle-orm';
import { contextLogger } from '../core/context/contextLogger';

const CODE_PREFIX = 'VET';
const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_RETRIES = 10;
const REDIS_CODE_TTL = 86400;

let redisClient: any = null;

export class TenantCodeGenerator {
  private static instance: TenantCodeGenerator;

  private constructor() {}

  static getInstance(): TenantCodeGenerator {
    if (!TenantCodeGenerator.instance) {
      TenantCodeGenerator.instance = new TenantCodeGenerator();
    }
    return TenantCodeGenerator.instance;
  }

  async setRedisClient(client: any): Promise<void> {
    redisClient = client;
  }

  private generateRandomChars(length: number): string {
    let result = '';
    const charsetLength = CODE_CHARSET.length;
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charsetLength);
      result += CODE_CHARSET[randomIndex];
    }
    return result;
  }

  private generateTimestampSuffix(): string {
    return Math.floor(Date.now() / 1000).toString(36).toUpperCase();
  }

  private generateCode(): string {
    const randomPart = this.generateRandomChars(CODE_LENGTH);
    const timestamp = this.generateTimestampSuffix();
    return `${CODE_PREFIX}-${randomPart}-${timestamp}`;
  }

  private async checkRedisUniqueness(code: string): Promise<boolean> {
    if (!redisClient) {
      return true;
    }

    try {
      const key = `tenant:code:${code}`;
      const result = await redisClient.set(key, '1', 'NX', 'EX', REDIS_CODE_TTL);
      return result === 'OK';
    } catch (error) {
      contextLogger.warn('Redis uniqueness check failed, falling back to DB', { error });
      return true;
    }
  }

  private async checkDatabaseUniqueness(code: string): Promise<boolean> {
    try {
      const existing = await db.query.tenants.findFirst({
        where: eq(tenants.code, code),
        columns: { id: true },
      });
      return !existing;
    } catch (error) {
      contextLogger.error('Database uniqueness check failed', { error });
      throw error;
    }
  }

  async releaseRedisCode(code: string): Promise<void> {
    if (!redisClient) return;

    try {
      const key = `tenant:code:${code}`;
      await redisClient.del(key);
    } catch (error) {
      contextLogger.warn('Failed to release Redis code reservation', { error, code });
    }
  }

  async generateUniqueCode(): Promise<string> {
    let retries = 0;

    while (retries < MAX_RETRIES) {
      const code = this.generateCode();

      const redisUnique = await this.checkRedisUniqueness(code);
      if (!redisUnique) {
        retries++;
        continue;
      }

      const dbUnique = await this.checkDatabaseUniqueness(code);
      if (!dbUnique) {
        await this.releaseRedisCode(code);
        retries++;
        continue;
      }

      contextLogger.info('Generated unique tenant code', { code, retries });
      return code;
    }

    const fallbackCode = `${CODE_PREFIX}-${this.generateRandomChars(8)}-${Date.now()}`;
    contextLogger.warn('Max retries reached, using fallback code generation', { fallbackCode });
    
    return fallbackCode;
  }

  async preGenerateCodes(count: number): Promise<string[]> {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const code = await this.generateUniqueCode();
        codes.push(code);
      } catch (error) {
        contextLogger.error('Failed to pre-generate code', { error, index: i });
      }
    }

    return codes;
  }

  generateInstantCode(): string {
    return this.generateCode();
  }

  async validateAndReserveCode(code: string): Promise<{ valid: boolean; reason?: string }> {
    const codePattern = /^VET-[A-Z0-9]{6}-[A-Z0-9]+$/;
    if (!codePattern.test(code)) {
      return { valid: false, reason: 'Invalid code format' };
    }

    const redisUnique = await this.checkRedisUniqueness(code);
    if (!redisUnique) {
      return { valid: false, reason: 'Code already reserved' };
    }

    const dbUnique = await this.checkDatabaseUniqueness(code);
    if (!dbUnique) {
      await this.releaseRedisCode(code);
      return { valid: false, reason: 'Code already exists in database' };
    }

    return { valid: true };
  }
}

export const tenantCodeGenerator = TenantCodeGenerator.getInstance();
