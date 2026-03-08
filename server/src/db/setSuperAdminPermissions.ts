/**
 * Set Super Admin Full Permissions on all SYSTEM screens
 *
 * This script gives superadmin@system.local full permissions (level 2)
 * on all SYSTEM_* screens:
 * - SYSTEM_TENANT_LIST
 * - SYSTEM_USER_LIST
 * - SYSTEM_ROLE_LIST
 * - SYSTEM_SUBSCRIPTION_LIST
 * - SYSTEM_CONFIG
 * - SYSTEM_METRICS
 * - SYSTEM_DPF_MANAGER
 */

import { db } from './index';
import { users, tenants, dpfRoles, dpfUserRoles, dpfRoleScreenAuthorizations } from './schemas';
import { eq, and } from 'drizzle-orm';

// All SYSTEM screens that need full permissions
const SYSTEM_SCREENS = [
  'SYSTEM_TENANT_LIST',
  'SYSTEM_USER_LIST',
  'SYSTEM_ROLE_LIST',
  'SYSTEM_SUBSCRIPTION_LIST',
  'SYSTEM_CONFIG',
  'SYSTEM_METRICS',
  'SYSTEM_DPF_MANAGER',
];

// Authorization level 2 = Full (read + write)
const FULL_AUTHORIZATION = 2;

async function setSuperAdminPermissions() {
  try {
    console.log('🔧 Setting Super Admin permissions...\n');

    // 1. Find SYSTEM tenant
    const [systemTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.code, 'SYSTEM'))
      .limit(1);

    if (!systemTenant) {
      console.error('❌ SYSTEM tenant not found. Run seedSuperAdmin first.');
      process.exit(1);
    }
    console.log(`✅ Found SYSTEM tenant: ${systemTenant.id}`);

    // 2. Find superadmin user
    const [superAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'superadmin@system.local'))
      .limit(1);

    if (!superAdmin) {
      console.error('❌ superadmin@system.local not found. Run seedSuperAdmin first.');
      process.exit(1);
    }
    console.log(`✅ Found superadmin user: ${superAdmin.id}`);

    // 3. Find user's role (SYSTEM_ADMIN)
    const userRoleAssignments = await db
      .select({
        roleId: dpfUserRoles.roleId,
        roleCode: dpfRoles.roleCode,
        roleName: dpfRoles.roleName,
      })
      .from(dpfUserRoles)
      .innerJoin(dpfRoles, eq(dpfUserRoles.roleId, dpfRoles.id))
      .where(eq(dpfUserRoles.userId, superAdmin.id));

    if (userRoleAssignments.length === 0) {
      console.error('❌ superadmin has no role assigned. Run seedSuperAdmin first.');
      process.exit(1);
    }

    const systemAdminRole = userRoleAssignments[0];
    console.log(`✅ Found role: ${systemAdminRole.roleName} (${systemAdminRole.roleCode})`);
    console.log(`   Role ID: ${systemAdminRole.roleId}`);

    // 4. Check current authorizations
    const currentAuths = await db
      .select()
      .from(dpfRoleScreenAuthorizations)
      .where(and(
        eq(dpfRoleScreenAuthorizations.tenantId, systemTenant.id),
        eq(dpfRoleScreenAuthorizations.roleId, systemAdminRole.roleId)
      ));

    console.log(`\n📊 Current authorizations: ${currentAuths.length}`);
    if (currentAuths.length > 0) {
      currentAuths.forEach(auth => {
        const levelText = auth.authorizationLevel === 2 ? 'Full' : auth.authorizationLevel === 1 ? 'Read Only' : 'None';
        console.log(`   - ${auth.screenCode}: ${levelText} (${auth.authorizationLevel})`);
      });
    }

    // 5. Delete existing authorizations for this role
    await db.delete(dpfRoleScreenAuthorizations).where(and(
      eq(dpfRoleScreenAuthorizations.tenantId, systemTenant.id),
      eq(dpfRoleScreenAuthorizations.roleId, systemAdminRole.roleId)
    ));
    console.log('\n🗑️  Cleared existing authorizations');

    // 6. Insert full authorizations for all SYSTEM screens
    const authorizationsToInsert = SYSTEM_SCREENS.map(screenCode => ({
      tenantId: systemTenant.id,
      roleId: systemAdminRole.roleId,
      screenCode,
      authorizationLevel: FULL_AUTHORIZATION,
    }));

    await db.insert(dpfRoleScreenAuthorizations).values(authorizationsToInsert);
    console.log(`\n✅ Inserted ${authorizationsToInsert.length} authorizations with FULL access:\n`);

    SYSTEM_SCREENS.forEach(screen => {
      console.log(`   ✓ ${screen}: Full (2)`);
    });

    // 7. Verify the changes
    const newAuths = await db
      .select()
      .from(dpfRoleScreenAuthorizations)
      .where(and(
        eq(dpfRoleScreenAuthorizations.tenantId, systemTenant.id),
        eq(dpfRoleScreenAuthorizations.roleId, systemAdminRole.roleId)
      ));

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Super Admin Permissions Set Successfully!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  User: superadmin@system.local`);
    console.log(`  Role: ${systemAdminRole.roleName}`);
    console.log(`  Screens with Full Access: ${newAuths.length}`);
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting permissions:', error);
    process.exit(1);
  }
}

// Run the script
setSuperAdminPermissions();
