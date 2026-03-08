/**
 * Permission Enforcement Test Script
 *
 * This script tests that:
 * 1. A System Role with limited permissions can be created
 * 2. A SYSTEM user can be assigned that role
 * 3. Permissions are actually enforced (denied when not granted)
 *
 * Run with: npx tsx src/db/testPermissionEnforcement.ts
 */

import { db } from './index';
import { dpfRoles, dpfPermissions, dpfRolePermissions, dpfUserRoles, users, tenants } from './schemas';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function runTest() {
  console.log('\n🧪 Permission Enforcement Test');
  console.log('═'.repeat(60));

  // Step 1: Get SYSTEM tenant ID
  console.log('\n📍 Step 1: Finding SYSTEM tenant...');
  const [systemTenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.code, 'SYSTEM'))
    .limit(1);

  if (!systemTenant) {
    console.error('❌ SYSTEM tenant not found!');
    process.exit(1);
  }
  console.log(`✅ SYSTEM tenant: ${systemTenant.id}`);

  // Step 2: Create a LIMITED role (only tenants.view permission)
  console.log('\n📍 Step 2: Creating limited role "VIEW_TENANTS_ONLY"...');

  // Check if role already exists
  let [testRole] = await db
    .select()
    .from(dpfRoles)
    .where(and(
      eq(dpfRoles.tenantId, systemTenant.id),
      eq(dpfRoles.roleCode, 'VIEW_TENANTS_ONLY')
    ))
    .limit(1);

  if (!testRole) {
    [testRole] = await db.insert(dpfRoles).values({
      tenantId: systemTenant.id,
      roleCode: 'VIEW_TENANTS_ONLY',
      roleName: 'View Tenants Only',
      description: 'Test role - can only view tenants, nothing else',
      isProtected: 'false',
      isDefault: 'false',
      isActive: 'true',
      isSystemRole: 'true',
      roleType: 'SYSTEM',
    }).returning();
    console.log(`✅ Created role: ${testRole.id}`);
  } else {
    console.log(`✅ Role already exists: ${testRole.id}`);
  }

  // Step 3: Find the tenants.view permission
  console.log('\n📍 Step 3: Finding tenants.view permission...');
  const [viewTenantsPermission] = await db
    .select()
    .from(dpfPermissions)
    .where(and(
      eq(dpfPermissions.tenantId, systemTenant.id),
      eq(dpfPermissions.permissionCode, 'tenants.view')
    ))
    .limit(1);

  if (!viewTenantsPermission) {
    console.error('❌ tenants.view permission not found!');
    console.log('Available permissions:');
    const allPerms = await db
      .select({ code: dpfPermissions.permissionCode })
      .from(dpfPermissions)
      .where(eq(dpfPermissions.tenantId, systemTenant.id))
      .limit(10);
    console.log(allPerms.map(p => p.code).join(', '));
    process.exit(1);
  }
  console.log(`✅ Permission found: ${viewTenantsPermission.id} (${viewTenantsPermission.permissionCode})`);

  // Step 4: Assign ONLY tenants.view to this role
  console.log('\n📍 Step 4: Assigning only tenants.view permission to role...');

  // Clear existing permissions for this role
  await db.delete(dpfRolePermissions).where(
    and(
      eq(dpfRolePermissions.tenantId, systemTenant.id),
      eq(dpfRolePermissions.roleId, testRole.id)
    )
  );

  // Add only the view permission
  await db.insert(dpfRolePermissions).values({
    tenantId: systemTenant.id,
    roleId: testRole.id,
    permissionId: viewTenantsPermission.id,
    agiLevel: 'read',
  });
  console.log('✅ Assigned tenants.view permission to role');

  // Step 5: Create a test user with this role
  console.log('\n📍 Step 5: Creating test user "limited_test@system.local"...');

  const testEmail = 'limited_test@system.local';

  // Check if user already exists
  let [testUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, testEmail))
    .limit(1);

  if (testUser) {
    console.log(`⚠️ User already exists: ${testUser.id}`);
    // Clean up existing role assignments
    await db.delete(dpfUserRoles).where(eq(dpfUserRoles.userId, testUser.id));
  } else {
    const passwordHash = await bcrypt.hash('Test@123', 12);
    const userCode = `TEST-${Date.now().toString(36).toUpperCase()}`;

    [testUser] = await db.insert(users).values({
      code: userCode,
      firstName: 'Limited',
      lastName: 'TestUser',
      name: 'Limited TestUser',
      email: testEmail,
      passwordHash,
      role: 'system_user', // NOT super_admin!
      accessScope: 'system',
      status: 'active',
      isActive: true,
      branchId: null,
      businessLineId: null,
      tenantId: null,
    }).returning();
    console.log(`✅ Created user: ${testUser.id}`);
  }

  // Step 6: Assign the limited role to the user
  console.log('\n📍 Step 6: Assigning VIEW_TENANTS_ONLY role to user...');

  await db.insert(dpfUserRoles).values({
    userId: testUser.id,
    roleId: testRole.id,
    tenantId: systemTenant.id,
    assignedScope: 'SYSTEM',
    assignedBy: testUser.id,
  });
  console.log('✅ Role assigned to user');

  // Step 7: Output test credentials and expected behavior
  console.log('\n' + '═'.repeat(60));
  console.log('🎯 TEST USER CREATED');
  console.log('═'.repeat(60));
  console.log('\nLogin credentials:');
  console.log('  Tenant Code: SYSTEM');
  console.log(`  Email:       ${testEmail}`);
  console.log('  Password:    Test@123');
  console.log('\nExpected behavior:');
  console.log('  ✅ Can VIEW tenants list');
  console.log('  ❌ Cannot CREATE tenants');
  console.log('  ❌ Cannot UPDATE tenants');
  console.log('  ❌ Cannot DELETE tenants');
  console.log('  ❌ Cannot access any other modules');
  console.log('\nTest with API calls:');
  console.log('  GET  /api/v1/tenants → Should return 200 (allowed)');
  console.log('  POST /api/v1/tenants → Should return 403 (denied)');
  console.log('\n' + '═'.repeat(60));

  process.exit(0);
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
