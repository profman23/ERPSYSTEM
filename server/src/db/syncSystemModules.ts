/**
 * Sync SYSTEM modules to database (SAP B1 Style)
 * Run: npx tsx src/db/syncSystemModules.ts
 */

import { db } from './index';
import { tenants } from './schemas';
import { eq } from 'drizzle-orm';
import { seedDPFStructure, validateDPFStructure } from './seed/seedDPFStructure';
import { getSystemModuleStatistics, getDPFStatistics } from '../rbac/dpfStructure';

async function syncSystemModules() {
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('  SYNCING SYSTEM MODULES TO DATABASE (SAP B1 Style)');
  console.log('═'.repeat(70));
  console.log('\n');

  // Show structure statistics
  const dpfStats = getDPFStatistics();
  const systemStats = getSystemModuleStatistics();

  console.log('DPF Structure Statistics:');
  console.log(`   Total Modules: ${dpfStats.totalModules} (${systemStats.totalModules} SYSTEM modules)`);
  console.log(`   Total Screens: ${dpfStats.totalScreens}`);
  console.log('\n');

  try {
    // Find SYSTEM tenant
    const systemTenant = await db.query.tenants.findFirst({
      where: eq(tenants.code, 'SYSTEM'),
    });

    if (!systemTenant) {
      console.log('SYSTEM tenant not found!');
      console.log('   Please run the seed script first: npm run db:seed');
      process.exit(1);
    }

    console.log(`Found SYSTEM tenant: ${systemTenant.id}`);
    console.log('\n');

    // Sync DPF structure
    await seedDPFStructure(systemTenant.id);

    // Validate
    await validateDPFStructure(systemTenant.id);

    console.log('\n');
    console.log('═'.repeat(70));
    console.log('  SYNC COMPLETE!');
    console.log('═'.repeat(70));
    console.log('\n');
    console.log('You can now view the SYSTEM modules in the database:');
    console.log('');
    console.log('  SELECT module_code, module_name, is_system_module');
    console.log('  FROM dpf_modules');
    console.log("  WHERE is_system_module = 'true';");
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

syncSystemModules();
