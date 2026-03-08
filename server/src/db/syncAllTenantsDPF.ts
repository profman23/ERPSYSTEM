/**
 * Sync DPF structure for ALL tenants
 * Adds any missing modules/screens from dpfStructure.ts
 * Idempotent and safe to run multiple times.
 *
 * Usage: npx tsx src/db/syncAllTenantsDPF.ts
 */

import { db } from './index';
import { tenants } from './schemas/tenants';
import { seedDPFStructure } from './seed/seedDPFStructure';

async function main() {
  const allTenants = await db
    .select({ id: tenants.id, code: tenants.code, name: tenants.name })
    .from(tenants);

  const realTenants = allTenants.filter(
    (t) => !t.name.includes('__CODE_RESERVATION__')
  );

  console.log(`Found ${realTenants.length} tenants to sync DPF.\n`);

  for (const t of realTenants) {
    console.log(`─── Syncing DPF: ${t.code} (${t.name}) ───`);
    try {
      const result = await seedDPFStructure(t.id);
      console.log(`  Modules: +${result.modulesCreated} new, ${result.modulesUpdated} updated`);
      console.log(`  Screens: +${result.screensCreated} new, ${result.screensUpdated} updated\n`);
    } catch (err) {
      console.error(`  Error syncing ${t.code}:`, err);
    }
  }

  console.log('DPF sync complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
