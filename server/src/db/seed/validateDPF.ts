/**
 * DPF Validation Script
 * Comprehensive end-to-end validation of DPF structure
 */

import { db } from '../index';
import { eq } from 'drizzle-orm';
import {
  tenants,
  dpfModules,
  dpfScreens,
  dpfActions,
  dpfPermissions,
} from '../schemas';
import { getDPFStatistics } from '../../rbac/dpfStructure';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
}

export async function validateDPFComplete(): Promise<void> {
  console.log('\n' + '═'.repeat(80));
  console.log('  🔍 DPF SYSTEM VALIDATION - COMPREHENSIVE AUDIT');
  console.log('═'.repeat(80) + '\n');

  const results: ValidationResult[] = [];

  try {
    // 1. Validate SYSTEM tenant exists
    console.log('1️⃣ Validating SYSTEM tenant...');
    const systemTenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.code, 'SYSTEM'))
      .limit(1);

    if (systemTenant.length === 0) {
      results.push({
        passed: false,
        message: 'SYSTEM tenant not found',
      });
    } else {
      results.push({
        passed: true,
        message: 'SYSTEM tenant exists',
        details: { id: systemTenant[0].id, code: systemTenant[0].code },
      });
      
      const tenantId = systemTenant[0].id;

      // 2. Validate module count
      console.log('2️⃣ Validating modules...');
      const modules = await db
        .select()
        .from(dpfModules)
        .where(eq(dpfModules.tenantId, tenantId));

      const expectedModules = getDPFStatistics().totalModules;
      results.push({
        passed: modules.length === expectedModules,
        message: `Modules count: ${modules.length}/${expectedModules}`,
        details: modules.map(m => ({ code: m.moduleCode, name: m.moduleName })),
      });

      // 3. Validate screen count
      console.log('3️⃣ Validating screens...');
      const screens = await db
        .select()
        .from(dpfScreens)
        .where(eq(dpfScreens.tenantId, tenantId));

      const expectedScreens = getDPFStatistics().totalScreens;
      results.push({
        passed: screens.length === expectedScreens,
        message: `Screens count: ${screens.length}/${expectedScreens}`,
        details: screens.map(s => ({ code: s.screenCode, name: s.screenName })),
      });

      // 4. Validate action count
      console.log('4️⃣ Validating actions...');
      const actions = await db
        .select()
        .from(dpfActions)
        .where(eq(dpfActions.tenantId, tenantId));

      const expectedActions = getDPFStatistics().totalActions;
      results.push({
        passed: actions.length === expectedActions,
        message: `Actions count: ${actions.length}/${expectedActions}`,
        details: actions.map(a => ({ code: a.actionCode, type: a.actionType })),
      });

      // 5. Validate permission count
      console.log('5️⃣ Validating permissions...');
      const permissions = await db
        .select()
        .from(dpfPermissions)
        .where(eq(dpfPermissions.tenantId, tenantId));

      results.push({
        passed: permissions.length >= expectedActions,
        message: `Permissions count: ${permissions.length} (expected >= ${expectedActions})`,
        details: permissions.map(p => ({ code: p.permissionCode, type: p.permissionType })),
      });

      // 6. Validate all actions have permissions
      console.log('6️⃣ Validating action-permission mapping...');
      const actionsWithoutPermissions = actions.filter(action => {
        return !permissions.some(p => p.actionId === action.id);
      });

      results.push({
        passed: actionsWithoutPermissions.length === 0,
        message: `Actions without permissions: ${actionsWithoutPermissions.length}`,
        details: actionsWithoutPermissions.map(a => a.actionCode),
      });

      // 7. Validate tenant isolation
      console.log('7️⃣ Validating tenant isolation...');
      const allModules = await db.select().from(dpfModules);
      const allScreens = await db.select().from(dpfScreens);
      const allActions = await db.select().from(dpfActions);
      const allPermissions = await db.select().from(dpfPermissions);

      const systemModules = allModules.filter(m => m.tenantId === tenantId);
      const systemScreens = allScreens.filter(s => s.tenantId === tenantId);
      const systemActions = allActions.filter(a => a.tenantId === tenantId);
      const systemPermissions = allPermissions.filter(p => p.tenantId === tenantId);

      results.push({
        passed: 
          systemModules.length === allModules.length &&
          systemScreens.length === allScreens.length &&
          systemActions.length === allActions.length &&
          systemPermissions.length === allPermissions.length,
        message: 'Tenant isolation verified (only SYSTEM tenant data exists)',
        details: {
          totalModules: allModules.length,
          totalScreens: allScreens.length,
          totalActions: allActions.length,
          totalPermissions: allPermissions.length,
        },
      });

      // 8. Validate critical modules exist
      console.log('8️⃣ Validating critical modules...');
      const criticalModules = ['ADMIN', 'PATIENT_MGMT', 'CLINICAL', 'FINANCE'];
      const existingModuleCodes = modules.map(m => m.moduleCode);
      const missingCritical = criticalModules.filter(code => !existingModuleCodes.includes(code));

      results.push({
        passed: missingCritical.length === 0,
        message: `Critical modules present: ${criticalModules.length - missingCritical.length}/${criticalModules.length}`,
        details: { missing: missingCritical },
      });

      // 9. Validate RBAC structure (roles module)
      console.log('9️⃣ Validating RBAC structure...');
      const adminModule = modules.find(m => m.moduleCode === 'ADMIN');
      if (adminModule) {
        const rolesScreen = screens.find(s => s.moduleId === adminModule.id && s.screenCode === 'ROLES');
        const rolesActions = actions.filter(a => a.moduleId === adminModule.id && a.actionCode?.startsWith('roles.'));

        results.push({
          passed: rolesScreen !== undefined && rolesActions.length >= 4,
          message: `RBAC structure validated (Roles screen + ${rolesActions.length} actions)`,
          details: {
            rolesScreen: rolesScreen?.screenCode,
            rolesActions: rolesActions.map(a => a.actionCode),
          },
        });
      }
    }

    // Print results
    console.log('\n' + '═'.repeat(80));
    console.log('  📊 VALIDATION RESULTS');
    console.log('═'.repeat(80) + '\n');

    let passedCount = 0;
    let failedCount = 0;

    results.forEach((result, index) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.message}`);
      
      if (result.passed) {
        passedCount++;
      } else {
        failedCount++;
        if (result.details) {
          console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
        }
      }
    });

    console.log('\n' + '═'.repeat(80));
    console.log(`  SUMMARY: ${passedCount}/${results.length} checks passed`);
    
    if (failedCount === 0) {
      console.log('  🎉 ALL VALIDATIONS PASSED - DPF SYSTEM READY FOR PRODUCTION');
    } else {
      console.log(`  ⚠️  ${failedCount} VALIDATION(S) FAILED - REVIEW REQUIRED`);
    }
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    throw error;
  }
}

// Auto-run validation when executed directly
validateDPFComplete()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
