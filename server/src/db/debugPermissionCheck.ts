/**
 * Debug script to trace through the exact permission check logic
 */

import { db } from './index.js';
import { dpfUserRoles } from './schemas/dpfUserRoles.js';
import { dpfRolePermissions } from './schemas/dpfRolePermissions.js';
import { dpfPermissions } from './schemas/dpfPermissions.js';
import { dpfRoles } from './schemas/dpfRoles.js';
import { dpfUserCustomPermissions } from './schemas/dpfUserCustomPermissions.js';
import { dpfModules } from './schemas/dpfModules.js';
import { dpfActions } from './schemas/dpfActions.js';
import { users } from './schemas/users.js';
import { tenants } from './schemas/tenants.js';
import { eq, and, inArray } from 'drizzle-orm';
import { hasPermissionWithInheritance } from '../rbac/permissionUtils.js';

async function debugPermissionCheck() {
  console.log('\n🔍 Debugging Permission Check Logic\n');
  console.log('='.repeat(80));

  const [tenant] = await db.select().from(tenants).limit(1);
  console.log(`\nTenant: ${tenant.name}`);

  const [testUser] = await db
    .select()
    .from(users)
    .where(and(
      eq(users.email, 'test@example.com'),
      eq(users.tenantId, tenant.id)
    ));

  console.log(`User: ${testUser.email}`);
  console.log(`User ID: ${testUser.id}\n`);

  // Step 1: Get user roles
  console.log('STEP 1: Get User Roles');
  console.log('-'.repeat(80));

  const userRoles = await db
    .select({
      userRole: dpfUserRoles,
      role: dpfRoles,
    })
    .from(dpfUserRoles)
    .leftJoin(dpfRoles, eq(dpfUserRoles.roleId, dpfRoles.id))
    .where(and(
      eq(dpfUserRoles.userId, testUser.id),
      eq(dpfUserRoles.tenantId, tenant.id),
      eq(dpfUserRoles.isActive, 'true')
    ));

  console.log(`Found ${userRoles.length} role(s):`);
  const roleIds = userRoles.map(ur => ur.userRole.roleId);
  userRoles.forEach(ur => {
    console.log(`  - ${ur.role?.roleName} (${ur.userRole.roleId})`);
  });

  // Step 2: Get role permissions (mimicking dpfEngine)
  console.log('\nSTEP 2: Get Role Permissions');
  console.log('-'.repeat(80));

  const rolePermissions = await db
    .select({
      rolePermission: dpfRolePermissions,
      permission: dpfPermissions,
      module: dpfModules,
      action: dpfActions,
    })
    .from(dpfRolePermissions)
    .leftJoin(dpfPermissions, eq(dpfRolePermissions.permissionId, dpfPermissions.id))
    .leftJoin(dpfModules, eq(dpfPermissions.moduleId, dpfModules.id))
    .leftJoin(dpfActions, eq(dpfPermissions.actionId, dpfActions.id))
    .where(
      and(
        eq(dpfRolePermissions.tenantId, tenant.id),
        inArray(dpfRolePermissions.roleId, roleIds)
      )
    );

  console.log(`Found ${rolePermissions.length} role permission(s) (raw):`);
  rolePermissions.forEach(rp => {
    console.log(`  - Permission Code: ${rp.permission?.permissionCode || 'NULL'}`);
    console.log(`    Permission ID: ${rp.rolePermission.permissionId}`);
    console.log(`    Permission Object: ${rp.permission ? 'EXISTS' : 'NULL'}`);
    console.log(`    Module: ${rp.module?.moduleCode || 'NULL'}`);
    console.log(`    Action: ${rp.action?.actionCode || 'NULL'}`);
  });

  // Filter nulls (as dpfEngine does)
  const filteredPermissions = rolePermissions.filter(rp => rp.permission !== null);
  console.log(`\nAfter filtering nulls: ${filteredPermissions.length} permission(s)`);

  // Step 3: Get custom permissions
  console.log('\nSTEP 3: Get Custom Permissions');
  console.log('-'.repeat(80));

  const customPermissions = await db
    .select({
      customPermission: dpfUserCustomPermissions,
      permission: dpfPermissions,
    })
    .from(dpfUserCustomPermissions)
    .leftJoin(dpfPermissions, eq(dpfUserCustomPermissions.permissionId, dpfPermissions.id))
    .where(
      and(
        eq(dpfUserCustomPermissions.userId, testUser.id),
        eq(dpfUserCustomPermissions.tenantId, tenant.id),
        eq(dpfUserCustomPermissions.isActive, 'true')
      )
    );

  const grantedCustomPerms = customPermissions.filter(cp => cp.customPermission.permissionType === 'GRANT');
  const deniedCustomPerms = customPermissions.filter(cp => cp.customPermission.permissionType === 'DENY');

  console.log(`GRANTED: ${grantedCustomPerms.length}`);
  grantedCustomPerms.forEach(cp => {
    console.log(`  + ${cp.permission?.permissionCode}`);
  });

  console.log(`DENIED: ${deniedCustomPerms.length}`);
  deniedCustomPerms.forEach(cp => {
    console.log(`  - ${cp.permission?.permissionCode}`);
  });

  // Step 4: Calculate effective permissions
  console.log('\nSTEP 4: Calculate Effective Permissions');
  console.log('-'.repeat(80));

  const allPermissions = [...filteredPermissions];

  // Add custom grants
  for (const grantedPerm of grantedCustomPerms) {
    allPermissions.push({
      rolePermission: {
        id: grantedPerm.customPermission.id,
        tenantId: grantedPerm.customPermission.tenantId,
        roleId: '',
        permissionId: grantedPerm.customPermission.permissionId,
        grantedAgiLevel: null,
      },
      permission: grantedPerm.permission,
      module: null,
      action: null,
    });
  }

  console.log(`All permissions (role + grants): ${allPermissions.length}`);

  // Remove denials
  const deniedPermissionIds = deniedCustomPerms.map(dp => dp.customPermission.permissionId);
  const effectivePermissions = allPermissions.filter(
    perm => !deniedPermissionIds.includes(perm.permission!.id)
  );

  console.log(`Effective permissions (after denials): ${effectivePermissions.length}`);
  effectivePermissions.forEach(ep => {
    console.log(`  - ${ep.permission?.permissionCode}`);
  });

  // Step 5: Check specific permission
  console.log('\nSTEP 5: Check Specific Permission');
  console.log('-'.repeat(80));

  const requiredPermission = 'tenants.create';
  console.log(`Required: ${requiredPermission}`);

  const userPermissionCodes = effectivePermissions.map(rp => rp.permission?.permissionCode).filter(Boolean) as string[];
  console.log(`\nUser Permission Codes (${userPermissionCodes.length}):`);
  userPermissionCodes.forEach(code => {
    console.log(`  - ${code}`);
  });

  const hasPermission = hasPermissionWithInheritance(userPermissionCodes, requiredPermission);
  console.log(`\nhas Permission WithInheritance("${requiredPermission}"): ${hasPermission ? 'TRUE ✅' : 'FALSE ❌'}`);

  if (hasPermission) {
    console.log('\n✅ TEST SHOULD PASS');
  } else {
    console.log('\n❌ TEST WILL FAIL');
    console.log('\nPossible reasons:');
    console.log('  1. Permission code mismatch');
    console.log('  2. permissionCode is null/undefined');
    console.log('  3. hasPermissionWithInheritance logic issue');
  }

  console.log('\n' + '='.repeat(80) + '\n');
  process.exit(0);
}

debugPermissionCheck();
