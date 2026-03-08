/**
 * Debug script to check role permissions
 */

import { db } from './index.js';
import { dpfUserRoles } from './schemas/dpfUserRoles.js';
import { dpfRolePermissions } from './schemas/dpfRolePermissions.js';
import { dpfPermissions } from './schemas/dpfPermissions.js';
import { dpfRoles } from './schemas/dpfRoles.js';
import { users } from './schemas/users.js';
import { tenants } from './schemas/tenants.js';
import { eq, and } from 'drizzle-orm';

async function debugRolePermissions() {
  console.log('\n🔍 Debugging Role Permissions\n');

  const [tenant] = await db.select().from(tenants).limit(1);
  console.log(`Tenant: ${tenant.name}\n`);

  // Get test user
  const [testUser] = await db
    .select()
    .from(users)
    .where(and(
      eq(users.email, 'test@example.com'),
      eq(users.tenantId, tenant.id)
    ));

  if (!testUser) {
    console.log('❌ Test user not found');
    return;
  }

  console.log(`User: ${testUser.email} (${testUser.id})\n`);

  // Get user's roles
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

  console.log(`User's Roles (${userRoles.length}):`);
  userRoles.forEach(ur => {
    console.log(`  - ${ur.role?.roleName} (${ur.role?.roleCode})`);
    console.log(`    Role ID: ${ur.userRole.roleId}`);
  });

  if (userRoles.length === 0) {
    console.log('❌ No roles found for user');
    return;
  }

  const roleId = userRoles[0].userRole.roleId;

  // Get role permissions
  const rolePermissions = await db
    .select({
      rolePermission: dpfRolePermissions,
      permission: dpfPermissions,
    })
    .from(dpfRolePermissions)
    .leftJoin(dpfPermissions, eq(dpfRolePermissions.permissionId, dpfPermissions.id))
    .where(and(
      eq(dpfRolePermissions.roleId, roleId),
      eq(dpfRolePermissions.tenantId, tenant.id)
    ));

  console.log(`\nRole Permissions (${rolePermissions.length}):`);
  rolePermissions.forEach(rp => {
    console.log(`  - ${rp.permission?.permissionCode}`);
    console.log(`    Permission ID: ${rp.rolePermission.permissionId}`);
    console.log(`    Is Active: ${rp.permission?.isActive}`);
  });

  if (rolePermissions.length === 0) {
    console.log('\n❌ No permissions found for role');
    console.log('This is why the test fails - role-permission mapping might not be correct');
  } else {
    console.log(`\n✅ Found ${rolePermissions.length} permission(s) for role`);
    console.log('The issue might be in the dpfEngine permission retrieval logic');
  }

  process.exit(0);
}

debugRolePermissions();
