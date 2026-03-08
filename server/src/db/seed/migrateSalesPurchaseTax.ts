/**
 * Migration: Populate default_purchase_tax_code_id for Existing Tenants
 *
 * After renaming default_tax_code_id → default_sales_tax_code_id (already done),
 * this script populates the NEW default_purchase_tax_code_id column.
 *
 * Logic per tenant:
 *   1. Resolve VAT15-IN (INPUT_TAX) UUID for this tenant
 *   2. For each item group where default_purchase_tax_code_id IS NULL:
 *      - If sales tax is an OUTPUT_TAX → set purchase tax to VAT15-IN
 *      - If sales tax is EXEMPT → set purchase tax to EXEMPT too
 *      - If sales tax is NULL → leave purchase tax NULL
 *
 * Safety:
 *   - Only updates item groups where default_purchase_tax_code_id IS NULL
 *     (never overwrites user-customized values)
 *   - Each tenant runs in its own transaction
 *   - Idempotent: safe to run multiple times
 *
 * Usage: npx tsx src/db/seed/migrateSalesPurchaseTax.ts
 */

import { db } from '../index';
import { tenants } from '../schemas/tenants';
import { itemGroups } from '../schemas/itemGroups';
import { taxCodes } from '../schemas/taxCodes';
import { ne, eq, and, isNull } from 'drizzle-orm';

async function main() {
  const allTenants = await db
    .select({ id: tenants.id, code: tenants.code, name: tenants.name })
    .from(tenants)
    .where(ne(tenants.code, 'SYSTEM'));

  const realTenants = allTenants.filter(
    (t) => !t.name.includes('__CODE_RESERVATION__'),
  );

  console.log(`Found ${realTenants.length} real tenants to migrate.\n`);

  let totalUpdated = 0;

  for (const t of realTenants) {
    console.log(`─── ${t.code} (${t.name}) ───`);

    try {
      // Build tax code map: code → id AND id → taxType
      const tenantTaxCodes = await db
        .select({
          id: taxCodes.id,
          code: taxCodes.code,
          taxType: taxCodes.taxType,
        })
        .from(taxCodes)
        .where(
          and(eq(taxCodes.tenantId, t.id), eq(taxCodes.isActive, true)),
        );

      const codeToId = new Map<string, string>();
      const idToType = new Map<string, string>();
      const typeToDefaultId = new Map<string, string>();

      for (const tc of tenantTaxCodes) {
        codeToId.set(tc.code, tc.id);
        idToType.set(tc.id, tc.taxType);
        // Keep first match per type as default (VAT15-IN for INPUT_TAX, EXEMPT for EXEMPT)
        if (!typeToDefaultId.has(tc.taxType)) {
          typeToDefaultId.set(tc.taxType, tc.id);
        }
      }

      const vat15InId = codeToId.get('VAT15-IN');
      if (!vat15InId) {
        console.log('  ⚠ VAT15-IN tax code not found — skipping\n');
        continue;
      }

      // Find EXEMPT tax code for purchase (if exists)
      const exemptPurchaseId = typeToDefaultId.get('EXEMPT') ?? null;

      // Load item groups with NULL purchase tax
      const groups = await db
        .select({
          id: itemGroups.id,
          code: itemGroups.code,
          defaultSalesTaxCodeId: itemGroups.defaultSalesTaxCodeId,
        })
        .from(itemGroups)
        .where(
          and(
            eq(itemGroups.tenantId, t.id),
            isNull(itemGroups.defaultPurchaseTaxCodeId),
          ),
        );

      if (groups.length === 0) {
        console.log('  ℹ All item groups already have purchase tax — skipping\n');
        continue;
      }

      let tenantUpdated = 0;

      await db.transaction(async (tx) => {
        for (const group of groups) {
          let purchaseTaxId: string | null = null;

          if (!group.defaultSalesTaxCodeId) {
            // No sales tax → no purchase tax
            continue;
          }

          const salesTaxType = idToType.get(group.defaultSalesTaxCodeId);

          if (salesTaxType === 'OUTPUT_TAX') {
            // Sales is OUTPUT → purchase is INPUT (VAT15-IN)
            purchaseTaxId = vat15InId;
          } else if (salesTaxType === 'EXEMPT') {
            // Sales is EXEMPT → purchase is EXEMPT too
            purchaseTaxId = exemptPurchaseId;
          } else {
            // Unknown type → use VAT15-IN as safe default
            purchaseTaxId = vat15InId;
          }

          if (!purchaseTaxId) continue;

          await tx
            .update(itemGroups)
            .set({
              defaultPurchaseTaxCodeId: purchaseTaxId,
              updatedAt: new Date(),
            })
            .where(eq(itemGroups.id, group.id));

          console.log(`  ✓ ${group.code}: purchase tax → VAT15-IN`);
          tenantUpdated++;
        }
      });

      totalUpdated += tenantUpdated;
      console.log(`  Updated ${tenantUpdated} item groups\n`);
    } catch (err) {
      console.error(`  ✗ Error migrating ${t.code}:`, err);
    }
  }

  console.log(`\nMigration complete.`);
  console.log(`  Item groups updated: ${totalUpdated}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
