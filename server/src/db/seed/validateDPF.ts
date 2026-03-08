/**
 * DPF Validation Script (SAP B1 Style)
 * Comprehensive end-to-end validation of DPF structure
 */

import { db } from '../index';
import { eq } from 'drizzle-orm';
import { tenants, dpfModules, dpfScreens } from '../schemas';
import { getDPFStatistics } from '../../rbac/dpfStructure';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
}

export async function validateDPFComplete(): Promise<void> {
  console.log('\n' + '═'.repeat(80));
  console.log('  DPF SYSTEM VALIDATION (SAP B1 Style) - COMPREHENSIVE AUDIT');
  console.log('═'.repeat(80) + '\n');

  const results: ValidationResult[] = [];

  try {
    // 1. Validate SYSTEM tenant exists
    console.log('1. Validating SYSTEM tenant...');
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
      console.log('2. Validating modules...');
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
      console.log('3. Validating screens...');
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

      // 4. Validate tenant isolation
      console.log('4. Validating tenant isolation...');
      const allModules = await db.select().from(dpfModules);
      const allScreens = await db.select().from(dpfScreens);

      const systemModules = allModules.filter(m => m.tenantId === tenantId);
      const systemScreens = allScreens.filter(s => s.tenantId === tenantId);

      results.push({
        passed:
          systemModules.length === allModules.length &&
          systemScreens.length === allScreens.length,
        message: 'Tenant isolation verified (only SYSTEM tenant data exists)',
        details: {
          totalModules: allModules.length,
          totalScreens: allScreens.length,
        },
      });

      // 5. Validate critical modules exist
      console.log('5. Validating critical modules...');
      const criticalModules = ['ADMIN', 'PATIENT_MGMT', 'CLINICAL', 'FINANCE'];
      const existingModuleCodes = modules.map(m => m.moduleCode);
      const missingCritical = criticalModules.filter(code => !existingModuleCodes.includes(code));

      results.push({
        passed: missingCritical.length === 0,
        message: `Critical modules present: ${criticalModules.length - missingCritical.length}/${criticalModules.length}`,
        details: { missing: missingCritical },
      });

      // 6. Validate RBAC structure (roles screen exists)
      console.log('6. Validating RBAC structure...');
      const adminModule = modules.find(m => m.moduleCode === 'ADMIN');
      if (adminModule) {
        const rolesScreen = screens.find(s => s.moduleId === adminModule.id && s.screenCode === 'ROLES');

        results.push({
          passed: rolesScreen !== undefined,
          message: `RBAC structure validated (Roles screen exists)`,
          details: {
            rolesScreen: rolesScreen?.screenCode,
          },
        });
      }
    }

    // Print results
    console.log('\n' + '═'.repeat(80));
    console.log('  VALIDATION RESULTS');
    console.log('═'.repeat(80) + '\n');

    let passedCount = 0;
    let failedCount = 0;

    results.forEach((result) => {
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
      console.log('  ALL VALIDATIONS PASSED - DPF SYSTEM READY FOR PRODUCTION');
    } else {
      console.log(`  ${failedCount} VALIDATION(S) FAILED - REVIEW REQUIRED`);
    }
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('Validation failed with error:', error);
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
