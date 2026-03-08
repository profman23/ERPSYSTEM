/**
 * Seed Chart of Accounts for a Tenant
 *
 * Copies the default COA template into a tenant's chart_of_accounts table.
 * Idempotent: only inserts accounts that don't already exist (by code).
 * New tenants get the full template. Existing tenants get missing accounts added.
 * All inserts in a single transaction for atomicity.
 */

import { db } from '../index';
import { chartOfAccounts } from '../schemas/chartOfAccounts';
import { eq, and, inArray } from 'drizzle-orm';
import { DEFAULT_CHART_OF_ACCOUNTS } from './defaultChartOfAccounts';

export interface SeedChartOfAccountsResult {
  accountsCreated: number;
  skipped: boolean;
}

export async function seedChartOfAccounts(tenantId: string): Promise<SeedChartOfAccountsResult> {
  // Find which codes already exist for this tenant
  const existingAccounts = await db
    .select({ code: chartOfAccounts.code, id: chartOfAccounts.id, path: chartOfAccounts.path, level: chartOfAccounts.level })
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.tenantId, tenantId));

  const existingCodes = new Set(existingAccounts.map(a => a.code));

  // Sort by code to ensure parents are inserted before children
  const sorted = [...DEFAULT_CHART_OF_ACCOUNTS].sort((a, b) => a.code.localeCompare(b.code));

  // Filter to only missing accounts
  const missing = sorted.filter(t => !existingCodes.has(t.code));

  if (missing.length === 0) {
    return { accountsCreated: 0, skipped: true };
  }

  let accountsCreated = 0;

  await db.transaction(async (tx) => {
    // Build code→id/path/level map from existing accounts
    const codeToId = new Map<string, string>();
    const codeToPath = new Map<string, string>();
    const codeToLevel = new Map<string, number>();

    for (const acc of existingAccounts) {
      codeToId.set(acc.code, acc.id);
      codeToPath.set(acc.code, acc.path);
      codeToLevel.set(acc.code, acc.level);
    }

    for (const template of missing) {
      // Resolve parent (may be existing or just-inserted)
      const parentId = template.parentCode ? codeToId.get(template.parentCode) ?? null : null;
      const parentPath = template.parentCode ? codeToPath.get(template.parentCode) : null;
      const parentLevel = template.parentCode ? codeToLevel.get(template.parentCode) : null;

      const level = parentLevel !== null && parentLevel !== undefined ? parentLevel + 1 : 0;
      const path = parentPath ? `${parentPath}.${template.code}` : template.code;

      const [inserted] = await tx
        .insert(chartOfAccounts)
        .values({
          tenantId,
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

      // Register in maps so children of new accounts resolve correctly
      codeToId.set(template.code, inserted.id);
      codeToPath.set(template.code, path);
      codeToLevel.set(template.code, level);
      accountsCreated++;
    }
  });

  return { accountsCreated, skipped: false };
}
