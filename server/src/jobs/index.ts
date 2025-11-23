import { startTokenCleanupJob } from './tokenCleanup';
import { startDatabaseMaintenanceJob } from './databaseMaintenance';

export const startAllJobs = () => {
  console.log('🚀 Initializing scheduled jobs...');
  
  startTokenCleanupJob();
  startDatabaseMaintenanceJob();
  
  console.log('✅ All scheduled jobs initialized');
};
