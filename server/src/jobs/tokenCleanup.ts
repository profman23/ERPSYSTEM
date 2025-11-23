import cron from 'node-cron';
import { db } from '../db';
import { authTokens } from '../db/schemas';
import { lt, sql } from 'drizzle-orm';
import logger from '../config/logger';

export const startTokenCleanupJob = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('🧹 Starting expired token cleanup job...');

      const now = new Date();
      
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(authTokens)
        .where(lt(authTokens.expiresAt, now));

      await db
        .delete(authTokens)
        .where(lt(authTokens.expiresAt, now));

      logger.info(`✅ Token cleanup completed. Deleted ${count} expired tokens.`);
    } catch (error) {
      logger.error('❌ Token cleanup job failed:', error);
    }
  });

  logger.info('✅ Token cleanup job scheduled (daily at 2 AM)');
};
