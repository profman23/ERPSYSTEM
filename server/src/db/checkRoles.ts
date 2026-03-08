import { db } from './index';
import { dpfRoles } from './schemas';
import { eq, or } from 'drizzle-orm';

async function checkRoles() {
  try {
    // Check all roles with isSystemRole
    const roles = await db
      .select({
        id: dpfRoles.id,
        roleCode: dpfRoles.roleCode,
        roleName: dpfRoles.roleName,
        isSystemRole: dpfRoles.isSystemRole,
        tenantId: dpfRoles.tenantId,
      })
      .from(dpfRoles)
      .where(
        or(
          eq(dpfRoles.roleCode, 'SYSTEM_ADMIN'),
          eq(dpfRoles.roleCode, 'TENANT_ADMIN'),
          eq(dpfRoles.isSystemRole, 'true')
        )
      );

    console.log('\n📋 Roles with isSystemRole or built-in codes:');
    console.table(roles);

    // Update any roles that should be system roles
    const updated = await db
      .update(dpfRoles)
      .set({ isSystemRole: 'true' })
      .where(
        or(
          eq(dpfRoles.roleCode, 'SYSTEM_ADMIN'),
          eq(dpfRoles.roleCode, 'TENANT_ADMIN')
        )
      )
      .returning();

    console.log(`\n✅ Updated ${updated.length} roles to isSystemRole='true'`);

    // Verify update
    const verifyRoles = await db
      .select({
        id: dpfRoles.id,
        roleCode: dpfRoles.roleCode,
        roleName: dpfRoles.roleName,
        isSystemRole: dpfRoles.isSystemRole,
      })
      .from(dpfRoles)
      .where(eq(dpfRoles.isSystemRole, 'true'));

    console.log('\n📋 Roles with isSystemRole=true after update:');
    console.table(verifyRoles);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRoles();
