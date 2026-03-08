/**
 * Batch seed: runs seedSpeciesAndBreeds for every real tenant.
 * Skips SYSTEM tenant and __CODE_RESERVATION__ placeholders.
 *
 * Usage: npx tsx src/db/seed/seedAllTenants.ts
 */

import { db } from '../index';
import { tenants } from '../schemas/tenants';
import { ne } from 'drizzle-orm';
import { seedSpeciesAndBreeds } from './seedSpeciesAndBreeds';

async function main() {
  const allTenants = await db
    .select({ id: tenants.id, code: tenants.code, name: tenants.name })
    .from(tenants)
    .where(ne(tenants.code, 'SYSTEM'));

  const realTenants = allTenants.filter(
    (t) => !t.name.includes('__CODE_RESERVATION__')
  );

  console.log(`Found ${realTenants.length} real tenants to seed.\n`);

  for (const t of realTenants) {
    console.log(`─── Seeding: ${t.code} (${t.name}) ───`);
    try {
      await seedSpeciesAndBreeds(t.id);
      console.log(`  ✓ Done\n`);
    } catch (err) {
      console.error(`  ✗ Error seeding ${t.code}:`, err);
    }
  }

  console.log('All tenants seeded.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
