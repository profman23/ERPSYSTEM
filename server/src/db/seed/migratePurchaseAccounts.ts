/**
 * Migration: Separate Purchase Accounts from COGS Accounts (IAS/IFRS Compliance)
 *
 * Problem: Item Groups were seeded with purchaseAccountCode === cogsAccountCode.
 * Fix: Add new Purchase COA accounts (5150 parent + 5151-5153) and update
 *       existing Item Groups to point to the correct purchase accounts.
 *
 * Safety:
 *   - Only updates item groups where purchase_account_id === cogs_account_id
 *     (still at broken default). Skips user-customized item groups.
 *   - COA seeding is idempotent (skips existing codes).
 *   - Each tenant runs in its own transaction for atomicity.
 *
 * Usage: npx tsx src/db/seed/migratePurchaseAccounts.ts
 */

import { db } from '../index';
import { tenants } from '../schemas/tenants';
import { itemGroups } from '../schemas/itemGroups';
import { chartOfAccounts } from '../schemas/chartOfAccounts';
import { ne, eq, and } from 'drizzle-orm';
import { seedChartOfAccounts } from './seedChartOfAccounts';

/** Maps itemGroupType → new purchase COA code */
const PURCHASE_MIGRATION_MAP: Record<string, string> = {
  MEDICINE: '5151',
  SURGICAL_SUPPLY: '5152',
  EQUIPMENT: '5153',
  CONSUMABLE: '5152',
  // SERVICE has null purchase — skip
};

async function main() {
  const allTenants = await db
    .select({ id: tenants.id, code: tenants.code, name: tenants.name })
    .from(tenants)
    .where(ne(tenants.code, 'SYSTEM'));

  const realTenants = allTenants.filter(
    (t) => !t.name.includes('__CODE_RESERVATION__')
  );

  console.log(`Found ${realTenants.length} real tenants to migrate.\n`);

  let totalCoaAdded = 0;
  let totalGroupsUpdated = 0;

  for (const t of realTenants) {
    console.log(`─── ${t.code} (${t.name}) ───`);

    try {
      // Step 1: Add missing COA accounts (5150 parent + 5151-5153 postable)
      const coaResult = await seedChartOfAccounts(t.id);
      if (coaResult.skipped) {
        console.log(`  COA: Up to date`);
      } else {
        console.log(`  COA: Added ${coaResult.accountsCreated} missing accounts`);
        totalCoaAdded += coaResult.accountsCreated;
      }

      // Step 2: Build COA code → id map for this tenant
      const accounts = await db
        .select({ id: chartOfAccounts.id, code: chartOfAccounts.code })
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.tenantId, t.id),
          eq(chartOfAccounts.isActive, true),
        ));
      const codeToId = new Map(accounts.map(a => [a.code, a.id]));

      // Step 3: Load item groups for this tenant
      const groups = await db
        .select({
          id: itemGroups.id,
          code: itemGroups.code,
          itemGroupType: itemGroups.itemGroupType,
          purchaseAccountId: itemGroups.purchaseAccountId,
          cogsAccountId: itemGroups.cogsAccountId,
        })
        .from(itemGroups)
        .where(eq(itemGroups.tenantId, t.id));

      // Step 4: Update item groups where purchase === cogs (broken default)
      let tenantUpdated = 0;

      await db.transaction(async (tx) => {
        for (const group of groups) {
          // Skip if no purchase account or SERVICE type
          if (!group.purchaseAccountId) continue;

          // Only update if purchase === cogs (still at broken default)
          if (group.purchaseAccountId !== group.cogsAccountId) {
            console.log(`  ℹ ${group.code}: purchase ≠ cogs — skipping (user customized)`);
            continue;
          }

          const newPurchaseCode = PURCHASE_MIGRATION_MAP[group.itemGroupType];
          if (!newPurchaseCode) continue;

          const newPurchaseId = codeToId.get(newPurchaseCode);
          if (!newPurchaseId) {
            console.log(`  ⚠ ${group.code}: COA ${newPurchaseCode} not found — skipping`);
            continue;
          }

          await tx
            .update(itemGroups)
            .set({ purchaseAccountId: newPurchaseId, updatedAt: new Date() })
            .where(eq(itemGroups.id, group.id));

          console.log(`  ✓ ${group.code}: purchase ${group.purchaseAccountId} → ${newPurchaseId} (${newPurchaseCode})`);
          tenantUpdated++;
        }
      });

      totalGroupsUpdated += tenantUpdated;
      console.log(`  Updated ${tenantUpdated} item groups\n`);
    } catch (err) {
      console.error(`  ✗ Error migrating ${t.code}:`, err);
    }
  }

  console.log(`\nMigration complete.`);
  console.log(`  COA accounts added: ${totalCoaAdded}`);
  console.log(`  Item groups updated: ${totalGroupsUpdated}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
