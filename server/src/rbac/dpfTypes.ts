/**
 * DPF-AGI (S-Tier) Type System
 * Comprehensive type definitions for Dynamic Permission Fabric with AGI Integration
 */

// =====================================================
// SAP B1 STYLE AUTHORIZATION LEVELS
// =====================================================
/**
 * Authorization levels for screen access (SAP Business One style)
 * - NONE (0): No access - screen is hidden and route is blocked
 * - READ_ONLY (1): View only - can see data but cannot modify
 * - FULL (2): Full access - can perform all operations
 */
export enum AuthorizationLevel {
  NONE = 0,        // No Authorization - screen hidden, route blocked
  READ_ONLY = 1,   // Read Only - view only, no create/update
  FULL = 2,        // Full Authorization - all operations allowed
}

/**
 * Screen authorization record (role -> screen -> level)
 */
export interface ScreenAuthorization {
  screenCode: string;
  level: AuthorizationLevel;
}

/**
 * Role screen authorization record
 */
export interface RoleScreenAuthorization {
  roleId: string;
  screenCode: string;
  authorizationLevel: AuthorizationLevel;
}

/**
 * User's effective authorization for a screen
 */
export interface UserScreenAuthorization {
  screenCode: string;
  screenName: string;
  screenNameAr?: string;
  moduleCode: string;
  moduleName: string;
  moduleNameAr?: string;
  authorizationLevel: AuthorizationLevel;
  route?: string;
}

// =====================================================
// AGI ACCESS LEVELS
// =====================================================
export enum AgiAccessLevel {
  NO_ACCESS = 'NO_ACCESS', // AGI cannot access this module/action
  READ_ONLY = 'READ_ONLY', // AGI can read but cannot perform actions
  SUGGEST = 'SUGGEST', // AGI can suggest actions but requires approval
  AUTOMATE = 'AUTOMATE', // AGI can automate routine tasks
  AUTONOMOUS = 'AUTONOMOUS', // AGI has full autonomous access (high-risk)
}

// =====================================================
// PERMISSION SCOPES
// =====================================================
export enum PermissionScope {
  SYSTEM = 'SYSTEM', // System-level (super admin only)
  TENANT = 'TENANT', // Tenant-level
  BUSINESS_LINE = 'BUSINESS_LINE', // Business line-level
  BRANCH = 'BRANCH', // Branch-level
}

// =====================================================
// ACTION TYPES & CATEGORIES
// =====================================================
export enum ActionType {
  CRUD = 'CRUD', // Create/Read/Update/Delete operations
  API = 'API', // API endpoint operations
  SOCKET = 'SOCKET', // Socket.IO event operations
  REPORT = 'REPORT', // Reporting operations
  EXPORT = 'EXPORT', // Data export operations
  IMPORT = 'IMPORT', // Data import operations
  BATCH = 'BATCH', // Batch operations
  SYSTEM = 'SYSTEM', // System operations
}

export enum ActionCategory {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  EXECUTE = 'EXECUTE',
  APPROVE = 'APPROVE',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
}

// =====================================================
// MODULE TYPES
// =====================================================
export interface DPFModule {
  id: string;
  tenantId: string;
  moduleCode: string;
  moduleName: string;
  moduleNameAr?: string;
  description?: string;
  descriptionAr?: string;
  category?: string;
  icon?: string;
  route?: string;
  sortOrder?: string;
  isActive: boolean;
  isSystemModule: boolean;
  requiredAgiLevel?: AgiAccessLevel;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DPFModuleRegistration {
  moduleCode: string;
  moduleName: string;
  moduleNameAr?: string;
  description?: string;
  descriptionAr?: string;
  category?: string;
  icon?: string;
  route?: string;
  sortOrder?: string;
  isSystemModule?: boolean;
  requiredAgiLevel?: AgiAccessLevel;
  metadata?: Record<string, any>;
}

// =====================================================
// SCREEN TYPES
// =====================================================
export interface DPFScreen {
  id: string;
  tenantId: string;
  moduleId: string;
  screenCode: string;
  screenName: string;
  screenNameAr?: string;
  description?: string;
  descriptionAr?: string;
  route?: string;
  componentPath?: string;
  isActive: boolean;
  requiredAgiLevel?: AgiAccessLevel;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DPFScreenRegistration {
  moduleCode: string; // Reference to module
  screenCode: string;
  screenName: string;
  screenNameAr?: string;
  description?: string;
  descriptionAr?: string;
  route?: string;
  componentPath?: string;
  requiredAgiLevel?: AgiAccessLevel;
  metadata?: Record<string, any>;
}

// =====================================================
// ACTION TYPES
// =====================================================
export interface DPFAction {
  id: string;
  tenantId: string;
  moduleId: string;
  screenId?: string;
  actionCode: string;
  actionName: string;
  actionNameAr?: string;
  description?: string;
  descriptionAr?: string;
  actionType: ActionType;
  actionCategory: ActionCategory;
  httpMethod?: string;
  apiEndpoint?: string;
  socketEvent?: string;
  requiredScope?: PermissionScope;
  requiredAgiLevel?: AgiAccessLevel;
  isDestructive: boolean;
  isActive: boolean;
  voiceCommandsEn?: string[];
  voiceCommandsAr?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DPFActionRegistration {
  moduleCode: string; // Reference to module
  screenCode?: string; // Optional reference to screen
  actionCode: string;
  actionName: string;
  actionNameAr?: string;
  description?: string;
  descriptionAr?: string;
  actionType: ActionType;
  actionCategory: ActionCategory;
  httpMethod?: string;
  apiEndpoint?: string;
  socketEvent?: string;
  requiredScope?: PermissionScope;
  requiredAgiLevel?: AgiAccessLevel;
  isDestructive?: boolean;
  voiceCommandsEn?: string[];
  voiceCommandsAr?: string[];
  metadata?: Record<string, any>;
}

// =====================================================
// PERMISSION TYPES
// =====================================================
export enum PermissionType {
  MODULE = 'MODULE', // Access to entire module
  SCREEN = 'SCREEN', // Access to specific screen
  ACTION = 'ACTION', // Access to specific action
  API = 'API', // Access to API endpoint
  SOCKET = 'SOCKET', // Access to Socket.IO event
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
  permissionType: PermissionType;
  requiredScope?: PermissionScope;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// ROLE TYPES
// =====================================================
export enum RoleType {
  SYSTEM = 'SYSTEM', // Predefined system roles
  TENANT = 'TENANT', // Tenant-default roles
  CUSTOM = 'CUSTOM', // Custom user-created roles
}

export interface DPFRole {
  id: string;
  tenantId: string;
  roleCode: string;
  roleName: string;
  roleNameAr?: string;
  description?: string;
  descriptionAr?: string;
  roleType: RoleType;
  defaultAgiLevel?: AgiAccessLevel;
  isSystemRole: boolean;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DPFRolePermission {
  id: string;
  tenantId: string;
  roleId: string;
  permissionId: string;
  grantedAgiLevel?: AgiAccessLevel;
  createdAt: Date;
  updatedAt: Date;
}

export interface DPFUserRole {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  assignedScope: PermissionScope;
  businessLineId?: string;
  branchId?: string;
  assignedBy?: string;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// AGI TYPES
// =====================================================
export enum AgiOperationType {
  CREATE_ROLE = 'CREATE_ROLE',
  UPDATE_ROLE = 'UPDATE_ROLE',
  DELETE_ROLE = 'DELETE_ROLE',
  ASSIGN_PERMISSION = 'ASSIGN_PERMISSION',
  REVOKE_PERMISSION = 'REVOKE_PERMISSION',
  ASSIGN_USER_ROLE = 'ASSIGN_USER_ROLE',
  REVOKE_USER_ROLE = 'REVOKE_USER_ROLE',
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  GRANT_ACCESS = 'GRANT_ACCESS',
  REVOKE_ACCESS = 'REVOKE_ACCESS',
}

export enum AgiOperationStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REQUIRES_APPROVAL = 'REQUIRES_APPROVAL',
  DENIED = 'DENIED',
  PENDING = 'PENDING',
}

export interface DPFAgiLog {
  id: string;
  tenantId: string;
  userId?: string;
  agiOperation: AgiOperationType;
  inputCommand?: string;
  inputLanguage?: 'en' | 'ar';
  parsedIntent?: Record<string, any>;
  executedAction?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  status: AgiOperationStatus;
  failureReason?: string;
  safetyChecksPassed?: boolean;
  safetyViolations?: string[];
  approvedBy?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// =====================================================
// VOICE TYPES
// =====================================================
export interface DPFVoiceLog {
  id: string;
  tenantId: string;
  userId: string;
  voiceCommand: string;
  detectedLanguage?: 'en' | 'ar';
  confidence?: number;
  recognizedIntent?: string;
  mappedAction?: string;
  permissionRequired?: string;
  permissionGranted?: boolean;
  executionStatus?: string;
  failureReason?: string;
  audioFileUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface VoiceCommandMapping {
  commands: string[]; // Natural language variations
  language: 'en' | 'ar';
  actionCode: string; // Maps to DPF action
  requiredParams?: string[]; // Required parameters to extract
  examples?: string[]; // Example phrases
}

// =====================================================
// PERMISSION CHECK TYPES
// =====================================================
export interface PermissionCheckRequest {
  userId: string;
  tenantId: string;
  permissionCode?: string; // Check specific permission
  moduleCode?: string; // Check module access
  actionCode?: string; // Check action access
  apiEndpoint?: string; // Check API endpoint access
  socketEvent?: string; // Check Socket.IO event access
  scope?: PermissionScope; // Required scope
  branchId?: string; // Check branch-level access (optional)
}

export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  userRoles?: string[];
  matchedPermissions?: string[];
  effectiveAgiLevel?: AgiAccessLevel;
  tenantId: string;
  userId: string;
}

// =====================================================
// REGISTRY TYPES
// =====================================================
export interface DPFRegistryEntry {
  module: DPFModule;
  screens: DPFScreen[];
  actions: DPFAction[];
  permissions: DPFPermission[];
}

export interface DPFRegistryCache {
  modules: Map<string, DPFModule>; // moduleCode -> module
  screens: Map<string, DPFScreen>; // screenCode -> screen
  actions: Map<string, DPFAction>; // actionCode -> action
  permissions: Map<string, DPFPermission>; // permissionCode -> permission
  apiEndpoints: Map<string, DPFAction>; // endpoint -> action
  socketEvents: Map<string, DPFAction>; // event -> action
  lastUpdated: Date;
}

// =====================================================
// AGI INTERPRETER TYPES
// =====================================================
export interface AgiInterpretRequest {
  command: string; // Natural language command
  language: 'en' | 'ar';
  userId: string;
  tenantId: string;
  context?: Record<string, any>; // Additional context
}

export interface AgiInterpretResult {
  success: boolean;
  operation?: AgiOperationType;
  intent?: string;
  extractedParams?: Record<string, any>;
  confidence?: number;
  requiredPermissions?: string[];
  safetyChecks?: SafetyCheckResult[];
  suggestedAction?: string;
  error?: string;
}

export interface SafetyCheckResult {
  checkName: string;
  passed: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message?: string;
  violation?: string;
}

// All types and enums are already exported inline above
