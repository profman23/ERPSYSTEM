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
  moduleNameAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  category?: string | null;
  moduleLevel: string;
  icon?: string | null;
  route?: string | null;
  sortOrder?: string | null;
  isActive: string;
  isSystemModule: string;
  requiredAgiLevel?: string | null;
  metadata?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface DPFScreen {
  id: string;
  tenantId: string;
  moduleId: string;
  screenCode: string;
  screenName: string;
  screenNameAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  route?: string | null;
  componentPath?: string | null;
  isActive: string;
  requiredAgiLevel?: string | null;
  metadata?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface DPFAction {
  id: string;
  tenantId: string;
  moduleId: string;
  screenId?: string | null;
  actionCode: string;
  actionName: string;
  actionNameAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  actionType: string;
  actionCategory: string;
  httpMethod?: string | null;
  apiEndpoint?: string | null;
  socketEvent?: string | null;
  requiredScope?: string | null;
  requiredAgiLevel?: string | null;
  isDestructive: string;
  isActive: string;
  voiceCommandsEn?: unknown;
  voiceCommandsAr?: unknown;
  metadata?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface DPFPermission {
  id: string;
  tenantId: string;
  permissionCode: string;
  permissionName: string;
  permissionNameAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  moduleId: string;
  screenId?: string | null;
  actionId?: string | null;
  permissionType: 'MODULE' | 'SCREEN' | 'ACTION' | 'API' | 'SOCKET' | string;
  permissionLevel: 'SYSTEM' | 'ADMIN' | 'APP' | string;
  requiredScope?: string | null;
  isActive: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DPFRole {
  id: string;
  tenantId: string;
  roleCode: string;
  roleName: string;
  roleNameAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  isProtected: string;
  isDefault: string;
  isActive: string;
  isSystemRole?: string | null;
  roleType?: string | null;  // 'SYSTEM' | 'TENANT' | 'CUSTOM'
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
  isSystemRole?: boolean;  // For SAP B1 style system-level roles
  screenAuthorizations?: Record<string, number>;  // screenCode -> level (0/1/2)
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
  firstName: string | null;
  lastName: string | null;
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
