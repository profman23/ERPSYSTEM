/**
 * Force-seed default Chart of Accounts for all tenants.
 * Unlike seedChartOfAccounts, this adds missing default accounts
 * even if the tenant already has some accounts.
 *
 * Usage: npx tsx src/db/seed/forceSeedCOA.ts
 */

import { db } from '../index';
import { tenants } from '../schemas/tenants';
import { chartOfAccounts } from '../schemas/chartOfAccounts';
import { eq, and } from 'drizzle-orm';
import { DEFAULT_CHART_OF_ACCOUNTS } from './defaultChartOfAccounts';

async function main() {
  const allTenants = await db
    .select({ id: tenants.id, code: tenants.code, name: tenants.name })
    .from(tenants);

  const realTenants = allTenants.filter(
    (t) => !t.name.includes('__CODE_RESERVATION__') && t.name !== 'System Administration'
  );

  console.log(`Found ${realTenants.length} tenants to seed.\n`);

  for (const tenant of realTenants) {
    console.log(`─── ${tenant.code} (${tenant.name}) ───`);

    // Get existing account codes for this tenant
    const existing = await db
      .select({ code: chartOfAccounts.code })
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.tenantId, tenant.id));

    const existingCodes = new Set(existing.map((a) => a.code));

    // Filter template to only missing accounts
    const sorted = [...DEFAULT_CHART_OF_ACCOUNTS].sort((a, b) => a.code.localeCompare(b.code));
    const missing = sorted.filter((t) => !existingCodes.has(t.code));

    if (missing.length === 0) {
      console.log('  All default accounts already exist.\n');
      continue;
    }

    console.log(`  Adding ${missing.length} missing default accounts...`);

    await db.transaction(async (tx) => {
      // First, get ALL existing accounts to build parent map
      const allAccounts = await tx
        .select({ id: chartOfAccounts.id, code: chartOfAccounts.code })
        .from(chartOfAccounts)
        .where(eq(chartOfAccounts.tenantId, tenant.id));

      const codeToId = new Map<string, string>();
      const codeToPath = new Map<string, string>();
      const codeToLevel = new Map<string, number>();

      for (const a of allAccounts) {
        codeToId.set(a.code, a.id);
      }

      for (const template of sorted) {
        // Skip if already exists
        if (existingCodes.has(template.code)) {
          // Still register in maps for child resolution
          const existingId = codeToId.get(template.code);
          if (existingId) {
            const parentPath = template.parentCode ? codeToPath.get(template.parentCode) : null;
            const parentLevel = template.parentCode ? codeToLevel.get(template.parentCode) : null;
            codeToPath.set(template.code, parentPath ? `${parentPath}.${template.code}` : template.code);
            codeToLevel.set(template.code, parentLevel !== null && parentLevel !== undefined ? parentLevel + 1 : 0);
          }
          continue;
        }

        // Resolve parent
        const parentId = template.parentCode ? codeToId.get(template.parentCode) ?? null : null;
        const parentPath = template.parentCode ? codeToPath.get(template.parentCode) : null;
        const parentLevel = template.parentCode ? codeToLevel.get(template.parentCode) : null;

        const level = parentLevel !== null && parentLevel !== undefined ? parentLevel + 1 : 0;
        const path = parentPath ? `${parentPath}.${template.code}` : template.code;

        const [inserted] = await tx
          .insert(chartOfAccounts)
          .values({
            tenantId: tenant.id,
            parentId,
            code: template.code,
            name: template.name,
            nameAr: template.nameAr,
            accountType: template.accountType,
            normalBalance: template.normalBalance,
            isPostable: template.isPostable,
            level,
            path,
            isCashAccount: template.isCashAccount ?? false,
            isBankAccount: template.isBankAccount ?? false,
            isSystemAccount: true,
            isActive: true,
          })
          .returning({ id: chartOfAccounts.id });

        codeToId.set(template.code, inserted.id);
        codeToPath.set(template.code, path);
        codeToLevel.set(template.code, level);
      }
    });

    console.log(`  ✅ Seeded ${missing.length} accounts.\n`);
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
