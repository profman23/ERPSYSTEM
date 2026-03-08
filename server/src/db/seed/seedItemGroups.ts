/**
 * Seed Item Groups for a Tenant
 *
 * Copies the default item group templates into a tenant's item_groups table.
 * Idempotent: skips if item groups already exist for the tenant.
 * Resolves COA account codes and tax code codes to UUIDs for this tenant.
 * All inserts in a single transaction for atomicity.
 */

import { db } from '../index';
import { itemGroups } from '../schemas/itemGroups';
import { chartOfAccounts } from '../schemas/chartOfAccounts';
import { taxCodes } from '../schemas/taxCodes';
import { eq, and } from 'drizzle-orm';
import { DEFAULT_ITEM_GROUPS } from './defaultItemGroups';

export interface SeedItemGroupsResult {
  itemGroupsCreated: number;
  skipped: boolean;
}

export async function seedItemGroups(tenantId: string): Promise<SeedItemGroupsResult> {
  // Idempotent: check if item groups already exist for this tenant
  const existing = await db
    .select({ id: itemGroups.id })
    .from(itemGroups)
    .where(eq(itemGroups.tenantId, tenantId))
    .limit(1);

  if (existing.length > 0) {
    return { itemGroupsCreated: 0, skipped: true };
  }

  // Resolve COA account codes to UUIDs for this tenant (single query, Map lookup)
  const accounts = await db
    .select({ id: chartOfAccounts.id, code: chartOfAccounts.code })
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.tenantId, tenantId),
        eq(chartOfAccounts.isActive, true),
      ),
    );

  const coaCodeToId = new Map<string, string>();
  for (const acc of accounts) {
    coaCodeToId.set(acc.code, acc.id);
  }

  // Resolve tax code codes to UUIDs for this tenant (single query)
  const tenantTaxCodes = await db
    .select({ id: taxCodes.id, code: taxCodes.code })
    .from(taxCodes)
    .where(
      and(
        eq(taxCodes.tenantId, tenantId),
        eq(taxCodes.isActive, true),
      ),
    );

  const taxCodeToId = new Map<string, string>();
  for (const tc of tenantTaxCodes) {
    taxCodeToId.set(tc.code, tc.id);
  }

  let itemGroupsCreated = 0;

  await db.transaction(async (tx) => {
    for (const template of DEFAULT_ITEM_GROUPS) {
      const inventoryAccountId = template.inventoryAccountCode
        ? coaCodeToId.get(template.inventoryAccountCode) ?? null
        : null;
      const cogsAccountId = coaCodeToId.get(template.cogsAccountCode) ?? null;
      const purchaseAccountId = template.purchaseAccountCode
        ? coaCodeToId.get(template.purchaseAccountCode) ?? null
        : null;
      const revenueAccountId = coaCodeToId.get(template.revenueAccountCode) ?? null;
      const defaultSalesTaxCodeId = taxCodeToId.get(template.defaultSalesTaxCodeCode) ?? null;
      const defaultPurchaseTaxCodeId = taxCodeToId.get(template.defaultPurchaseTaxCodeCode) ?? null;

      await tx.insert(itemGroups).values({
        tenantId,
        code: template.code,
        name: template.name,
        nameAr: template.nameAr,
        itemGroupType: template.itemGroupType,
        inventoryAccountId,
        cogsAccountId,
        purchaseAccountId,
        revenueAccountId,
        defaultSalesTaxCodeId,
        defaultPurchaseTaxCodeId,
      });

      itemGroupsCreated++;
    }
  });

  return { itemGroupsCreated, skipped: false };
}
