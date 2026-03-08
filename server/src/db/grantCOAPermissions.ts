/**
 * Grant CHART_OF_ACCOUNTS screen permission to all roles for all tenants.
 * Sets authorization level 2 (Full) for every role that doesn't already have access.
 *
 * Usage: npx tsx src/db/grantCOAPermissions.ts
 */

import { db } from './index';
import { tenants } from './schemas/tenants';
import { dpfRoles } from './schemas/dpfRoles';
import { dpfRoleScreenAuthorizations } from './schemas/dpfRoleScreenAuthorizations';
import { eq, and } from 'drizzle-orm';

const SCREEN_CODE = 'CHART_OF_ACCOUNTS';

async function main() {
  const allTenants = await db
    .select({ id: tenants.id, code: tenants.code, name: tenants.name })
    .from(tenants);

  const realTenants = allTenants.filter(
    (t) => !t.name.includes('__CODE_RESERVATION__')
  );

  console.log(`Found ${realTenants.length} tenants.\n`);

  for (const tenant of realTenants) {
    console.log(`─── ${tenant.code} (${tenant.name}) ───`);

    // Get all roles for this tenant
    const roles = await db
      .select({ id: dpfRoles.id, roleCode: dpfRoles.roleCode })
      .from(dpfRoles)
      .where(eq(dpfRoles.tenantId, tenant.id));

    // Check existing screen authorizations for CHART_OF_ACCOUNTS
    const existingAuths = await db
      .select({ roleId: dpfRoleScreenAuthorizations.roleId })
      .from(dpfRoleScreenAuthorizations)
      .where(and(
        eq(dpfRoleScreenAuthorizations.tenantId, tenant.id),
        eq(dpfRoleScreenAuthorizations.screenCode, SCREEN_CODE)
      ));

    const existingRoleIds = new Set(existingAuths.map((a) => a.roleId));

    let granted = 0;
    for (const role of roles) {
      if (!existingRoleIds.has(role.id)) {
        await db.insert(dpfRoleScreenAuthorizations).values({
          tenantId: tenant.id,
          roleId: role.id,
          screenCode: SCREEN_CODE,
          authorizationLevel: 2, // Full Authorization
        });
        console.log(`  Granted Full access to: ${role.roleCode}`);
        granted++;
      }
    }

    if (granted === 0) {
      console.log('  All roles already have access.');
    }
    console.log('');
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
