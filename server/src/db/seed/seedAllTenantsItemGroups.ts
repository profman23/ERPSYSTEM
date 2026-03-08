/**
 * Batch seed: runs seedChartOfAccounts (adds missing accounts like 1143, 5130, 4230, 5140)
 * then seedItemGroups for every real tenant.
 * Skips SYSTEM tenant and __CODE_RESERVATION__ placeholders.
 * Idempotent: safe to run multiple times.
 *
 * Usage: npx tsx src/db/seed/seedAllTenantsItemGroups.ts
 */

import { db } from '../index';
import { tenants } from '../schemas/tenants';
import { ne } from 'drizzle-orm';
import { seedChartOfAccounts } from './seedChartOfAccounts';
import { seedItemGroups } from './seedItemGroups';

async function main() {
  const allTenants = await db
    .select({ id: tenants.id, code: tenants.code, name: tenants.name })
    .from(tenants)
    .where(ne(tenants.code, 'SYSTEM'));

  const realTenants = allTenants.filter(
    (t) => !t.name.includes('__CODE_RESERVATION__')
  );

  console.log(`Found ${realTenants.length} real tenants to seed Item Groups.\n`);

  for (const t of realTenants) {
    console.log(`─── ${t.code} (${t.name}) ───`);
    try {
      // Step 1: Ensure new COA accounts exist (1143, 5130, 4230, 5140)
      const coaResult = await seedChartOfAccounts(t.id);
      if (coaResult.skipped) {
        console.log(`  COA: Up to date`);
      } else {
        console.log(`  COA: Added ${coaResult.accountsCreated} missing accounts`);
      }

      // Step 2: Seed default item groups
      const igResult = await seedItemGroups(t.id);
      if (igResult.skipped) {
        console.log(`  Item Groups: Up to date`);
      } else {
        console.log(`  Item Groups: Created ${igResult.itemGroupsCreated} groups`);
      }
      console.log('');
    } catch (err) {
      console.error(`  ✗ Error seeding ${t.code}:`, err);
    }
  }

  console.log('All tenants Item Groups seeded.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
