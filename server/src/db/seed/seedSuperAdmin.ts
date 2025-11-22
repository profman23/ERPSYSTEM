import { db } from '../index';
import { users, tenants } from '../schemas';
import { eq } from 'drizzle-orm';
import { AuthService } from '../../services/AuthService';

/**
 * Seed System Tenant and Super Admin User
 * Creates a system tenant and super admin if they don't exist
 */
export async function seedSuperAdmin() {
  try {
    // 1. Create SYSTEM tenant for super admin login
    const systemTenantCode = 'SYSTEM';
    const [existingSystemTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.code, systemTenantCode))
      .limit(1);

    let systemTenantId: string;

    if (!existingSystemTenant) {
      const [newTenant] = await db.insert(tenants).values({
        name: 'System Administration',
        code: systemTenantCode,
        defaultLanguage: 'en',
        country: 'GLOBAL',
        timezone: 'UTC',
        isActive: true,
      }).returning();
      
      systemTenantId = newTenant.id;
      console.log('✅ System tenant created');
    } else {
      systemTenantId = existingSystemTenant.id;
      console.log('✅ System tenant already exists');
    }

    // 2. Create super admin user
    const superAdminEmail = 'superadmin@system.local';
    const superAdminPassword = 'Admin@123';

    const [existingSuperAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, superAdminEmail))
      .limit(1);

    if (existingSuperAdmin) {
      console.log('✅ Super Admin already exists');
      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log('  Super Admin Login Credentials');
      console.log('═══════════════════════════════════════════');
      console.log('  Tenant Code: SYSTEM');
      console.log('  Email:       superadmin@system.local');
      console.log('  Password:    Admin@123');
      console.log('═══════════════════════════════════════════');
      console.log('');
      return;
    }

    // Hash password
    const passwordHash = await AuthService.hashPassword(superAdminPassword);

    // Create super admin user
    await db.insert(users).values({
      name: 'Super Administrator',
      email: superAdminEmail,
      passwordHash,
      role: 'super_admin',
      accessScope: 'system',
      isActive: true,
      tenantId: null,
      businessLineId: null,
      branchId: null,
    });

    console.log('✅ Super Admin created successfully');
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  Super Admin Login Credentials');
    console.log('═══════════════════════════════════════════');
    console.log('  Tenant Code: SYSTEM');
    console.log('  Email:       superadmin@system.local');
    console.log('  Password:    Admin@123');
    console.log('═══════════════════════════════════════════');
    console.log('  ⚠️  IMPORTANT: Change this password in production!');
    console.log('═══════════════════════════════════════════');
    console.log('');
  } catch (error) {
    console.error('❌ Error seeding super admin:', error);
  }
}
