/**
 * Shared TypeScript Types for DPF-AGI Roles & Permissions Module
 * Used by both client and server
 */

// ═══════════════════════════════════════════════════════════════
// CORE DPF TYPES
// ═══════════════════════════════════════════════════════════════

export interface DPFModule {
  id: string;
  tenantId: string;
  moduleCode: string;
  moduleName: string;
  moduleNameAr?: string;
  description?: string;
  descriptionAr?: string;
  icon?: string;
  displayOrder: number;
  isActive: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DPFScreen {
  id: string;
  tenantId: string;
  moduleId: string;
  screenCode: string;
  screenName: string;
  screenNameAr?: string;
  routePath?: string;
  componentPath?: string;
  description?: string;
  descriptionAr?: string;
  displayOrder: number;
  isActive: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DPFAction {
  id: string;
  tenantId: string;
  moduleId: string;
  screenId?: string;
  actionCode: string;
  actionName: string;
  actionNameAr?: string;
  actionType: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'IMPORT' | 'APPROVE' | 'CUSTOM';
  description?: string;
  descriptionAr?: string;
  isActive: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DPFPermission {
  id: string;
  tenantId: string;
  permissionCode: string;
  permissionName: string;
  permissionNameAr?: string;
  description?: string;
  descriptionAr?: string;
  moduleId: string;
  screenId?: string;
  actionId?: string;
  permissionType: 'MODULE' | 'SCREEN' | 'ACTION' | 'API' | 'SOCKET';
  requiredScope?: string;
  isActive: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DPFRole {
  id: string;
  tenantId: string;
  roleCode: string;
  roleName: string;
  roleNameAr?: string;
  description?: string;
  descriptionAr?: string;
  isProtected: string;
  isDefault: string;
  isActive: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DPFRolePermission {
  id: string;
  tenantId: string;
  roleId: string;
  permissionId: string;
  createdAt: Date;
}

export interface DPFUserRole {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
// ROLE MANAGEMENT TYPES
// ═══════════════════════════════════════════════════════════════

export interface RoleListItem extends DPFRole {
  usersCount: number;
  permissionsCount: number;
}

export interface CreateRoleInput {
  roleCode: string;
  roleName: string;
  roleNameAr?: string;
  description?: string;
  descriptionAr?: string;
  isDefault?: boolean;
}

export interface UpdateRoleInput {
  roleName?: string;
  roleNameAr?: string;
  description?: string;
  descriptionAr?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface DeleteRoleResult {
  success: boolean;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// PERMISSION MATRIX TYPES
// ═══════════════════════════════════════════════════════════════

export interface PermissionNode {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  type: 'MODULE' | 'SCREEN' | 'ACTION';
  isGranted: boolean;
  children?: PermissionNode[];
}

export interface PermissionMatrixModule {
  module: DPFModule;
  screens: PermissionMatrixScreen[];
  modulePermissions: DPFPermission[];
}

export interface PermissionMatrixScreen {
  screen: DPFScreen;
  actions: DPFAction[];
  screenPermissions: DPFPermission[];
  actionPermissions: DPFPermission[];
}

export interface AssignPermissionsInput {
  roleId: string;
  permissionIds: string[];
}

// ═══════════════════════════════════════════════════════════════
// USER ROLE ASSIGNMENT TYPES
// ═══════════════════════════════════════════════════════════════

export interface AssignRoleToUserInput {
  userId: string;
  roleId: string;
  expiresAt?: Date;
}

export interface UserWithRole {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: DPFRole;
  assignedAt?: Date;
  expiresAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
