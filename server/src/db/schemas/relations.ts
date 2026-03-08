/**
 * Centralized Drizzle Relations
 * Enables relational queries: db.query.users.findFirst({ with: { tenant: true, branch: true } })
 *
 * RULES:
 * - Every table with a foreign key gets a `one()` relation
 * - Every parent table gets `many()` relations to its children
 * - Relation names match the foreign key field (tenantId → tenant, userId → user)
 * - Self-referencing FKs use relationName to disambiguate
 */

import { relations } from 'drizzle-orm';

// Core tables
import { tenants } from './tenants';
import { users } from './users';
import { businessLines } from './businessLines';
import { branches } from './branches';
import { branchCapacity } from './branchCapacity';
import { roles } from './roles';
import { authTokens } from './authTokens';

// DPF tables
import { dpfModules } from './dpfModules';
import { dpfScreens } from './dpfScreens';
import { dpfActions } from './dpfActions';
import { dpfPermissions } from './dpfPermissions';
import { dpfRoles } from './dpfRoles';
import { dpfRolePermissions } from './dpfRolePermissions';
import { dpfRoleScreenAuthorizations } from './dpfRoleScreenAuthorizations';
import { dpfUserRoles } from './dpfUserRoles';
import { dpfUserRoleBranches } from './dpfUserRoleBranches';
import { dpfUserCustomPermissions } from './dpfUserCustomPermissions';

// AGI tables
import { dpfAgiLogs } from './dpfAgiLogs';
import { dpfVoiceLogs } from './dpfVoiceLogs';
import { dpfAgiSettings } from './dpfAgiSettings';
import { dpfAgiApprovals } from './dpfAgiApprovals';
import { dpfAgiUsage, dpfAgiUsageDailyAggregates } from './dpfAgiUsage';

// Domain tables
import { species } from './species';
import { breeds } from './breeds';
import { clients } from './clients';
import { patients } from './patients';

// Financial tables
import { chartOfAccounts } from './chartOfAccounts';
import { taxCodes } from './taxCodes';
import { documentNumberSeries } from './documentNumberSeries';
import { postingPeriods, postingSubPeriods } from './postingPeriods';
import { journalEntries, journalEntryLines } from './journalEntries';

// Inventory tables
import { warehouses } from './warehouses';
import { itemGroups } from './itemGroups';
import { unitOfMeasures } from './unitOfMeasures';
import { items } from './items';


// ═══════════════════════════════════════════════════════
// CORE HIERARCHY: Tenant → BusinessLine → Branch → User
// ═══════════════════════════════════════════════════════

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  businessLines: many(businessLines),
  branches: many(branches),
  branchCapacities: many(branchCapacity),
  roles: many(roles),
  // DPF
  dpfModules: many(dpfModules),
  dpfRoles: many(dpfRoles),
  dpfPermissions: many(dpfPermissions),
  dpfScreens: many(dpfScreens),
  dpfActions: many(dpfActions),
  dpfRolePermissions: many(dpfRolePermissions),
  dpfRoleScreenAuthorizations: many(dpfRoleScreenAuthorizations),
  dpfUserRoles: many(dpfUserRoles),
  dpfUserRoleBranches: many(dpfUserRoleBranches),
  dpfUserCustomPermissions: many(dpfUserCustomPermissions),
  // AGI
  dpfAgiLogs: many(dpfAgiLogs),
  dpfVoiceLogs: many(dpfVoiceLogs),
  dpfAgiApprovals: many(dpfAgiApprovals),
  dpfAgiUsage: many(dpfAgiUsage),
  dpfAgiUsageDailyAggregates: many(dpfAgiUsageDailyAggregates),
  // Domain
  species: many(species),
  breeds: many(breeds),
  clients: many(clients),
  patients: many(patients),
  // Financial
  chartOfAccounts: many(chartOfAccounts),
  taxCodes: many(taxCodes),
  documentNumberSeries: many(documentNumberSeries),
  postingPeriods: many(postingPeriods),
  postingSubPeriods: many(postingSubPeriods),
  journalEntries: many(journalEntries),
  journalEntryLines: many(journalEntryLines),
  // Inventory
  warehouses: many(warehouses),
  itemGroups: many(itemGroups),
  unitOfMeasures: many(unitOfMeasures),
  items: many(items),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  businessLine: one(businessLines, {
    fields: [users.businessLineId],
    references: [businessLines.id],
  }),
  branch: one(branches, {
    fields: [users.branchId],
    references: [branches.id],
  }),
  authTokens: many(authTokens),
  dpfUserRoles: many(dpfUserRoles),
  dpfUserCustomPermissions: many(dpfUserCustomPermissions),
  dpfAgiLogs: many(dpfAgiLogs),
  dpfVoiceLogs: many(dpfVoiceLogs),
  dpfAgiApprovals: many(dpfAgiApprovals),
  dpfAgiUsage: many(dpfAgiUsage),
}));

export const businessLinesRelations = relations(businessLines, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [businessLines.tenantId],
    references: [tenants.id],
  }),
  branches: many(branches),
  users: many(users),
  branchCapacities: many(branchCapacity),
  dpfUserRoles: many(dpfUserRoles),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [branches.tenantId],
    references: [tenants.id],
  }),
  businessLine: one(businessLines, {
    fields: [branches.businessLineId],
    references: [businessLines.id],
  }),
  users: many(users),
  branchCapacities: many(branchCapacity),
  dpfUserRoles: many(dpfUserRoles),
  dpfUserRoleBranches: many(dpfUserRoleBranches),
  warehouses: many(warehouses),
  documentNumberSeries: many(documentNumberSeries),
  journalEntries: many(journalEntries),
}));

export const branchCapacityRelations = relations(branchCapacity, ({ one }) => ({
  tenant: one(tenants, {
    fields: [branchCapacity.tenantId],
    references: [tenants.id],
  }),
  businessLine: one(businessLines, {
    fields: [branchCapacity.businessLineId],
    references: [businessLines.id],
  }),
  branch: one(branches, {
    fields: [branchCapacity.branchId],
    references: [branches.id],
  }),
}));


// ═══════════════════════════════════════════════════════
// LEGACY TABLES
// ═══════════════════════════════════════════════════════

export const rolesRelations = relations(roles, ({ one }) => ({
  tenant: one(tenants, {
    fields: [roles.tenantId],
    references: [tenants.id],
  }),
}));

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  user: one(users, {
    fields: [authTokens.userId],
    references: [users.id],
  }),
}));


// ═══════════════════════════════════════════════════════
// DPF MODULE HIERARCHY: Module → Screen → Action
// ═══════════════════════════════════════════════════════

export const dpfModulesRelations = relations(dpfModules, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [dpfModules.tenantId],
    references: [tenants.id],
  }),
  screens: many(dpfScreens),
  actions: many(dpfActions),
  permissions: many(dpfPermissions),
}));

export const dpfScreensRelations = relations(dpfScreens, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [dpfScreens.tenantId],
    references: [tenants.id],
  }),
  module: one(dpfModules, {
    fields: [dpfScreens.moduleId],
    references: [dpfModules.id],
  }),
  actions: many(dpfActions),
  permissions: many(dpfPermissions),
}));

export const dpfActionsRelations = relations(dpfActions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dpfActions.tenantId],
    references: [tenants.id],
  }),
  module: one(dpfModules, {
    fields: [dpfActions.moduleId],
    references: [dpfModules.id],
  }),
  screen: one(dpfScreens, {
    fields: [dpfActions.screenId],
    references: [dpfScreens.id],
  }),
}));


// ═══════════════════════════════════════════════════════
// DPF ROLES & PERMISSIONS
// ═══════════════════════════════════════════════════════

export const dpfRolesRelations = relations(dpfRoles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [dpfRoles.tenantId],
    references: [tenants.id],
  }),
  rolePermissions: many(dpfRolePermissions),
  roleScreenAuthorizations: many(dpfRoleScreenAuthorizations),
  userRoles: many(dpfUserRoles),
}));

export const dpfPermissionsRelations = relations(dpfPermissions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [dpfPermissions.tenantId],
    references: [tenants.id],
  }),
  module: one(dpfModules, {
    fields: [dpfPermissions.moduleId],
    references: [dpfModules.id],
  }),
  screen: one(dpfScreens, {
    fields: [dpfPermissions.screenId],
    references: [dpfScreens.id],
  }),
  action: one(dpfActions, {
    fields: [dpfPermissions.actionId],
    references: [dpfActions.id],
  }),
  rolePermissions: many(dpfRolePermissions),
  userCustomPermissions: many(dpfUserCustomPermissions),
}));

export const dpfRolePermissionsRelations = relations(dpfRolePermissions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dpfRolePermissions.tenantId],
    references: [tenants.id],
  }),
  role: one(dpfRoles, {
    fields: [dpfRolePermissions.roleId],
    references: [dpfRoles.id],
  }),
  permission: one(dpfPermissions, {
    fields: [dpfRolePermissions.permissionId],
    references: [dpfPermissions.id],
  }),
}));

export const dpfRoleScreenAuthorizationsRelations = relations(dpfRoleScreenAuthorizations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dpfRoleScreenAuthorizations.tenantId],
    references: [tenants.id],
  }),
  role: one(dpfRoles, {
    fields: [dpfRoleScreenAuthorizations.roleId],
    references: [dpfRoles.id],
  }),
}));


// ═══════════════════════════════════════════════════════
// DPF USER ASSIGNMENT
// ═══════════════════════════════════════════════════════

export const dpfUserRolesRelations = relations(dpfUserRoles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [dpfUserRoles.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [dpfUserRoles.userId],
    references: [users.id],
  }),
  role: one(dpfRoles, {
    fields: [dpfUserRoles.roleId],
    references: [dpfRoles.id],
  }),
  businessLine: one(businessLines, {
    fields: [dpfUserRoles.businessLineId],
    references: [businessLines.id],
  }),
  branch: one(branches, {
    fields: [dpfUserRoles.branchId],
    references: [branches.id],
  }),
  assignedByUser: one(users, {
    fields: [dpfUserRoles.assignedBy],
    references: [users.id],
    relationName: 'assignedByUser',
  }),
  roleBranches: many(dpfUserRoleBranches),
}));

export const dpfUserRoleBranchesRelations = relations(dpfUserRoleBranches, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dpfUserRoleBranches.tenantId],
    references: [tenants.id],
  }),
  userRole: one(dpfUserRoles, {
    fields: [dpfUserRoleBranches.userRoleId],
    references: [dpfUserRoles.id],
  }),
  branch: one(branches, {
    fields: [dpfUserRoleBranches.branchId],
    references: [branches.id],
  }),
}));

export const dpfUserCustomPermissionsRelations = relations(dpfUserCustomPermissions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dpfUserCustomPermissions.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [dpfUserCustomPermissions.userId],
    references: [users.id],
    relationName: 'customPermissionUser',
  }),
  permission: one(dpfPermissions, {
    fields: [dpfUserCustomPermissions.permissionId],
    references: [dpfPermissions.id],
  }),
  assignedByUser: one(users, {
    fields: [dpfUserCustomPermissions.assignedBy],
    references: [users.id],
    relationName: 'customPermissionAssigner',
  }),
}));


// ═══════════════════════════════════════════════════════
// AGI / AI TABLES
// ═══════════════════════════════════════════════════════

export const dpfAgiSettingsRelations = relations(dpfAgiSettings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dpfAgiSettings.tenantId],
    references: [tenants.id],
  }),
}));

export const dpfAgiLogsRelations = relations(dpfAgiLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dpfAgiLogs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [dpfAgiLogs.userId],
    references: [users.id],
    relationName: 'agiLogUser',
  }),
  approvedByUser: one(users, {
    fields: [dpfAgiLogs.approvedBy],
    references: [users.id],
    relationName: 'agiLogApprover',
  }),
}));

export const dpfVoiceLogsRelations = relations(dpfVoiceLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dpfVoiceLogs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [dpfVoiceLogs.userId],
    references: [users.id],
  }),
}));

export const dpfAgiApprovalsRelations = relations(dpfAgiApprovals, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dpfAgiApprovals.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [dpfAgiApprovals.userId],
    references: [users.id],
    relationName: 'approvalRequester',
  }),
  approvedByUser: one(users, {
    fields: [dpfAgiApprovals.approvedBy],
    references: [users.id],
    relationName: 'approvalApprover',
  }),
  rejectedByUser: one(users, {
    fields: [dpfAgiApprovals.rejectedBy],
    references: [users.id],
    relationName: 'approvalRejecter',
  }),
}));

export const dpfAgiUsageRelations = relations(dpfAgiUsage, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dpfAgiUsage.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [dpfAgiUsage.userId],
    references: [users.id],
  }),
}));

export const dpfAgiUsageDailyAggregatesRelations = relations(dpfAgiUsageDailyAggregates, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dpfAgiUsageDailyAggregates.tenantId],
    references: [tenants.id],
  }),
}));


// ═══════════════════════════════════════════════════════
// DOMAIN TABLES (Veterinary)
// ═══════════════════════════════════════════════════════

export const speciesRelations = relations(species, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [species.tenantId],
    references: [tenants.id],
  }),
  breeds: many(breeds),
  patients: many(patients),
}));

export const breedsRelations = relations(breeds, ({ one }) => ({
  tenant: one(tenants, {
    fields: [breeds.tenantId],
    references: [tenants.id],
  }),
  species: one(species, {
    fields: [breeds.speciesId],
    references: [species.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [clients.tenantId],
    references: [tenants.id],
  }),
  patients: many(patients),
}));

export const patientsRelations = relations(patients, ({ one }) => ({
  tenant: one(tenants, {
    fields: [patients.tenantId],
    references: [tenants.id],
  }),
  client: one(clients, {
    fields: [patients.clientId],
    references: [clients.id],
  }),
  species: one(species, {
    fields: [patients.speciesId],
    references: [species.id],
  }),
  breed: one(breeds, {
    fields: [patients.breedId],
    references: [breeds.id],
    relationName: 'primaryBreed',
  }),
  crossBreed: one(breeds, {
    fields: [patients.crossBreedId],
    references: [breeds.id],
    relationName: 'crossBreed',
  }),
}));


// ═══════════════════════════════════════════════════════
// FINANCIAL TABLES
// ═══════════════════════════════════════════════════════

export const chartOfAccountsRelations = relations(chartOfAccounts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [chartOfAccounts.tenantId],
    references: [tenants.id],
  }),
  parent: one(chartOfAccounts, {
    fields: [chartOfAccounts.parentId],
    references: [chartOfAccounts.id],
    relationName: 'parentAccount',
  }),
  children: many(chartOfAccounts, {
    relationName: 'parentAccount',
  }),
  salesTaxCodes: many(taxCodes, {
    relationName: 'salesTaxAccount',
  }),
  purchaseTaxCodes: many(taxCodes, {
    relationName: 'purchaseTaxAccount',
  }),
  itemGroupInventoryAccounts: many(itemGroups, {
    relationName: 'itemGroupInventoryAccount',
  }),
  itemGroupCogsAccounts: many(itemGroups, {
    relationName: 'itemGroupCogsAccount',
  }),
  itemGroupPurchaseAccounts: many(itemGroups, {
    relationName: 'itemGroupPurchaseAccount',
  }),
  itemGroupRevenueAccounts: many(itemGroups, {
    relationName: 'itemGroupRevenueAccount',
  }),
}));

export const taxCodesRelations = relations(taxCodes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [taxCodes.tenantId],
    references: [tenants.id],
  }),
  salesTaxAccount: one(chartOfAccounts, {
    fields: [taxCodes.salesTaxAccountId],
    references: [chartOfAccounts.id],
    relationName: 'salesTaxAccount',
  }),
  purchaseTaxAccount: one(chartOfAccounts, {
    fields: [taxCodes.purchaseTaxAccountId],
    references: [chartOfAccounts.id],
    relationName: 'purchaseTaxAccount',
  }),
  itemGroupsSales: many(itemGroups, { relationName: 'itemGroupSalesTax' }),
  itemGroupsPurchases: many(itemGroups, { relationName: 'itemGroupPurchaseTax' }),
}));

export const documentNumberSeriesRelations = relations(documentNumberSeries, ({ one }) => ({
  tenant: one(tenants, {
    fields: [documentNumberSeries.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [documentNumberSeries.branchId],
    references: [branches.id],
  }),
}));

export const postingPeriodsRelations = relations(postingPeriods, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [postingPeriods.tenantId],
    references: [tenants.id],
  }),
  subPeriods: many(postingSubPeriods),
}));

export const postingSubPeriodsRelations = relations(postingSubPeriods, ({ one }) => ({
  tenant: one(tenants, {
    fields: [postingSubPeriods.tenantId],
    references: [tenants.id],
  }),
  postingPeriod: one(postingPeriods, {
    fields: [postingSubPeriods.postingPeriodId],
    references: [postingPeriods.id],
  }),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [journalEntries.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [journalEntries.branchId],
    references: [branches.id],
  }),
  createdByUser: one(users, {
    fields: [journalEntries.createdBy],
    references: [users.id],
  }),
  reversalOf: one(journalEntries, {
    fields: [journalEntries.reversalOfId],
    references: [journalEntries.id],
    relationName: 'reversalOf',
  }),
  reversedBy: one(journalEntries, {
    fields: [journalEntries.reversedById],
    references: [journalEntries.id],
    relationName: 'reversedBy',
  }),
  lines: many(journalEntryLines),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  tenant: one(tenants, {
    fields: [journalEntryLines.tenantId],
    references: [tenants.id],
  }),
  journalEntry: one(journalEntries, {
    fields: [journalEntryLines.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(chartOfAccounts, {
    fields: [journalEntryLines.accountId],
    references: [chartOfAccounts.id],
  }),
}));


// ═══════════════════════════════════════════════════════
// INVENTORY TABLES
// ═══════════════════════════════════════════════════════

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [warehouses.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [warehouses.branchId],
    references: [branches.id],
  }),
  inventoryAccount: one(chartOfAccounts, {
    fields: [warehouses.inventoryAccountId],
    references: [chartOfAccounts.id],
    relationName: 'warehouseInventoryAccount',
  }),
  cogsAccount: one(chartOfAccounts, {
    fields: [warehouses.cogsAccountId],
    references: [chartOfAccounts.id],
    relationName: 'warehouseCogsAccount',
  }),
  priceDifferenceAccount: one(chartOfAccounts, {
    fields: [warehouses.priceDifferenceAccountId],
    references: [chartOfAccounts.id],
    relationName: 'warehousePriceDiffAccount',
  }),
  revenueAccount: one(chartOfAccounts, {
    fields: [warehouses.revenueAccountId],
    references: [chartOfAccounts.id],
    relationName: 'warehouseRevenueAccount',
  }),
  expenseAccount: one(chartOfAccounts, {
    fields: [warehouses.expenseAccountId],
    references: [chartOfAccounts.id],
    relationName: 'warehouseExpenseAccount',
  }),
  items: many(items),
}));

export const itemGroupsRelations = relations(itemGroups, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [itemGroups.tenantId],
    references: [tenants.id],
  }),
  inventoryAccount: one(chartOfAccounts, {
    fields: [itemGroups.inventoryAccountId],
    references: [chartOfAccounts.id],
    relationName: 'itemGroupInventoryAccount',
  }),
  cogsAccount: one(chartOfAccounts, {
    fields: [itemGroups.cogsAccountId],
    references: [chartOfAccounts.id],
    relationName: 'itemGroupCogsAccount',
  }),
  purchaseAccount: one(chartOfAccounts, {
    fields: [itemGroups.purchaseAccountId],
    references: [chartOfAccounts.id],
    relationName: 'itemGroupPurchaseAccount',
  }),
  revenueAccount: one(chartOfAccounts, {
    fields: [itemGroups.revenueAccountId],
    references: [chartOfAccounts.id],
    relationName: 'itemGroupRevenueAccount',
  }),
  defaultSalesTaxCode: one(taxCodes, {
    fields: [itemGroups.defaultSalesTaxCodeId],
    references: [taxCodes.id],
    relationName: 'itemGroupSalesTax',
  }),
  defaultPurchaseTaxCode: one(taxCodes, {
    fields: [itemGroups.defaultPurchaseTaxCodeId],
    references: [taxCodes.id],
    relationName: 'itemGroupPurchaseTax',
  }),
  items: many(items),
}));


// ═══════════════════════════════════════════════════════
// UNIT OF MEASURES
// ═══════════════════════════════════════════════════════

export const unitOfMeasuresRelations = relations(unitOfMeasures, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [unitOfMeasures.tenantId],
    references: [tenants.id],
  }),
  itemsAsInventoryUom: many(items, { relationName: 'itemInventoryUom' }),
  itemsAsPurchaseUom: many(items, { relationName: 'itemPurchaseUom' }),
  itemsAsSalesUom: many(items, { relationName: 'itemSalesUom' }),
}));


// ═══════════════════════════════════════════════════════
// ITEMS (Item Master Data)
// ═══════════════════════════════════════════════════════

export const itemsRelations = relations(items, ({ one }) => ({
  tenant: one(tenants, {
    fields: [items.tenantId],
    references: [tenants.id],
  }),
  itemGroup: one(itemGroups, {
    fields: [items.itemGroupId],
    references: [itemGroups.id],
  }),
  inventoryUom: one(unitOfMeasures, {
    fields: [items.inventoryUomId],
    references: [unitOfMeasures.id],
    relationName: 'itemInventoryUom',
  }),
  purchaseUom: one(unitOfMeasures, {
    fields: [items.purchaseUomId],
    references: [unitOfMeasures.id],
    relationName: 'itemPurchaseUom',
  }),
  salesUom: one(unitOfMeasures, {
    fields: [items.salesUomId],
    references: [unitOfMeasures.id],
    relationName: 'itemSalesUom',
  }),
  defaultWarehouse: one(warehouses, {
    fields: [items.defaultWarehouseId],
    references: [warehouses.id],
  }),
}));
