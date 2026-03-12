export * from './tenants';
export * from './subscriptionFeatures';
export * from './businessLines';
export * from './branches';
export * from './branchCapacity';
export * from './users';
export * from './roles';
export * from './permissions';
export * from './authTokens';

// DPF-AGI (S-Tier) Schemas
export * from './dpfModules';
export * from './dpfScreens';
export * from './dpfActions';
export * from './dpfPermissions';
export * from './dpfRoles';
export * from './dpfRolePermissions';
export * from './dpfRoleScreenAuthorizations';
export * from './dpfUserRoles';
export * from './dpfUserRoleBranches';
export * from './dpfUserCustomPermissions';
export * from './dpfAgiLogs';
export * from './dpfVoiceLogs';

// AGI/AI System Schemas (Enterprise)
export * from './dpfAgiSettings';
export * from './dpfAgiApprovals';
export * from './dpfAgiUsage';

// Platform Core Layer Schemas
export * from './auditLogs';
export * from './quotas';

// Centralized Drizzle Relations (enables db.query.*.findFirst({ with: {} }))
export * from './relations';

// Domain Tables (Veterinary)
export * from './species';
export * from './breeds';
export * from './clients';
export * from './patients';

// Financial Tables
export * from './chartOfAccounts';
export * from './taxCodes';
export * from './documentNumberSeries';
export * from './postingPeriods';
export * from './journalEntries';
export * from './accountBalances';

// Inventory Tables
export * from './warehouses';
export * from './itemGroups';
export * from './unitOfMeasures';
export * from './items';

// Test Table - جدول الاختبار
export * from './testTable';
