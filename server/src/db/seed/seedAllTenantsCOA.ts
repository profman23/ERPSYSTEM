/**
 * Batch seed: runs seedChartOfAccounts for every real tenant.
 * Skips SYSTEM tenant and __CODE_RESERVATION__ placeholders.
 * Idempotent: adds only missing accounts (does not duplicate existing ones).
 *
 * Usage: npx tsx src/db/seed/seedAllTenantsCOA.ts
 */

import { db } from '../index';
import { tenants } from '../schemas/tenants';
import { ne } from 'drizzle-orm';
import { seedChartOfAccounts } from './seedChartOfAccounts';

async function main() {
  const allTenants = await db
    .select({ id: tenants.id, code: tenants.code, name: tenants.name })
    .from(tenants)
    .where(ne(tenants.code, 'SYSTEM'));

  const realTenants = allTenants.filter(
    (t) => !t.name.includes('__CODE_RESERVATION__')
  );

  console.log(`Found ${realTenants.length} real tenants to seed COA.\n`);

  for (const t of realTenants) {
    console.log(`─── Seeding COA: ${t.code} (${t.name}) ───`);
    try {
      const result = await seedChartOfAccounts(t.id);
      if (result.skipped) {
        console.log(`  ✓ Up to date (no missing accounts)\n`);
      } else {
        console.log(`  ✓ Added ${result.accountsCreated} missing accounts\n`);
      }
    } catch (err) {
      console.error(`  ✗ Error seeding ${t.code}:`, err);
    }
  }

  console.log('All tenants COA seeded.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
