/**
 * Quick Script to Get Test IDs
 *
 * Run this to get all IDs you need for API testing
 */

import { db } from './index.js';
import { tenants } from './schemas/tenants.js';
import { branches } from './schemas/branches.js';
import { users } from './schemas/users.js';
import { dpfUserRoles } from './schemas/dpfUserRoles.js';
import { dpfRoles } from './schemas/dpfRoles.js';
import { eq, and } from 'drizzle-orm';

async function getTestIds() {
  console.log('\n📋 Getting Test IDs for API Testing\n');
  console.log('='.repeat(80));

  try {
    // Get tenant
    const [tenant] = await db.select().from(tenants).limit(1);
    if (!tenant) {
      console.log('❌ No tenant found. Please create a tenant first.');
      process.exit(1);
    }

    console.log('\n✅ TENANT INFO:');
    console.log(`   Name: ${tenant.name}`);
    console.log(`   ID: ${tenant.id}`);
    console.log(`   tenantId="${tenant.id}"`);

    // Get branches
    const branchList = await db
      .select()
      .from(branches)
      .where(eq(branches.tenantId, tenant.id))
      .limit(3);

    console.log('\n✅ BRANCHES:');
    if (branchList.length === 0) {
      console.log('   ⚠️  No branches found. Please create branches first.');
    } else {
      branchList.forEach((branch, i) => {
        console.log(`   ${i + 1}. ${branch.name}`);
        console.log(`      ID: ${branch.id}`);
        console.log(`      branch${i + 1}Id="${branch.id}"`);
      });
    }

    // Get test user
    const [testUser] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, 'branch-test@example.com'),
        eq(users.tenantId, tenant.id)
      ));

    console.log('\n✅ TEST USER:');
    if (!testUser) {
      console.log('   ⚠️  Test user not found. Run testBranchScope.ts first.');
    } else {
      console.log(`   Email: ${testUser.email}`);
      console.log(`   Name: ${testUser.firstName} ${testUser.lastName}`);
      console.log(`   ID: ${testUser.id}`);
      console.log(`   userId="${testUser.id}"`);

      // Get user's role
      const userRoleResult = await db
        .select({
          userRole: dpfUserRoles,
          role: dpfRoles,
        })
        .from(dpfUserRoles)
        .leftJoin(dpfRoles, eq(dpfUserRoles.roleId, dpfRoles.id))
        .where(and(
          eq(dpfUserRoles.userId, testUser.id),
          eq(dpfUserRoles.tenantId, tenant.id)
        ))
        .limit(1);

      const userRole = userRoleResult[0];

      if (userRole) {
        console.log('\n✅ USER ROLE:');
        console.log(`   Role: ${userRole.role?.roleName || 'Unknown'}`);
        console.log(`   ID: ${userRole.userRole.id}`);
        console.log(`   userRoleId="${userRole.userRole.id}"`);
      } else {
        console.log('\n   ⚠️  No role assigned. Run testBranchScope.ts first.');
      }
    }

    // Get all roles (for reference)
    const roles = await db
      .select()
      .from(dpfRoles)
      .where(eq(dpfRoles.tenantId, tenant.id))
      .limit(5);

    console.log('\n✅ AVAILABLE ROLES:');
    roles.forEach((role, i) => {
      console.log(`   ${i + 1}. ${role.roleName}`);
      console.log(`      Code: ${role.roleCode}`);
      console.log(`      ID: ${role.id}`);
    });

    // Summary for easy copy-paste
    console.log('\n\n📋 COPY-PASTE FOR POSTMAN/THUNDER CLIENT:');
    console.log('='.repeat(80));
    console.log('\nEnvironment Variables:');
    console.log('```');
    console.log(`baseUrl = http://localhost:3000`);
    console.log(`tenantId = ${tenant.id}`);
    if (branchList.length > 0) {
      console.log(`branch1Id = ${branchList[0].id}`);
    }
    if (branchList.length > 1) {
      console.log(`branch2Id = ${branchList[1].id}`);
    }
    if (branchList.length > 2) {
      console.log(`branch3Id = ${branchList[2].id}`);
    }
    if (testUser) {
      console.log(`userId = ${testUser.id}`);
      const userRoleResults = await db
        .select()
        .from(dpfUserRoles)
        .where(and(
          eq(dpfUserRoles.userId, testUser.id),
          eq(dpfUserRoles.tenantId, tenant.id)
        ))
        .limit(1);
      if (userRoleResults.length > 0) {
        console.log(`userRoleId = ${userRoleResults[0].id}`);
      }
    }
    console.log('authToken = YOUR_AUTH_TOKEN_HERE (from login)');
    console.log('```');

    console.log('\n' + '='.repeat(80));
    console.log('✅ All IDs retrieved successfully!');
    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

getTestIds();
