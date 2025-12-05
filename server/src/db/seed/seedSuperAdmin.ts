import { db } from '../index';
import { users, tenants, dpfRoles, dpfUserRoles } from '../schemas';
import { eq, and } from 'drizzle-orm';
import { AuthService } from '../../services/AuthService';
import { seedDPFStructure, validateDPFStructure } from './seedDPFStructure';

/**
 * Built-in Role Definitions
 * These roles are protected and cannot be deleted
 */
const BUILT_IN_ROLES = {
  SYSTEM_ADMIN: {
    roleCode: 'SYSTEM_ADMIN',
    roleName: 'System Administrator',
    roleNameAr: 'مدير النظام',
    description: 'Full platform access. Can manage all tenants, users, and system settings.',
    descriptionAr: 'وصول كامل للمنصة. يمكنه إدارة جميع المستأجرين والمستخدمين وإعدادات النظام.',
    roleType: 'SYSTEM',
    isSystemRole: 'true',
    isBuiltIn: 'true',
    isProtected: 'true',
    isDefault: 'true',
  },
  TENANT_ADMIN: {
    roleCode: 'TENANT_ADMIN',
    roleName: 'Tenant Administrator',
    roleNameAr: 'مدير المستأجر',
    description: 'Full access within tenant. Can manage business lines, branches, users, and roles.',
    descriptionAr: 'وصول كامل داخل المستأجر. يمكنه إدارة خطوط الأعمال والفروع والمستخدمين والأدوار.',
    roleType: 'TENANT',
    isSystemRole: 'true',
    isBuiltIn: 'true',
    isProtected: 'true',
    isDefault: 'true',
  },
};

/**
 * Create SYSTEM_ADMIN role for SYSTEM tenant
 */
async function seedSystemAdminRole(systemTenantId: string): Promise<string> {
  const [existingRole] = await db
    .select()
    .from(dpfRoles)
    .where(and(
      eq(dpfRoles.tenantId, systemTenantId),
      eq(dpfRoles.roleCode, BUILT_IN_ROLES.SYSTEM_ADMIN.roleCode)
    ))
    .limit(1);

  if (existingRole) {
    console.log('✅ SYSTEM_ADMIN role already exists');
    return existingRole.id;
  }

  const [newRole] = await db.insert(dpfRoles).values({
    tenantId: systemTenantId,
    ...BUILT_IN_ROLES.SYSTEM_ADMIN,
  }).returning();

  console.log('✅ SYSTEM_ADMIN role created');
  return newRole.id;
}

/**
 * Create TENANT_ADMIN role for a specific tenant
 * This is called when a new tenant is created
 */
export async function seedTenantAdminRole(tenantId: string): Promise<string> {
  const [existingRole] = await db
    .select()
    .from(dpfRoles)
    .where(and(
      eq(dpfRoles.tenantId, tenantId),
      eq(dpfRoles.roleCode, BUILT_IN_ROLES.TENANT_ADMIN.roleCode)
    ))
    .limit(1);

  if (existingRole) {
    return existingRole.id;
  }

  const [newRole] = await db.insert(dpfRoles).values({
    tenantId: tenantId,
    ...BUILT_IN_ROLES.TENANT_ADMIN,
  }).returning();

  console.log(`✅ TENANT_ADMIN role created for tenant ${tenantId}`);
  return newRole.id;
}

/**
 * Assign a role to a user
 */
async function assignRoleToUser(
  userId: string, 
  roleId: string, 
  tenantId: string,
  assignedScope: 'SYSTEM' | 'TENANT' | 'BUSINESS_LINE' | 'BRANCH' = 'SYSTEM'
): Promise<void> {
  const [existingAssignment] = await db
    .select()
    .from(dpfUserRoles)
    .where(and(
      eq(dpfUserRoles.userId, userId),
      eq(dpfUserRoles.roleId, roleId)
    ))
    .limit(1);

  if (existingAssignment) {
    return;
  }

  await db.insert(dpfUserRoles).values({
    userId,
    roleId,
    tenantId,
    assignedScope,
    assignedBy: userId,
  });

  console.log('✅ Role assigned to user');
}

/**
 * Seed System Tenant and Super Admin User
 * Creates a system tenant and super admin if they don't exist
 * Also creates SYSTEM_ADMIN role and assigns it to super admin
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
      }).returning();
      
      systemTenantId = newTenant.id;
      console.log('✅ System tenant created');
    } else {
      systemTenantId = existingSystemTenant.id;
      console.log('✅ System tenant already exists');
    }

    // 2. Create SYSTEM_ADMIN role
    const systemAdminRoleId = await seedSystemAdminRole(systemTenantId);

    // 3. Create super admin user
    const superAdminEmail = 'superadmin@system.local';
    const superAdminPassword = 'Admin@123';

    const [existingSuperAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, superAdminEmail))
      .limit(1);

    let superAdminId: string;

    if (existingSuperAdmin) {
      superAdminId = existingSuperAdmin.id;
      console.log('✅ Super Admin already exists');
    } else {
      // Hash password
      const passwordHash = await AuthService.hashPassword(superAdminPassword);

      // Create super admin user
      const [newUser] = await db.insert(users).values({
        name: 'Super Administrator',
        email: superAdminEmail,
        passwordHash,
        role: 'super_admin',
        accessScope: 'system',
        isActive: true,
        tenantId: null,
        businessLineId: null,
        branchId: null,
      }).returning();

      superAdminId = newUser.id;
      console.log('✅ Super Admin created successfully');
    }

    // 4. Assign SYSTEM_ADMIN role to super admin
    await assignRoleToUser(superAdminId, systemAdminRoleId, systemTenantId);
    
    // 5. Sync DPF structure for SYSTEM tenant
    console.log('\n🔄 Syncing DPF structure for SYSTEM tenant...');
    await seedDPFStructure(systemTenantId);
    await validateDPFStructure(systemTenantId);
    
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  Super Admin Login Credentials');
    console.log('═══════════════════════════════════════════');
    console.log('  Tenant Code: SYSTEM');
    console.log('  Email:       superadmin@system.local');
    console.log('  Password:    Admin@123');
    console.log('═══════════════════════════════════════════');
    if (!existingSuperAdmin) {
      console.log('  ⚠️  IMPORTANT: Change this password in production!');
      console.log('═══════════════════════════════════════════');
    }
    console.log('');
  } catch (error) {
    console.error('❌ Error seeding super admin:', error);
  }
}
