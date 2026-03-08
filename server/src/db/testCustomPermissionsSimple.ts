/**
 * Simplified Custom Permissions Test
 *
 * Tests the custom GRANT and DENY functionality with existing system data
 */

import { db } from './index.js';
import { users } from './schemas/users.js';
import { dpfRoles } from './schemas/dpfRoles.js';
import { dpfUserRoles } from './schemas/dpfUserRoles.js';
import { dpfPermissions } from './schemas/dpfPermissions.js';
import { dpfRolePermissions } from './schemas/dpfRolePermissions.js';
import { dpfUserCustomPermissions } from './schemas/dpfUserCustomPermissions.js';
import { tenants } from './schemas/tenants.js';
import { eq, and } from 'drizzle-orm';
import { dpfEngine } from '../rbac/dpfEngine.js';

async function testCustomPermissions() {
  console.log('\n🧪 Simplified Custom Permissions Test\n');
  console.log('='.repeat(80));

  try {
    // Step 1: Get test tenant
    const [tenant] = await db.select().from(tenants).limit(1);
    if (!tenant) {
      throw new Error('No tenant found');
    }
    console.log(`\n✓ Tenant: ${tenant.name}`);

    // Step 2: Get existing permissions
    const permissions = await db
      .select()
      .from(dpfPermissions)
      .where(eq(dpfPermissions.tenantId, tenant.id))
      .limit(5);

    if (permissions.length < 3) {
      console.log('\n❌ Not enough permissions in database. Need at least 3 permissions.');
      console.log('   Run the DPF structure sync first to populate permissions.');
      process.exit(1);
    }

    console.log(`✓ Found ${permissions.length} test permissions`);
    permissions.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.permissionCode}`);
    });

    const [perm1, perm2, perm3] = permissions;

    // Step 3: Get or create test user
    let [testUser] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, 'test@example.com'),
        eq(users.tenantId, tenant.id)
      ));

    if (!testUser) {
      [testUser] = await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: 'test@example.com',
          passwordHash: 'hash',
          firstName: 'Test',
          lastName: 'User',
          phoneNumber: '+1234567890',
          isActive: 'true',
        })
        .returning();
      console.log(`\n✓ Created test user: ${testUser.email}`);
    } else {
      console.log(`\n✓ Test user: ${testUser.email}`);
    }

    // Step 4: Get or create test role
    let [testRole] = await db
      .select()
      .from(dpfRoles)
      .where(and(
        eq(dpfRoles.roleCode, 'TEST_ROLE'),
        eq(dpfRoles.tenantId, tenant.id)
      ));

    if (!testRole) {
      [testRole] = await db
        .insert(dpfRoles)
        .values({
          tenantId: tenant.id,
          roleCode: 'TEST_ROLE',
          roleName: 'Test Role',
          roleNameAr: 'دور اختبار',
          roleType: 'CUSTOM',
          roleLevel: 'APP',
          isActive: 'true',
        })
        .returning();
      console.log(`✓ Created test role: ${testRole.roleName}`);
    } else {
      console.log(`✓ Test role: ${testRole.roleName}`);
    }

    // Step 5: Assign role to user
    const existingUserRole = await db
      .select()
      .from(dpfUserRoles)
      .where(and(
        eq(dpfUserRoles.userId, testUser.id),
        eq(dpfUserRoles.tenantId, tenant.id)
      ));

    if (existingUserRole.length === 0) {
      await db.insert(dpfUserRoles).values({
        tenantId: tenant.id,
        userId: testUser.id,
        roleId: testRole.id,
        assignedScope: 'TENANT',
        assignedBy: testUser.id,
        isActive: 'true',
      });
      console.log(`✓ Assigned role to user`);
    } else {
      console.log(`✓ User already has role`);
    }

    // Step 6: Assign permission 1 to role (base permission)
    const existingRolePerm = await db
      .select()
      .from(dpfRolePermissions)
      .where(and(
        eq(dpfRolePermissions.roleId, testRole.id),
        eq(dpfRolePermissions.permissionId, perm1.id)
      ));

    if (existingRolePerm.length === 0) {
      await db.insert(dpfRolePermissions).values({
        tenantId: tenant.id,
        roleId: testRole.id,
        permissionId: perm1.id,
      });
      console.log(`✓ Assigned ${perm1.permissionCode} to role`);
    } else {
      console.log(`✓ Role already has ${perm1.permissionCode}`);
    }

    // Clear cache before testing
    await dpfEngine.invalidateUserPermissions(testUser.id, tenant.id);

    // Clean up any existing custom permissions that might interfere with TEST 1
    console.log(`\nCleaning up any existing DENY for ${perm1.permissionCode}...`);
    await db
      .delete(dpfUserCustomPermissions)
      .where(and(
        eq(dpfUserCustomPermissions.userId, testUser.id),
        eq(dpfUserCustomPermissions.permissionId, perm1.id),
        eq(dpfUserCustomPermissions.permissionType, 'DENY')
      ));
    await dpfEngine.invalidateUserPermissions(testUser.id, tenant.id);

    // ========== TEST 1: Base Role Permission ==========
    console.log('\n\n📋 TEST 1: Base Role Permission');
    console.log('='.repeat(80));

    const test1Result = await dpfEngine.checkPermission({
      userId: testUser.id,
      tenantId: tenant.id,
      permissionCode: perm1.permissionCode!,
    });

    console.log(`Permission: ${perm1.permissionCode}`);
    console.log(`Expected: ALLOWED (via role)`);
    console.log(`Actual: ${test1Result.granted ? 'ALLOWED ✓' : 'DENIED ✗'}`);
    console.log(`Reason: ${test1Result.reason}`);
    console.log(`Result: ${test1Result.granted ? '✅ PASSED' : '❌ FAILED'}`);

    const test1Passed = test1Result.granted === true;

    // ========== TEST 2: Grant Custom Permission (Cross-Role Access) ==========
    console.log('\n\n📋 TEST 2: Grant Custom Permission');
    console.log('='.repeat(80));

    console.log(`\nGranting custom permission: ${perm2.permissionCode}`);

    // Check if already granted
    const existingGrant = await db
      .select()
      .from(dpfUserCustomPermissions)
      .where(and(
        eq(dpfUserCustomPermissions.userId, testUser.id),
        eq(dpfUserCustomPermissions.permissionId, perm2.id),
        eq(dpfUserCustomPermissions.permissionType, 'GRANT')
      ));

    if (existingGrant.length === 0) {
      await db.insert(dpfUserCustomPermissions).values({
        tenantId: tenant.id,
        userId: testUser.id,
        permissionId: perm2.id,
        permissionType: 'GRANT',
        assignedBy: testUser.id,
        reason: 'Testing custom GRANT - User needs cross-module access',
        isActive: 'true',
      });
      console.log('✓ Custom permission granted');
    } else {
      console.log('✓ Custom permission already granted');
    }

    // Clear cache
    await dpfEngine.invalidateUserPermissions(testUser.id, tenant.id);

    const test2Result = await dpfEngine.checkPermission({
      userId: testUser.id,
      tenantId: tenant.id,
      permissionCode: perm2.permissionCode!,
    });

    console.log(`\nPermission: ${perm2.permissionCode}`);
    console.log(`Expected: ALLOWED (via custom GRANT)`);
    console.log(`Actual: ${test2Result.granted ? 'ALLOWED ✓' : 'DENIED ✗'}`);
    console.log(`Reason: ${test2Result.reason}`);
    console.log(`Result: ${test2Result.granted ? '✅ PASSED' : '❌ FAILED'}`);

    const test2Passed = test2Result.granted === true;

    // ========== TEST 3: Deny Custom Permission (Override Role) ==========
    console.log('\n\n📋 TEST 3: Deny Custom Permission (Override Role)');
    console.log('='.repeat(80));

    console.log(`\nDenying permission: ${perm1.permissionCode}`);

    // Check if already denied
    const existingDeny = await db
      .select()
      .from(dpfUserCustomPermissions)
      .where(and(
        eq(dpfUserCustomPermissions.userId, testUser.id),
        eq(dpfUserCustomPermissions.permissionId, perm1.id),
        eq(dpfUserCustomPermissions.permissionType, 'DENY')
      ));

    if (existingDeny.length === 0) {
      await db.insert(dpfUserCustomPermissions).values({
        tenantId: tenant.id,
        userId: testUser.id,
        permissionId: perm1.id,
        permissionType: 'DENY',
        assignedBy: testUser.id,
        reason: 'Testing custom DENY - Override role permission',
        isActive: 'true',
      });
      console.log('✓ Permission denied (override)');
    } else {
      console.log('✓ Permission already denied');
    }

    // Clear cache
    await dpfEngine.invalidateUserPermissions(testUser.id, tenant.id);

    const test3Result = await dpfEngine.checkPermission({
      userId: testUser.id,
      tenantId: tenant.id,
      permissionCode: perm1.permissionCode!,
    });

    console.log(`\nPermission: ${perm1.permissionCode}`);
    console.log(`Expected: DENIED (custom DENY overrides role)`);
    console.log(`Actual: ${test3Result.granted ? 'ALLOWED ✗' : 'DENIED ✓'}`);
    console.log(`Reason: ${test3Result.reason}`);
    console.log(`Result: ${!test3Result.granted ? '✅ PASSED' : '❌ FAILED'}`);

    const test3Passed = test3Result.granted === false;

    // ========== TEST 4: Verify Permission Without Grant/Deny ==========
    console.log('\n\n📋 TEST 4: Permission Without Custom Overrides');
    console.log('='.repeat(80));

    const test4Result = await dpfEngine.checkPermission({
      userId: testUser.id,
      tenantId: tenant.id,
      permissionCode: perm3.permissionCode!,
    });

    console.log(`Permission: ${perm3.permissionCode}`);
    console.log(`Expected: DENIED (not in role, no custom grant)`);
    console.log(`Actual: ${test4Result.granted ? 'ALLOWED ✗' : 'DENIED ✓'}`);
    console.log(`Reason: ${test4Result.reason}`);
    console.log(`Result: ${!test4Result.granted ? '✅ PASSED' : '❌ FAILED'}`);

    const test4Passed = test4Result.granted === false;

    // ========== Summary ==========
    console.log('\n\n📊 TEST SUMMARY');
    console.log('='.repeat(80));

    const allTests = [
      { name: 'Base Role Permission', passed: test1Passed },
      { name: 'Custom GRANT Permission', passed: test2Passed },
      { name: 'Custom DENY Override', passed: test3Passed },
      { name: 'No Access (Control)', passed: test4Passed },
    ];

    const passedCount = allTests.filter(t => t.passed).length;
    const totalCount = allTests.length;

    console.log(`\nTotal Tests: ${totalCount}`);
    console.log(`Passed: ${passedCount} ✓`);
    console.log(`Failed: ${totalCount - passedCount} ✗`);
    console.log(`Success Rate: ${((passedCount / totalCount) * 100).toFixed(1)}%\n`);

    allTests.forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.passed ? '✅' : '❌'} ${test.name}`);
    });

    // ========== Custom Permissions List ==========
    console.log('\n\n📋 User Custom Permissions');
    console.log('='.repeat(80));

    const customPerms = await db
      .select({
        customPerm: dpfUserCustomPermissions,
        permission: dpfPermissions,
      })
      .from(dpfUserCustomPermissions)
      .leftJoin(dpfPermissions, eq(dpfUserCustomPermissions.permissionId, dpfPermissions.id))
      .where(and(
        eq(dpfUserCustomPermissions.userId, testUser.id),
        eq(dpfUserCustomPermissions.isActive, 'true')
      ));

    const grants = customPerms.filter(cp => cp.customPerm.permissionType === 'GRANT');
    const denials = customPerms.filter(cp => cp.customPerm.permissionType === 'DENY');

    console.log(`\n✅ GRANTED (${grants.length}):`);
    grants.forEach(cp => {
      console.log(`   + ${cp.permission?.permissionCode}`);
      console.log(`     ${cp.customPerm.reason}`);
    });

    console.log(`\n🚫 DENIED (${denials.length}):`);
    denials.forEach(cp => {
      console.log(`   - ${cp.permission?.permissionCode}`);
      console.log(`     ${cp.customPerm.reason}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(passedCount === totalCount ? '✅ ALL TESTS PASSED!' : `❌ ${totalCount - passedCount} TEST(S) FAILED`);
    console.log('='.repeat(80) + '\n');

    console.log('\n💡 Permission Model Formula:');
    console.log('   effectivePermissions = rolePermissions + customGrants - customDenials\n');

    process.exit(passedCount === totalCount ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testCustomPermissions();
