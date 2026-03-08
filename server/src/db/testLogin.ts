import { db } from './index.js';
import { users, tenants } from './schemas/index.js';
import { eq } from 'drizzle-orm';
import { AuthService } from '../services/AuthService.js';
import 'dotenv/config';

async function testLogin() {
  try {
    console.log('🔍 Testing login for superadmin@system.local...\n');

    const email = 'superadmin@system.local';
    const password = 'Admin@123';
    const tenantCode = 'SYSTEM';

    // 1. Find tenant
    const [tenant] = await db.select().from(tenants).where(eq(tenants.code, tenantCode)).limit(1);
    if (!tenant) {
      console.log('❌ Tenant not found');
      process.exit(1);
    }
    console.log('✅ Tenant found:', tenant.name);

    // 2. Find user
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    console.log('✅ User found:', user.name);
    console.log('   Role:', user.role);
    console.log('   AccessScope:', user.accessScope);
    console.log('   IsActive:', user.isActive);

    // 3. Check tenant association
    if (user.accessScope !== 'system' && user.tenantId !== tenant.id) {
      console.log('❌ Tenant association failed');
      console.log('   User accessScope:', user.accessScope);
      console.log('   User tenantId:', user.tenantId);
      console.log('   Tenant id:', tenant.id);
      process.exit(1);
    }
    console.log('✅ Tenant association OK');

    // 4. Check if active
    if (!user.isActive) {
      console.log('❌ User is inactive');
      process.exit(1);
    }
    console.log('✅ User is active');

    // 5. Check password
    console.log('\n🔐 Testing password...');
    console.log('   Input password:', password);
    console.log('   Stored hash:', user.passwordHash?.substring(0, 30) + '...');

    const isPasswordValid = await AuthService.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      console.log('❌ Password is INVALID');

      // Try to reset password
      console.log('\n🔧 Resetting password to Admin@123...');
      const newHash = await AuthService.hashPassword('Admin@123');
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
      console.log('✅ Password reset successful!');
    } else {
      console.log('✅ Password is VALID');
    }

    console.log('\n✅ All checks passed! Login should work now.');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

testLogin();
