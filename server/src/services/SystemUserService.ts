/**
 * System User Service
 * Manages platform-level users (System Admin, Support Staff, etc.)
 * These users belong to the SYSTEM tenant and have platform-wide access
 */

import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { users, tenants, dpfRoles, dpfUserRoles } from '../db/schemas';
import { auditService } from '../core/audit';
import { contextLogger } from '../core/context';
import bcrypt from 'bcryptjs';

export interface CreateSystemUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  roleCode: 'SYSTEM_ADMIN' | 'SUPPORT_STAFF' | 'BILLING_STAFF';
}

export interface CreateTenantAdminInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  tenantId: string;
}

export class SystemUserService {
  /**
   * Get the SYSTEM tenant ID
   */
  static async getSystemTenantId(): Promise<string> {
    const [systemTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.code, 'SYSTEM'))
      .limit(1);

    if (!systemTenant) {
      throw new Error('SYSTEM tenant not found. Please run database seed first.');
    }

    return systemTenant.id;
  }

  /**
   * Create a system-level user (no branch/business line required)
   * System users have accessScope = 'system' and belong to SYSTEM tenant
   */
  static async createSystemUser(input: CreateSystemUserInput) {
    const systemTenantId = await this.getSystemTenantId();

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const userCode = `SYS-${Date.now().toString(36).toUpperCase()}`;

    const [user] = await db.insert(users).values({
      code: userCode,
      firstName: input.firstName,
      lastName: input.lastName,
      name: `${input.firstName} ${input.lastName}`,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.roleCode.toLowerCase(),
      accessScope: 'system',
      status: 'active',
      isActive: true,
      branchId: null,
      businessLineId: null,
      tenantId: null,
    }).returning();

    const [role] = await db
      .select()
      .from(dpfRoles)
      .where(and(
        eq(dpfRoles.tenantId, systemTenantId),
        eq(dpfRoles.roleCode, input.roleCode)
      ))
      .limit(1);

    if (role) {
      await db.insert(dpfUserRoles).values({
        userId: user.id,
        roleId: role.id,
        tenantId: systemTenantId,
        assignedScope: 'SYSTEM',
        assignedBy: user.id,
      });
    }

    await auditService.log({
      action: 'create',
      resourceType: 'user',
      resourceId: user.id,
      newData: { ...user, passwordHash: '[REDACTED]' } as unknown as Record<string, unknown>,
      severity: 'high',
      metadata: { userType: 'system', roleCode: input.roleCode },
    });

    contextLogger.info('System user created', {
      userId: user.id,
      roleCode: input.roleCode,
    });

    return { ...user, passwordHash: undefined };
  }

  /**
   * Create a Tenant Admin user
   * Tenant Admins have accessScope = 'tenant' and belong to a specific tenant
   * They automatically get TENANT_ADMIN role with full tenant access
   */
  static async createTenantAdmin(input: CreateTenantAdminInput) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, input.tenantId),
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (tenant.code === 'SYSTEM') {
      throw new Error('Cannot create Tenant Admin for SYSTEM tenant. Use System User instead.');
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const userCode = `ADM-${Date.now().toString(36).toUpperCase()}`;

    const [user] = await db.insert(users).values({
      code: userCode,
      firstName: input.firstName,
      lastName: input.lastName,
      name: `${input.firstName} ${input.lastName}`,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: 'tenant_admin',
      accessScope: 'tenant',
      status: 'active',
      isActive: true,
      branchId: null,
      businessLineId: null,
      tenantId: input.tenantId,
    }).returning();

    let tenantAdminRole = await db.query.dpfRoles.findFirst({
      where: and(
        eq(dpfRoles.tenantId, input.tenantId),
        eq(dpfRoles.roleCode, 'TENANT_ADMIN')
      ),
    });

    if (!tenantAdminRole) {
      const [newRole] = await db.insert(dpfRoles).values({
        tenantId: input.tenantId,
        roleCode: 'TENANT_ADMIN',
        roleName: 'Tenant Administrator',
        description: 'Full access to all tenant resources',
        isProtected: 'true',
        isBuiltIn: 'true',
        isDefault: 'true',
        isActive: 'true',
      }).returning();
      tenantAdminRole = newRole;
    }

    if (tenantAdminRole) {
      await db.insert(dpfUserRoles).values({
        userId: user.id,
        roleId: tenantAdminRole.id,
        tenantId: input.tenantId,
        assignedScope: 'TENANT',
        assignedBy: user.id,
      });
    }

    await auditService.log({
      action: 'create',
      resourceType: 'user',
      resourceId: user.id,
      newData: { ...user, passwordHash: '[REDACTED]' } as unknown as Record<string, unknown>,
      severity: 'high',
      metadata: { userType: 'tenant_admin', tenantId: input.tenantId },
    });

    contextLogger.info('Tenant Admin created', {
      userId: user.id,
      tenantId: input.tenantId,
    });

    return { ...user, passwordHash: undefined };
  }

  /**
   * Get available roles for system users
   */
  static getSystemUserRoles() {
    return [
      { code: 'SYSTEM_ADMIN', name: 'System Administrator', description: 'Full platform access' },
      { code: 'SUPPORT_STAFF', name: 'Support Staff', description: 'Customer support access (placeholder)' },
      { code: 'BILLING_STAFF', name: 'Billing Staff', description: 'Billing and subscription management (placeholder)' },
    ];
  }
}

export default SystemUserService;
