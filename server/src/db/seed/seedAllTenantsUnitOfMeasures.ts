/**
 * Batch seed: runs seedUnitOfMeasures for every real tenant.
 * Skips SYSTEM tenant and __CODE_RESERVATION__ placeholders.
 * Idempotent: skips tenants that already have unit of measures.
 *
 * Usage: npx tsx src/db/seed/seedAllTenantsUnitOfMeasures.ts
 */

import { db } from '../index';
import { tenants } from '../schemas/tenants';
import { ne } from 'drizzle-orm';
import { seedUnitOfMeasures } from './seedUnitOfMeasures';

async function main() {
  const allTenants = await db
    .select({ id: tenants.id, code: tenants.code, name: tenants.name })
    .from(tenants)
    .where(ne(tenants.code, 'SYSTEM'));

  const realTenants = allTenants.filter(
    (t) => !t.name.includes('__CODE_RESERVATION__')
  );

  console.log(`Found ${realTenants.length} real tenants to seed Unit of Measures.\n`);

  for (const t of realTenants) {
    console.log(`─── Seeding Unit of Measures: ${t.code} (${t.name}) ───`);
    try {
      const result = await seedUnitOfMeasures(t.id);
      if (result.skipped) {
        console.log(`  ⊘ Skipped (already has unit of measures)\n`);
      } else {
        console.log(`  ✓ Created ${result.unitOfMeasuresCreated} unit of measures\n`);
      }
    } catch (err) {
      console.error(`  ✗ Error seeding ${t.code}:`, err);
    }
  }

  console.log('All tenants Unit of Measures seeded.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
