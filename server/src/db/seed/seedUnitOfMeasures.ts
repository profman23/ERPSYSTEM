/**
 * Seed Unit of Measures for a Tenant
 *
 * Copies the default UoM templates into a tenant's unit_of_measures table.
 * Idempotent: skips if UoMs already exist for the tenant.
 * All inserts in a single transaction for atomicity.
 */

import { db } from '../index';
import { unitOfMeasures } from '../schemas/unitOfMeasures';
import { eq } from 'drizzle-orm';
import { DEFAULT_UNIT_OF_MEASURES } from './defaultUnitOfMeasures';

export interface SeedUnitOfMeasuresResult {
  unitOfMeasuresCreated: number;
  skipped: boolean;
}

export async function seedUnitOfMeasures(tenantId: string): Promise<SeedUnitOfMeasuresResult> {
  // Idempotent: check if UoMs already exist for this tenant
  const existing = await db
    .select({ id: unitOfMeasures.id })
    .from(unitOfMeasures)
    .where(eq(unitOfMeasures.tenantId, tenantId))
    .limit(1);

  if (existing.length > 0) {
    return { unitOfMeasuresCreated: 0, skipped: true };
  }

  let unitOfMeasuresCreated = 0;

  await db.transaction(async (tx) => {
    for (const template of DEFAULT_UNIT_OF_MEASURES) {
      await tx.insert(unitOfMeasures).values({
        tenantId,
        code: template.code,
        name: template.name,
        nameAr: template.nameAr,
        symbol: template.symbol,
        description: template.description,
        descriptionAr: template.descriptionAr,
      });

      unitOfMeasuresCreated++;
    }
  });

  return { unitOfMeasuresCreated, skipped: false };
}
