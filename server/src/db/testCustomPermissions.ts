/**
 * Test Custom Permissions System
 *
 * This script tests the complete custom permissions flow:
 * 1. Create test users with base roles
 * 2. Grant custom permissions (cross-module access)
 * 3. Deny specific permissions (override role permissions)
 * 4. Verify permission resolution engine
 */

import { db } from './index.js';
import { users } from './schemas/users.js';
import { dpfRoles } from './schemas/dpfRoles.js';
import { dpfUserRoles } from './schemas/dpfUserRoles.js';
import { dpfPermissions } from './schemas/dpfPermissions.js';
import { dpfUserCustomPermissions } from './schemas/dpfUserCustomPermissions.js';
import { tenants } from './schemas/tenants.js';
import { eq, and } from 'drizzle-orm';
import { dpfEngine } from '../rbac/dpfEngine.js';

interface TestResult {
  test: string;
  expected: boolean;
  actual: boolean;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

async function testCustomPermissions() {
  console.log('🧪 Starting Custom Permissions Test Suite\n');

  try {
    // Step 1: Get test tenant
    console.log('📋 Step 1: Getting test tenant...');
    const [tenant] = await db.select().from(tenants).limit(1);
    if (!tenant) {
      throw new Error('No tenant found. Please create a tenant first.');
    }
    console.log(`✓ Using tenant: ${tenant.name} (${tenant.id})\n`);

    // Step 2: Get or create test users
    console.log('👥 Step 2: Setting up test users...');

    // Get or create admin user for assignments
    let [adminUser] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, 'admin@test.com'),
        eq(users.tenantId, tenant.id)
      ));

    if (!adminUser) {
      [adminUser] = await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: 'admin@test.com',
          passwordHash: 'test_hash',
          firstName: 'Admin',
          lastName: 'User',
          phoneNumber: '+1234567899',
          isActive: 'true',
        })
        .returning();
      console.log(`✓ Created admin user: ${adminUser.email} (${adminUser.id})`);
    } else {
      console.log(`✓ Admin user: ${adminUser.email} (${adminUser.id})`);
    }

    // Create test user: Omar (Warehouse Manager)
    let [omarUser] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, 'omar.warehouse@test.com'),
        eq(users.tenantId, tenant.id)
      ));

    if (!omarUser) {
      [omarUser] = await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: 'omar.warehouse@test.com',
          passwordHash: 'test_hash',
          firstName: 'Omar',
          lastName: 'Warehouse',
          phoneNumber: '+1234567890',
          isActive: 'true',
        })
        .returning();
      console.log(`✓ Created test user: Omar (${omarUser.id})`);
    } else {
      console.log(`✓ Using existing user: Omar (${omarUser.id})`);
    }

    // Step 3: Get or create Warehouse Manager role
    console.log('\n🎭 Step 3: Setting up Warehouse Manager role...');

    let [warehouseRole] = await db
      .select()
      .from(dpfRoles)
      .where(and(
        eq(dpfRoles.roleCode, 'WAREHOUSE_MANAGER'),
        eq(dpfRoles.tenantId, tenant.id)
      ));

    if (!warehouseRole) {
      [warehouseRole] = await db
        .insert(dpfRoles)
        .values({
          tenantId: tenant.id,
          roleCode: 'WAREHOUSE_MANAGER',
          roleName: 'Warehouse Manager',
          roleNameAr: 'مدير المستودع',
          description: 'Manages warehouse operations',
          roleType: 'CUSTOM',
          roleLevel: 'APP',
          isActive: 'true',
        })
        .returning();
      console.log(`✓ Created Warehouse Manager role (${warehouseRole.id})`);
    } else {
      console.log(`✓ Using existing Warehouse Manager role (${warehouseRole.id})`);
    }

    // Step 4: Assign role to Omar
    console.log('\n🔗 Step 4: Assigning role to Omar...');

    const existingUserRole = await db
      .select()
      .from(dpfUserRoles)
      .where(and(
        eq(dpfUserRoles.userId, omarUser.id),
        eq(dpfUserRoles.tenantId, tenant.id)
      ));

    if (existingUserRole.length === 0) {
      await db.insert(dpfUserRoles).values({
        tenantId: tenant.id,
        userId: omarUser.id,
        roleId: warehouseRole.id,
        assignedScope: 'TENANT',
        assignedBy: adminUser.id,
        isActive: 'true',
      });
      console.log('✓ Assigned Warehouse Manager role to Omar');
    } else {
      console.log('✓ Omar already has a role assigned');
    }

    // Step 5: Get warehouse permissions (WAREHOUSE:*)
    console.log('\n🔑 Step 5: Getting warehouse permissions...');

    const warehousePermissions = await db
      .select()
      .from(dpfPermissions)
      .where(and(
        eq(dpfPermissions.tenantId, tenant.id),
        eq(dpfPermissions.isActive, 'true')
      ))
      .limit(10); // Get sample permissions

    console.log(`✓ Found ${warehousePermissions.length} sample permissions`);

    // Find specific permissions for testing
    const warehouseViewPerm = warehousePermissions.find(p =>
      p.permissionCode?.includes('WAREHOUSE') && p.permissionCode?.includes('VIEW')
    );
    const warehouseCreatePerm = warehousePermissions.find(p =>
      p.permissionCode?.includes('WAREHOUSE') && p.permissionCode?.includes('CREATE')
    );
    const financeViewPerm = warehousePermissions.find(p =>
      p.permissionCode?.includes('FINANCE') && p.permissionCode?.includes('VIEW')
    );

    console.log('\nSample permissions:');
    if (warehouseViewPerm) console.log(`  - ${warehouseViewPerm.permissionCode}`);
    if (warehouseCreatePerm) console.log(`  - ${warehouseCreatePerm.permissionCode}`);
    if (financeViewPerm) console.log(`  - ${financeViewPerm.permissionCode}`);

    // Step 6: Test permission resolution BEFORE custom permissions
    console.log('\n\n🧪 TEST PHASE 1: Base Role Permissions (No Custom Permissions Yet)\n');
    console.log('=' .repeat(80));

    // dpfEngine is already imported as singleton instance

    // We'll test with actual permission codes from the database
    const testPermissions = warehousePermissions.slice(0, 3);

    for (const perm of testPermissions) {
      if (!perm.permissionCode) continue;

      const result = await dpfEngine.checkPermission({
        userId: omarUser.id,
        tenantId: tenant.id,
        permissionCode: perm.permissionCode,
      });

      results.push({
        test: `Omar has ${perm.permissionCode} (via role)`,
        expected: true, // Assuming warehouse role has these permissions
        actual: result.allowed,
        passed: result.allowed === true,
        details: 'Base role permission check'
      });

      console.log(`${result.allowed ? '✓' : '✗'} ${perm.permissionCode}: ${result.allowed ? 'ALLOWED' : 'DENIED'}`);
    }

    // Step 7: Grant custom permission (cross-module access)
    console.log('\n\n🧪 TEST PHASE 2: Grant Custom Permissions (Cross-Module Access)\n');
    console.log('=' .repeat(80));

    if (financeViewPerm) {
      console.log(`\n📝 Granting custom permission: ${financeViewPerm.permissionCode}`);

      // Check if already granted
      const existingGrant = await db
        .select()
        .from(dpfUserCustomPermissions)
        .where(and(
          eq(dpfUserCustomPermissions.userId, omarUser.id),
          eq(dpfUserCustomPermissions.permissionId, financeViewPerm.id),
          eq(dpfUserCustomPermissions.permissionType, 'GRANT')
        ));

      if (existingGrant.length === 0) {
        await db.insert(dpfUserCustomPermissions).values({
          tenantId: tenant.id,
          userId: omarUser.id,
          permissionId: financeViewPerm.id,
          permissionType: 'GRANT',
          assignedBy: adminUser.id,
          reason: 'Testing custom grant permission - Omar needs finance view access',
          isActive: 'true',
        });
        console.log('✓ Custom permission granted');
      } else {
        console.log('✓ Custom permission already granted');
      }

      // Clear cache
      await dpfEngine.invalidateUserPermissions(omarUser.id, tenant.id);

      // Test the granted permission
      const financeViewResult = await dpfEngine.checkPermission({
        userId: omarUser.id,
        tenantId: tenant.id,
        permissionCode: financeViewPerm.permissionCode,
      });

      results.push({
        test: `Omar has ${financeViewPerm.permissionCode} (via GRANT)`,
        expected: true,
        actual: financeViewResult.allowed,
        passed: financeViewResult.allowed === true,
        details: 'Custom GRANT permission should allow access'
      });

      console.log(`\n${financeViewResult.allowed ? '✅' : '❌'} Test: ${financeViewPerm.permissionCode}`);
      console.log(`   Expected: ALLOWED (custom GRANT)`);
      console.log(`   Actual: ${financeViewResult.allowed ? 'ALLOWED' : 'DENIED'}`);
      console.log(`   Result: ${financeViewResult.allowed ? 'PASSED ✓' : 'FAILED ✗'}`);
    }

    // Step 8: Deny custom permission (override role permission)
    console.log('\n\n🧪 TEST PHASE 3: Deny Custom Permissions (Override Role)\n');
    console.log('=' .repeat(80));

    if (warehouseCreatePerm) {
      console.log(`\n🚫 Denying permission: ${warehouseCreatePerm.permissionCode}`);

      // Check if already denied
      const existingDeny = await db
        .select()
        .from(dpfUserCustomPermissions)
        .where(and(
          eq(dpfUserCustomPermissions.userId, omarUser.id),
          eq(dpfUserCustomPermissions.permissionId, warehouseCreatePerm.id),
          eq(dpfUserCustomPermissions.permissionType, 'DENY')
        ));

      if (existingDeny.length === 0) {
        await db.insert(dpfUserCustomPermissions).values({
          tenantId: tenant.id,
          userId: omarUser.id,
          permissionId: warehouseCreatePerm.id,
          permissionType: 'DENY',
          assignedBy: adminUser.id,
          reason: 'Testing custom deny permission - Remove create access from Omar',
          isActive: 'true',
        });
        console.log('✓ Permission denied (override role)');
      } else {
        console.log('✓ Permission already denied');
      }

      // Clear cache
      await dpfEngine.invalidateUserPermissions(omarUser.id, tenant.id);

      // Test the denied permission
      const warehouseCreateResult = await dpfEngine.checkPermission({
        userId: omarUser.id,
        tenantId: tenant.id,
        permissionCode: warehouseCreatePerm.permissionCode,
      });

      results.push({
        test: `Omar has ${warehouseCreatePerm.permissionCode} (with DENY)`,
        expected: false,
        actual: warehouseCreateResult.allowed,
        passed: warehouseCreateResult.allowed === false,
        details: 'Custom DENY should override role permission'
      });

      console.log(`\n${!warehouseCreateResult.allowed ? '✅' : '❌'} Test: ${warehouseCreatePerm.permissionCode}`);
      console.log(`   Expected: DENIED (custom DENY overrides role)`);
      console.log(`   Actual: ${warehouseCreateResult.allowed ? 'ALLOWED' : 'DENIED'}`);
      console.log(`   Result: ${!warehouseCreateResult.allowed ? 'PASSED ✓' : 'FAILED ✗'}`);
    }

    // Step 9: Get all custom permissions for Omar
    console.log('\n\n📊 Step 9: Omar\'s Custom Permissions Summary\n');
    console.log('=' .repeat(80));

    const omarCustomPerms = await db
      .select({
        customPerm: dpfUserCustomPermissions,
        permission: dpfPermissions,
      })
      .from(dpfUserCustomPermissions)
      .leftJoin(dpfPermissions, eq(dpfUserCustomPermissions.permissionId, dpfPermissions.id))
      .where(and(
        eq(dpfUserCustomPermissions.userId, omarUser.id),
        eq(dpfUserCustomPermissions.tenantId, tenant.id),
        eq(dpfUserCustomPermissions.isActive, 'true')
      ));

    console.log(`\nTotal Custom Permissions: ${omarCustomPerms.length}\n`);

    const grants = omarCustomPerms.filter(cp => cp.customPerm.permissionType === 'GRANT');
    const denials = omarCustomPerms.filter(cp => cp.customPerm.permissionType === 'DENY');

    console.log(`✅ GRANTED (${grants.length}):`);
    grants.forEach(cp => {
      console.log(`   + ${cp.permission?.permissionCode || 'UNKNOWN'}`);
      console.log(`     Reason: ${cp.customPerm.reason || 'N/A'}`);
    });

    console.log(`\n🚫 DENIED (${denials.length}):`);
    denials.forEach(cp => {
      console.log(`   - ${cp.permission?.permissionCode || 'UNKNOWN'}`);
      console.log(`     Reason: ${cp.customPerm.reason || 'N/A'}`);
    });

    // Step 10: Test Results Summary
    console.log('\n\n📈 TEST RESULTS SUMMARY\n');
    console.log('=' .repeat(80));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log(`\nTotal Tests: ${total}`);
    console.log(`Passed: ${passed} ✓`);
    console.log(`Failed: ${failed} ✗`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`\n  • ${r.test}`);
        console.log(`    Expected: ${r.expected}`);
        console.log(`    Actual: ${r.actual}`);
        console.log(`    Details: ${r.details || 'N/A'}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 Custom Permissions Test Suite Complete!');
    console.log('='.repeat(80) + '\n');

    // Summary of the permission model
    console.log('\n📚 PERMISSION MODEL SUMMARY:\n');
    console.log('Formula: effectivePermissions = rolePermissions + customGrants - customDenials\n');
    console.log('Example (Omar):');
    console.log('  Base Role: Warehouse Manager');
    console.log('  + Role Permissions: WAREHOUSE:* (all warehouse actions)');
    console.log('  + Custom GRANT: FINANCE:ACCOUNTS:VIEW (cross-module access)');
    console.log('  - Custom DENY: WAREHOUSE:ITEMS:DELETE (override role)');
    console.log('  = Effective Permissions: All warehouse actions EXCEPT delete + Finance view\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Run tests
testCustomPermissions();
