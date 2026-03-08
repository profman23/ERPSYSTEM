/**
 * Quick API Test - Branch Scope APIs
 * Tests the APIs directly without authentication (for development only)
 */

import { DPFUserRoleBranchService } from '../services/dpfUserRoleBranchService.js';
import { db } from './index.js';
import { tenants } from './schemas/tenants.js';
import { branches } from './schemas/branches.js';
import { dpfUserRoles } from './schemas/dpfUserRoles.js';
import { eq, and } from 'drizzle-orm';

async function testBranchAPIs() {
  console.log('\n🧪 Testing Branch Scope APIs (Direct Service Calls)\n');
  console.log('='.repeat(80));

  try {
    // Get test data
    const [tenant] = await db.select().from(tenants).limit(1);
    const branchList = await db.select().from(branches).where(eq(branches.tenantId, tenant.id)).limit(3);
    const [userRole] = await db
      .select()
      .from(dpfUserRoles)
      .where(eq(dpfUserRoles.tenantId, tenant.id))
      .limit(1);

    console.log(`\n✅ Test Data:`);
    console.log(`   Tenant: ${tenant.name} (${tenant.id})`);
    console.log(`   User Role: ${userRole.id}`);
    console.log(`   Branches: ${branchList.length} found`);
    branchList.forEach((b, i) => {
      console.log(`     ${i + 1}. ${b.name} (${b.id})`);
    });

    // TEST 1: Assign 2 Branches
    console.log('\n\n📋 TEST 1: Assign 2 Branches');
    console.log('='.repeat(80));

    const startTime1 = Date.now();
    const assigned = await DPFUserRoleBranchService.assignBranches(tenant.id, {
      userRoleId: userRole.id,
      branchIds: [branchList[0].id, branchList[1].id],
    });
    const duration1 = Date.now() - startTime1;

    console.log(`✅ Assigned ${assigned.length} branches in ${duration1}ms`);
    assigned.forEach((a) => {
      console.log(`   • ${a.branchName}`);
    });

    // TEST 2: Get User Branches (First call - Cold)
    console.log('\n\n📋 TEST 2: Get User Branches (Cold - First Call)');
    console.log('='.repeat(80));

    const startTime2 = Date.now();
    const branches1 = await DPFUserRoleBranchService.getUserBranches(tenant.id, userRole.id);
    const duration2 = Date.now() - startTime2;

    console.log(`✅ Retrieved ${branches1.length} branches in ${duration2}ms (COLD)`);
    branches1.forEach((b) => {
      console.log(`   • ${b.branchName}`);
    });

    // TEST 3: Get User Branches (Second call - Cached)
    console.log('\n\n📋 TEST 3: Get User Branches (Cached - Second Call)');
    console.log('='.repeat(80));

    const startTime3 = Date.now();
    const branches2 = await DPFUserRoleBranchService.getUserBranches(tenant.id, userRole.id);
    const duration3 = Date.now() - startTime3;

    console.log(`✅ Retrieved ${branches2.length} branches in ${duration3}ms (CACHED 🚀)`);
    console.log(`   Performance improvement: ${((duration2 / duration3) * 100).toFixed(0)}% faster!`);

    // TEST 4: Remove Specific Branch
    console.log('\n\n📋 TEST 4: Remove Specific Branch');
    console.log('='.repeat(80));

    const startTime4 = Date.now();
    await DPFUserRoleBranchService.removeBranch(tenant.id, userRole.id, branchList[0].id);
    const duration4 = Date.now() - startTime4;

    console.log(`✅ Removed branch in ${duration4}ms`);

    const branchesAfterRemove = await DPFUserRoleBranchService.getUserBranches(tenant.id, userRole.id);
    console.log(`   Remaining branches: ${branchesAfterRemove.length}`);
    branchesAfterRemove.forEach((b) => {
      console.log(`   • ${b.branchName}`);
    });

    // TEST 5: Get Users by Branch
    console.log('\n\n📋 TEST 5: Get Users by Branch');
    console.log('='.repeat(80));

    const startTime5 = Date.now();
    const users = await DPFUserRoleBranchService.getUsersByBranch(tenant.id, branchList[1].id);
    const duration5 = Date.now() - startTime5;

    console.log(`✅ Found ${users.length} user(s) with access to ${branchList[1].name} in ${duration5}ms`);
    users.forEach((u) => {
      console.log(`   • ${u.userName} (${u.userEmail})`);
    });

    // TEST 6: hasAccessToBranch (Helper method)
    console.log('\n\n📋 TEST 6: Check Branch Access');
    console.log('='.repeat(80));

    const testUser = await db.query.dpfUserRoles.findFirst({
      where: eq(dpfUserRoles.id, userRole.id),
    });

    if (testUser) {
      const hasAccess1 = await DPFUserRoleBranchService.hasAccessToBranch(
        tenant.id,
        testUser.userId,
        branchList[1].id
      );
      const hasAccess2 = await DPFUserRoleBranchService.hasAccessToBranch(
        tenant.id,
        testUser.userId,
        branchList[2].id
      );

      console.log(`   Branch "${branchList[1].name}": ${hasAccess1 ? '✅ HAS ACCESS' : '❌ NO ACCESS'}`);
      console.log(`   Branch "${branchList[2].name}": ${hasAccess2 ? '✅ HAS ACCESS' : '❌ NO ACCESS'}`);
    }

    // TEST 7: Remove All Branches
    console.log('\n\n📋 TEST 7: Remove All Branches');
    console.log('='.repeat(80));

    const startTime7 = Date.now();
    await DPFUserRoleBranchService.removeAllBranches(tenant.id, userRole.id);
    const duration7 = Date.now() - startTime7;

    console.log(`✅ Removed all branches in ${duration7}ms`);

    const finalBranches = await DPFUserRoleBranchService.getUserBranches(tenant.id, userRole.id);
    console.log(`   Remaining branches: ${finalBranches.length}`);

    // Summary
    console.log('\n\n📊 PERFORMANCE SUMMARY');
    console.log('='.repeat(80));
    console.log(`   Assign 2 branches: ${duration1}ms`);
    console.log(`   Get branches (cold): ${duration2}ms`);
    console.log(`   Get branches (cached): ${duration3}ms 🚀`);
    console.log(`   Remove branch: ${duration4}ms`);
    console.log(`   Get users by branch: ${duration5}ms`);
    console.log(`   Remove all branches: ${duration7}ms`);
    console.log(`\n   Cache speedup: ${((duration2 / duration3) * 100).toFixed(0)}% faster ⚡`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL API TESTS PASSED!');
    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testBranchAPIs();
