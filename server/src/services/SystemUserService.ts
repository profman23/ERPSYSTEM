/**
 * System User Service
 * Manages platform-level users (System Admin, Support Staff, etc.)
 * These users belong to the SYSTEM tenant and have platform-wide access
 */

import { db } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import { users, tenants, dpfRoles, dpfUserRoles, dpfRoleScreenAuthorizations } from '../db/schemas';
import { auditService } from '../core/audit';
import { contextLogger } from '../core/context';
import { getTenantModules } from '../rbac/dpfStructure';
import bcrypt from 'bcryptjs';

export interface CreateSystemUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  roleCode?: 'SYSTEM_ADMIN' | 'SUPPORT_STAFF' | 'BILLING_STAFF'; // Built-in role code
  roleId?: string; // Custom role ID - use this OR roleCode, not both
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

    // Determine role - either by roleId or roleCode
    let role = null;
    if (input.roleId) {
      // Custom role by ID
      [role] = await db
        .select()
        .from(dpfRoles)
        .where(and(
          eq(dpfRoles.tenantId, systemTenantId),
          eq(dpfRoles.id, input.roleId)
        ))
        .limit(1);

      if (!role) {
        throw new Error('Role not found in SYSTEM tenant');
      }
    } else if (input.roleCode) {
      // Built-in role by code
      [role] = await db
        .select()
        .from(dpfRoles)
        .where(and(
          eq(dpfRoles.tenantId, systemTenantId),
          eq(dpfRoles.roleCode, input.roleCode)
        ))
        .limit(1);
    }

    const [user] = await db.insert(users).values({
      code: userCode,
      firstName: input.firstName,
      lastName: input.lastName,
      name: `${input.firstName} ${input.lastName}`,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: role?.roleCode?.toLowerCase() || 'system_user',
      accessScope: 'system',
      status: 'active',
      isActive: true,
      branchId: null,
      businessLineId: null,
      tenantId: null,
    }).returning();

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
      metadata: { userType: 'system', roleCode: role?.roleCode, roleId: role?.id },
    });

    contextLogger.info('System user created', {
      userId: user.id,
      roleCode: role?.roleCode,
      roleId: role?.id,
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
        roleNameAr: 'مدير المستأجر',
        description: 'Full access to all tenant resources',
        descriptionAr: 'وصول كامل لجميع موارد المستأجر',
        roleType: 'TENANT',
        roleLevel: 'ADMIN',
        isSystemRole: 'true',
        isProtected: 'true',
        isBuiltIn: 'true',
        isDefault: 'true',
        isActive: 'true',
      }).returning();
      tenantAdminRole = newRole;

      // Seed full screen authorizations for all tenant screens
      await this.seedTenantAdminAuthorizations(input.tenantId, newRole.id);
    } else {
      // Self-heal: if role exists but has no authorizations, seed them
      await this.ensureTenantAdminAuthorizations(input.tenantId, tenantAdminRole.id);
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
   * Seed full screen authorizations (level 2) for TENANT_ADMIN role
   * Uses getTenantModules() as source of truth — auto-scales with new modules
   */
  private static async seedTenantAdminAuthorizations(
    tenantId: string,
    roleId: string
  ): Promise<void> {
    const tenantModules = getTenantModules();
    const authRows = tenantModules.flatMap(module =>
      module.screens.map(screen => ({
        tenantId,
        roleId,
        screenCode: screen.screenCode,
        authorizationLevel: 2, // Full Authorization
      }))
    );

    if (authRows.length > 0) {
      await db.insert(dpfRoleScreenAuthorizations).values(authRows);
      contextLogger.info('TENANT_ADMIN screen authorizations seeded', {
        tenantId,
        roleId,
        screenCount: authRows.length,
      });
    }
  }

  /**
   * Self-healing: ensure existing TENANT_ADMIN role has authorizations
   * If role exists but has 0 screen authorizations, seed them
   * Idempotent — safe to call multiple times
   */
  private static async ensureTenantAdminAuthorizations(
    tenantId: string,
    roleId: string
  ): Promise<void> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(dpfRoleScreenAuthorizations)
      .where(
        and(
          eq(dpfRoleScreenAuthorizations.tenantId, tenantId),
          eq(dpfRoleScreenAuthorizations.roleId, roleId)
        )
      );

    if (Number(count) === 0) {
      await this.seedTenantAdminAuthorizations(tenantId, roleId);
      contextLogger.warn('Self-healed TENANT_ADMIN missing authorizations', {
        tenantId,
        roleId,
      });
    }
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
