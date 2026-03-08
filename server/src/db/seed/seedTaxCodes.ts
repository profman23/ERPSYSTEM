/**
 * Seed Tax Codes for a Tenant
 *
 * Copies the default tax code templates into a tenant's tax_codes table.
 * Idempotent: skips if tax codes already exist for the tenant.
 * Resolves COA account codes (2130, 1160) to UUIDs for this tenant.
 * All inserts in a single transaction for atomicity.
 */

import { db } from '../index';
import { taxCodes } from '../schemas/taxCodes';
import { chartOfAccounts } from '../schemas/chartOfAccounts';
import { eq, and } from 'drizzle-orm';
import { DEFAULT_TAX_CODES } from './defaultTaxCodes';

export interface SeedTaxCodesResult {
  taxCodesCreated: number;
  skipped: boolean;
}

export async function seedTaxCodes(tenantId: string): Promise<SeedTaxCodesResult> {
  // Idempotent: check if tax codes already exist for this tenant
  const existing = await db
    .select({ id: taxCodes.id })
    .from(taxCodes)
    .where(eq(taxCodes.tenantId, tenantId))
    .limit(1);

  if (existing.length > 0) {
    return { taxCodesCreated: 0, skipped: true };
  }

  // Resolve COA account codes to UUIDs for this tenant
  const accounts = await db
    .select({ id: chartOfAccounts.id, code: chartOfAccounts.code })
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.tenantId, tenantId),
        eq(chartOfAccounts.isActive, true),
      ),
    );

  const codeToId = new Map<string, string>();
  for (const acc of accounts) {
    codeToId.set(acc.code, acc.id);
  }

  let taxCodesCreated = 0;

  await db.transaction(async (tx) => {
    for (const template of DEFAULT_TAX_CODES) {
      const salesTaxAccountId = template.salesTaxAccountCode
        ? codeToId.get(template.salesTaxAccountCode) ?? null
        : null;
      const purchaseTaxAccountId = template.purchaseTaxAccountCode
        ? codeToId.get(template.purchaseTaxAccountCode) ?? null
        : null;

      await tx.insert(taxCodes).values({
        tenantId,
        code: template.code,
        name: template.name,
        nameAr: template.nameAr,
        taxType: template.taxType,
        rate: template.rate,
        calculationMethod: template.calculationMethod,
        salesTaxAccountId,
        purchaseTaxAccountId,
        jurisdiction: template.jurisdiction,
      });

      taxCodesCreated++;
    }
  });

  return { taxCodesCreated, skipped: false };
}
