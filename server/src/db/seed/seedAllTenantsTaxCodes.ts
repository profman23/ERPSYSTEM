/**
 * Batch seed: runs seedTaxCodes for every real tenant.
 * Skips SYSTEM tenant and __CODE_RESERVATION__ placeholders.
 * Idempotent: skips tenants that already have tax codes.
 *
 * Usage: npx tsx src/db/seed/seedAllTenantsTaxCodes.ts
 */

import { db } from '../index';
import { tenants } from '../schemas/tenants';
import { ne } from 'drizzle-orm';
import { seedTaxCodes } from './seedTaxCodes';

async function main() {
  const allTenants = await db
    .select({ id: tenants.id, code: tenants.code, name: tenants.name })
    .from(tenants)
    .where(ne(tenants.code, 'SYSTEM'));

  const realTenants = allTenants.filter(
    (t) => !t.name.includes('__CODE_RESERVATION__')
  );

  console.log(`Found ${realTenants.length} real tenants to seed Tax Codes.\n`);

  for (const t of realTenants) {
    console.log(`─── Seeding Tax Codes: ${t.code} (${t.name}) ───`);
    try {
      const result = await seedTaxCodes(t.id);
      if (result.skipped) {
        console.log(`  ⊘ Skipped (already has tax codes)\n`);
      } else {
        console.log(`  ✓ Created ${result.taxCodesCreated} tax codes\n`);
      }
    } catch (err) {
      console.error(`  ✗ Error seeding ${t.code}:`, err);
    }
  }

  console.log('All tenants Tax Codes seeded.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
