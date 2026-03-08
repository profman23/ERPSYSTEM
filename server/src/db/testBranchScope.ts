/**
 * Test Branch Scope Functionality
 *
 * Tests the complete branch-level access control:
 * 1. Create test user with role
 * 2. Create test branches
 * 3. Assign branches to user
 * 4. Test permission checks with branchId
 * 5. Verify branch access restrictions
 */

import { db } from './index.js';
import { users } from './schemas/users.js';
import { dpfRoles } from './schemas/dpfRoles.js';
import { dpfUserRoles } from './schemas/dpfUserRoles.js';
import { dpfPermissions } from './schemas/dpfPermissions.js';
import { dpfRolePermissions } from './schemas/dpfRolePermissions.js';
import { dpfUserRoleBranches } from './schemas/dpfUserRoleBranches.js';
import { tenants } from './schemas/tenants.js';
import { branches } from './schemas/branches.js';
import { businessLines } from './schemas/businessLines.js';
import { eq, and } from 'drizzle-orm';
import { dpfEngine } from '../rbac/dpfEngine.js';
import { DPFUserRoleBranchService } from '../services/dpfUserRoleBranchService.js';

async function testBranchScope() {
  console.log('\n🧪 Branch Scope Functionality Test\n');
  console.log('='.repeat(80));

  try {
    // Step 1: Get test tenant
    const [tenant] = await db.select().from(tenants).limit(1);
    if (!tenant) {
      throw new Error('No tenant found');
    }
    console.log(`\n✓ Tenant: ${tenant.name}`);

    // Step 2: Get or create business line
    let [businessLine] = await db
      .select()
      .from(businessLines)
      .where(eq(businessLines.tenantId, tenant.id))
      .limit(1);

    if (!businessLine) {
      [businessLine] = await db
        .insert(businessLines)
        .values({
          tenantId: tenant.id,
          code: 'BL001',
          name: 'Test Business Line',
          nameAr: 'خط عمل اختبار',
        })
        .returning();
      console.log(`✓ Created business line: ${businessLine.name}`);
    } else {
      console.log(`✓ Business line: ${businessLine.name}`);
    }

    // Step 3: Create test branches
    console.log('\n📍 Creating test branches...');

    let [branch1] = await db
      .select()
      .from(branches)
      .where(and(
        eq(branches.code, 'BR001'),
        eq(branches.tenantId, tenant.id)
      ));

    if (!branch1) {
      [branch1] = await db
        .insert(branches)
        .values({
          tenantId: tenant.id,
          businessLineId: businessLine.id,
          code: 'BR001',
          name: 'Branch 1',
          nameAr: 'الفرع 1',
        })
        .returning();
      console.log(`  ✓ Created: ${branch1.name}`);
    } else {
      console.log(`  ✓ Exists: ${branch1.name}`);
    }

    let [branch2] = await db
      .select()
      .from(branches)
      .where(and(
        eq(branches.code, 'BR002'),
        eq(branches.tenantId, tenant.id)
      ));

    if (!branch2) {
      [branch2] = await db
        .insert(branches)
        .values({
          tenantId: tenant.id,
          businessLineId: businessLine.id,
          code: 'BR002',
          name: 'Branch 2',
          nameAr: 'الفرع 2',
        })
        .returning();
      console.log(`  ✓ Created: ${branch2.name}`);
    } else {
      console.log(`  ✓ Exists: ${branch2.name}`);
    }

    let [branch3] = await db
      .select()
      .from(branches)
      .where(and(
        eq(branches.code, 'BR003'),
        eq(branches.tenantId, tenant.id)
      ));

    if (!branch3) {
      [branch3] = await db
        .insert(branches)
        .values({
          tenantId: tenant.id,
          businessLineId: businessLine.id,
          code: 'BR003',
          name: 'Branch 3',
          nameAr: 'الفرع 3',
        })
        .returning();
      console.log(`  ✓ Created: ${branch3.name}`);
    } else {
      console.log(`  ✓ Exists: ${branch3.name}`);
    }

    // Step 4: Get or create test user
    console.log('\n👤 Setting up test user...');

    let [testUser] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, 'branch-test@example.com'),
        eq(users.tenantId, tenant.id)
      ));

    if (!testUser) {
      [testUser] = await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: 'branch-test@example.com',
          passwordHash: 'hash',
          firstName: 'Branch',
          lastName: 'Test',
          phoneNumber: '+1234567890',
          isActive: 'true',
        })
        .returning();
      console.log(`✓ Created test user: ${testUser.email}`);
    } else {
      console.log(`✓ Test user: ${testUser.email}`);
    }

    // Step 5: Get or create test role
    console.log('\n🎭 Setting up test role...');

    let [testRole] = await db
      .select()
      .from(dpfRoles)
      .where(and(
        eq(dpfRoles.roleCode, 'BRANCH_TEST_ROLE'),
        eq(dpfRoles.tenantId, tenant.id)
      ));

    if (!testRole) {
      [testRole] = await db
        .insert(dpfRoles)
        .values({
          tenantId: tenant.id,
          roleCode: 'BRANCH_TEST_ROLE',
          roleName: 'Branch Test Role',
          roleNameAr: 'دور اختبار الفرع',
          roleType: 'CUSTOM',
          roleLevel: 'APP',
          isActive: 'true',
        })
        .returning();
      console.log(`✓ Created test role: ${testRole.roleName}`);
    } else {
      console.log(`✓ Test role: ${testRole.roleName}`);
    }

    // Step 6: Assign role to user
    console.log('\n🔗 Assigning role to user...');

    const existingUserRole = await db
      .select()
      .from(dpfUserRoles)
      .where(and(
        eq(dpfUserRoles.userId, testUser.id),
        eq(dpfUserRoles.tenantId, tenant.id)
      ));

    let userRole;
    if (existingUserRole.length === 0) {
      [userRole] = await db.insert(dpfUserRoles).values({
        tenantId: tenant.id,
        userId: testUser.id,
        roleId: testRole.id,
        assignedScope: 'TENANT',
        assignedBy: testUser.id,
        isActive: 'true',
      }).returning();
      console.log(`✓ Assigned role to user`);
    } else {
      userRole = existingUserRole[0];
      console.log(`✓ User already has role`);
    }

    // Step 7: Get test permission
    console.log('\n🔑 Getting test permission...');

    const [testPermission] = await db
      .select()
      .from(dpfPermissions)
      .where(eq(dpfPermissions.tenantId, tenant.id))
      .limit(1);

    if (!testPermission) {
      throw new Error('No permissions found. Please sync DPF structure first.');
    }

    console.log(`✓ Test permission: ${testPermission.permissionCode}`);

    // Step 8: Assign permission to role
    console.log('\n📋 Assigning permission to role...');

    const existingRolePerm = await db
      .select()
      .from(dpfRolePermissions)
      .where(and(
        eq(dpfRolePermissions.roleId, testRole.id),
        eq(dpfRolePermissions.permissionId, testPermission.id)
      ));

    if (existingRolePerm.length === 0) {
      await db.insert(dpfRolePermissions).values({
        tenantId: tenant.id,
        roleId: testRole.id,
        permissionId: testPermission.id,
      });
      console.log(`✓ Permission assigned to role`);
    } else {
      console.log(`✓ Permission already assigned`);
    }

    // Clear cache
    await dpfEngine.invalidateUserPermissions(testUser.id, tenant.id);

    // Clean up any existing branch assignments from previous test runs
    console.log('\n🧹 Cleaning up old branch assignments...');
    await DPFUserRoleBranchService.removeAllBranches(tenant.id, userRole.id);
    console.log('✓ Old assignments removed');

    // ========== TEST 1: Permission check WITHOUT branch restriction ==========
    console.log('\n\n📋 TEST 1: Permission Check WITHOUT Branch Restriction');
    console.log('='.repeat(80));

    const test1Result = await dpfEngine.checkPermission({
      userId: testUser.id,
      tenantId: tenant.id,
      permissionCode: testPermission.permissionCode!,
    });

    console.log(`Permission: ${testPermission.permissionCode}`);
    console.log(`Expected: ALLOWED (user has permission via role)`);
    console.log(`Actual: ${test1Result.granted ? 'ALLOWED ✓' : 'DENIED ✗'}`);
    console.log(`Reason: ${test1Result.reason}`);
    console.log(`Result: ${test1Result.granted ? '✅ PASSED' : '❌ FAILED'}`);

    const test1Passed = test1Result.granted === true;

    // ========== TEST 2: Permission check WITH branch restriction (NO access) ==========
    console.log('\n\n📋 TEST 2: Permission Check WITH Branch Restriction (No Access Yet)');
    console.log('='.repeat(80));

    const test2Result = await dpfEngine.checkPermission({
      userId: testUser.id,
      tenantId: tenant.id,
      permissionCode: testPermission.permissionCode!,
      branchId: branch1.id,
    });

    console.log(`Permission: ${testPermission.permissionCode}`);
    console.log(`Branch: ${branch1.name}`);
    console.log(`Expected: DENIED (user has permission but no branch access)`);
    console.log(`Actual: ${test2Result.granted ? 'ALLOWED ✗' : 'DENIED ✓'}`);
    console.log(`Reason: ${test2Result.reason}`);
    console.log(`Result: ${!test2Result.granted ? '✅ PASSED' : '❌ FAILED'}`);

    const test2Passed = test2Result.granted === false;

    // ========== SETUP: Assign branches to user ==========
    console.log('\n\n🔧 SETUP: Assigning Branches to User');
    console.log('='.repeat(80));

    console.log(`\nAssigning branches: ${branch1.name}, ${branch2.name} (NOT ${branch3.name})`);

    await DPFUserRoleBranchService.assignBranches(tenant.id, {
      userRoleId: userRole.id,
      branchIds: [branch1.id, branch2.id], // Only branches 1 and 2
    });

    console.log('✓ Branches assigned successfully');

    // Verify assignments
    const assignments = await DPFUserRoleBranchService.getUserBranches(tenant.id, userRole.id);
    console.log(`\n✓ User has access to ${assignments.length} branch(es):`);
    assignments.forEach(a => {
      console.log(`   • ${a.branchName}`);
    });

    // ========== TEST 3: Permission check WITH branch restriction (Branch 1 - HAS access) ==========
    console.log('\n\n📋 TEST 3: Permission Check WITH Branch Restriction (Branch 1 - Has Access)');
    console.log('='.repeat(80));

    const test3Result = await dpfEngine.checkPermission({
      userId: testUser.id,
      tenantId: tenant.id,
      permissionCode: testPermission.permissionCode!,
      branchId: branch1.id,
    });

    console.log(`Permission: ${testPermission.permissionCode}`);
    console.log(`Branch: ${branch1.name}`);
    console.log(`Expected: ALLOWED (user has both permission and branch access)`);
    console.log(`Actual: ${test3Result.granted ? 'ALLOWED ✓' : 'DENIED ✗'}`);
    console.log(`Reason: ${test3Result.reason}`);
    console.log(`Result: ${test3Result.granted ? '✅ PASSED' : '❌ FAILED'}`);

    const test3Passed = test3Result.granted === true;

    // ========== TEST 4: Permission check WITH branch restriction (Branch 2 - HAS access) ==========
    console.log('\n\n📋 TEST 4: Permission Check WITH Branch Restriction (Branch 2 - Has Access)');
    console.log('='.repeat(80));

    const test4Result = await dpfEngine.checkPermission({
      userId: testUser.id,
      tenantId: tenant.id,
      permissionCode: testPermission.permissionCode!,
      branchId: branch2.id,
    });

    console.log(`Permission: ${testPermission.permissionCode}`);
    console.log(`Branch: ${branch2.name}`);
    console.log(`Expected: ALLOWED (user has both permission and branch access)`);
    console.log(`Actual: ${test4Result.granted ? 'ALLOWED ✓' : 'DENIED ✗'}`);
    console.log(`Reason: ${test4Result.reason}`);
    console.log(`Result: ${test4Result.granted ? '✅ PASSED' : '❌ FAILED'}`);

    const test4Passed = test4Result.granted === true;

    // ========== TEST 5: Permission check WITH branch restriction (Branch 3 - NO access) ==========
    console.log('\n\n📋 TEST 5: Permission Check WITH Branch Restriction (Branch 3 - No Access)');
    console.log('='.repeat(80));

    const test5Result = await dpfEngine.checkPermission({
      userId: testUser.id,
      tenantId: tenant.id,
      permissionCode: testPermission.permissionCode!,
      branchId: branch3.id,
    });

    console.log(`Permission: ${testPermission.permissionCode}`);
    console.log(`Branch: ${branch3.name}`);
    console.log(`Expected: DENIED (user has permission but NOT assigned to this branch)`);
    console.log(`Actual: ${test5Result.granted ? 'ALLOWED ✗' : 'DENIED ✓'}`);
    console.log(`Reason: ${test5Result.reason}`);
    console.log(`Result: ${!test5Result.granted ? '✅ PASSED' : '❌ FAILED'}`);

    const test5Passed = test5Result.granted === false;

    // ========== Summary ==========
    console.log('\n\n📊 TEST SUMMARY');
    console.log('='.repeat(80));

    const allTests = [
      { name: 'Permission Without Branch', passed: test1Passed },
      { name: 'Permission + Branch (No Access)', passed: test2Passed },
      { name: 'Permission + Branch 1 (Has Access)', passed: test3Passed },
      { name: 'Permission + Branch 2 (Has Access)', passed: test4Passed },
      { name: 'Permission + Branch 3 (No Access)', passed: test5Passed },
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

    console.log('\n' + '='.repeat(80));
    console.log(passedCount === totalCount ? '✅ ALL TESTS PASSED!' : `❌ ${totalCount - passedCount} TEST(S) FAILED`);
    console.log('='.repeat(80) + '\n');

    console.log('\n💡 Branch Scope Model:');
    console.log('   User has permission → Can perform action');
    console.log('   User has permission + assigned to branch → Can perform action on that branch');
    console.log('   User has permission + NOT assigned to branch → CANNOT perform action on that branch\n');

    process.exit(passedCount === totalCount ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testBranchScope();
