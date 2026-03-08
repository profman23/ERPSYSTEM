import { db } from './index.js';
import { users, tenants } from './schemas/index.js';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

async function checkSuperAdmin() {
  try {
    console.log('🔍 Checking SuperAdmin setup...\n');

    // Check SYSTEM tenant
    const systemTenants = await db.select().from(tenants).where(eq(tenants.code, 'SYSTEM'));
    console.log('SYSTEM Tenant:', systemTenants.length > 0 ? '✅ EXISTS' : '❌ NOT FOUND');
    if (systemTenants.length > 0) {
      console.log('  ID:', systemTenants[0].id);
      console.log('  Name:', systemTenants[0].name);
    }

    // Check superadmin user
    const superadmins = await db.select().from(users).where(eq(users.email, 'superadmin@system.local'));
    console.log('\nSuperadmin User:', superadmins.length > 0 ? '✅ EXISTS' : '❌ NOT FOUND');
    if (superadmins.length > 0) {
      const user = superadmins[0];
      console.log('  ID:', user.id);
      console.log('  Name:', user.name);
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
      console.log('  AccessScope:', user.accessScope);
      console.log('  IsActive:', user.isActive);
      console.log('  TenantId:', user.tenantId);
      console.log('  Has Password:', user.passwordHash ? '✅ YES' : '❌ NO');
      console.log('  Password Hash (first 20 chars):', user.passwordHash?.substring(0, 20) + '...');
    }

    // List all users for debugging
    const allUsers = await db.select({
      email: users.email,
      role: users.role,
      accessScope: users.accessScope,
      isActive: users.isActive
    }).from(users).limit(10);

    console.log('\n📋 All users in database:');
    allUsers.forEach(u => {
      console.log(`  - ${u.email} (${u.role}, ${u.accessScope}, active: ${u.isActive})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

checkSuperAdmin();
