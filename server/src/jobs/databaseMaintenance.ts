import cron from 'node-cron';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export const startDatabaseMaintenanceJob = () => {
  cron.schedule('0 3 * * 0', async () => {
    try {
      console.log('🔧 Starting weekly database maintenance job...');

      await db.execute(sql`ANALYZE`);

      console.log('✅ Database ANALYZE completed successfully');
    } catch (error) {
      console.error('❌ Database maintenance job failed:', error);
    }
  });

  console.log('✅ Database maintenance job scheduled (weekly on Sunday at 3 AM)');
};
