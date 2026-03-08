/**
 * Migration: Rename default_tax_code_id → default_sales_tax_code_id + add default_purchase_tax_code_id
 *
 * This handles the schema change that Drizzle can't auto-detect (rename vs create ambiguity).
 * Safe: uses IF NOT EXISTS / IF EXISTS for idempotency.
 *
 * Usage: npx tsx src/db/migrateTaxCodeColumns.ts
 */

import { db } from './index';
import { sql } from 'drizzle-orm';

async function main() {
  // Check if old column still exists
  const colCheck = await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'item_groups' AND column_name = 'default_tax_code_id'
  `);

  if (colCheck.rows.length > 0) {
    // Step 1: Rename existing column
    await db.execute(sql`ALTER TABLE item_groups RENAME COLUMN default_tax_code_id TO default_sales_tax_code_id`);
    console.log('✓ Renamed default_tax_code_id → default_sales_tax_code_id');
  } else {
    console.log('ℹ Column already renamed (default_sales_tax_code_id exists)');
  }

  // Step 2: Add new purchase tax code column if not exists
  const purchaseColCheck = await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'item_groups' AND column_name = 'default_purchase_tax_code_id'
  `);

  if (purchaseColCheck.rows.length === 0) {
    await db.execute(sql`ALTER TABLE item_groups ADD COLUMN default_purchase_tax_code_id uuid REFERENCES tax_codes(id) ON DELETE SET NULL`);
    console.log('✓ Added default_purchase_tax_code_id column');
  } else {
    console.log('ℹ Column default_purchase_tax_code_id already exists');
  }

  // Step 3: Drop old index and create new ones
  await db.execute(sql`DROP INDEX IF EXISTS item_groups_default_tax_code_idx`);
  console.log('✓ Dropped old index (if existed)');

  await db.execute(sql`CREATE INDEX IF NOT EXISTS item_groups_default_sales_tax_code_idx ON item_groups (default_sales_tax_code_id)`);
  console.log('✓ Created index on default_sales_tax_code_id');

  await db.execute(sql`CREATE INDEX IF NOT EXISTS item_groups_default_purchase_tax_code_idx ON item_groups (default_purchase_tax_code_id)`);
  console.log('✓ Created index on default_purchase_tax_code_id');

  console.log('\nColumn migration complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
