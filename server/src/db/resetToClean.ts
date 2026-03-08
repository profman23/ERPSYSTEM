/**
 * Enterprise Database Reset Script
 * Resets the database to a clean "fresh install" state
 *
 * PRESERVES:
 * - SYSTEM tenant record (only)
 * - superadmin@system.local user (only)
 * - SYSTEM tenant DPF structure (modules, screens)
 * - SYSTEM protected roles only (SYSTEM_ADMIN, SUPPORT_STAFF, BILLING_STAFF)
 *
 * DELETES (in FK-safe order):
 * - All non-system tenants and their cascaded data
 * - All non-superadmin users (including system users)
 * - All audit logs, quotas, rate limit buckets
 * - All auth tokens (forces re-login)
 * - Test table data
 *
 * Usage: npx tsx src/db/resetToClean.ts
 *
 * SAFETY:
 * - Uses a single transaction (all-or-nothing)
 * - Confirms SYSTEM tenant exists before proceeding
 * - Logs every step with counts
 * - Never drops tables or modifies schema
 */

import 'dotenv/config';
import { db, pool } from './index';
import { sql } from 'drizzle-orm';

const DIVIDER = '═'.repeat(70);

async function resetToClean(): Promise<void> {
  console.log(`\n${DIVIDER}`);
  console.log('  DATABASE RESET TO CLEAN STATE');
  console.log(`${DIVIDER}\n`);

  const startTime = Date.now();

  // ── Step 1: Verify SYSTEM tenant exists ──────────────────────
  const systemTenant = await db.execute<{ id: string; code: string }>(
    sql`SELECT id, code FROM tenants WHERE code = 'SYSTEM' LIMIT 1`
  );

  if (!systemTenant.rows || systemTenant.rows.length === 0) {
    console.error('FATAL: SYSTEM tenant not found. Aborting.');
    process.exit(1);
  }

  const systemTenantId = systemTenant.rows[0].id;
  console.log(`SYSTEM tenant: ${systemTenantId}`);

  // ── Step 2: Verify superadmin exists ─────────────────────────
  const superadmin = await db.execute<{ id: string; email: string }>(
    sql`SELECT id, email FROM users WHERE email = 'superadmin@system.local' LIMIT 1`
  );

  if (!superadmin.rows || superadmin.rows.length === 0) {
    console.error('FATAL: superadmin@system.local not found. Aborting.');
    process.exit(1);
  }

  const superadminId = superadmin.rows[0].id;
  console.log(`Superadmin: ${superadminId}`);

  // ── Step 3: Count current state ──────────────────────────────
  console.log(`\n--- Current State ---`);
  const counts = await Promise.all([
    db.execute(sql`SELECT count(*) as c FROM tenants`),
    db.execute(sql`SELECT count(*) as c FROM users`),
    db.execute(sql`SELECT count(*) as c FROM business_lines`),
    db.execute(sql`SELECT count(*) as c FROM branches`),
    db.execute(sql`SELECT count(*) as c FROM dpf_roles`),
    db.execute(sql`SELECT count(*) as c FROM dpf_user_roles`),
    db.execute(sql`SELECT count(*) as c FROM dpf_role_screen_authorizations`),
    db.execute(sql`SELECT count(*) as c FROM audit_logs`),
  ]);
  const labels = ['tenants', 'users', 'business_lines', 'branches', 'dpf_roles', 'dpf_user_roles', 'dpf_role_screen_authorizations', 'audit_logs'];
  labels.forEach((label, i) => {
    console.log(`  ${label}: ${counts[i].rows[0].c}`);
  });

  // ── Step 4: Execute cleanup in transaction ───────────────────
  console.log(`\n--- Cleaning (transaction) ---`);

  await db.execute(sql`BEGIN`);

  try {
    // Layer 1: Deepest leaf tables (no children reference them)
    const layer1 = [
      { table: 'test_table', query: sql`DELETE FROM test_table` },
      { table: 'rate_limit_buckets', query: sql`DELETE FROM rate_limit_buckets` },
      { table: 'quota_usage', query: sql`DELETE FROM quota_usage` },
      { table: 'tenant_quotas', query: sql`DELETE FROM tenant_quotas` },
      { table: 'audit_logs', query: sql`DELETE FROM audit_logs` },
    ];

    for (const { table, query } of layer1) {
      const result = await db.execute(query);
      console.log(`  [1] ${table}: ${result.rowCount} deleted`);
    }

    // Layer 2: AGI/AI tables (reference users + tenants)
    const layer2 = [
      { table: 'dpf_agi_usage_daily_aggregates', query: sql`DELETE FROM dpf_agi_usage_daily_aggregates` },
      { table: 'dpf_agi_usage', query: sql`DELETE FROM dpf_agi_usage` },
      { table: 'dpf_agi_approvals', query: sql`DELETE FROM dpf_agi_approvals` },
      { table: 'dpf_agi_settings', query: sql`DELETE FROM dpf_agi_settings` },
      { table: 'dpf_agi_logs', query: sql`DELETE FROM dpf_agi_logs` },
      { table: 'dpf_voice_logs', query: sql`DELETE FROM dpf_voice_logs` },
    ];

    for (const { table, query } of layer2) {
      const result = await db.execute(query);
      console.log(`  [2] ${table}: ${result.rowCount} deleted`);
    }

    // Layer 3: DPF user-level assignments (reference users, roles, branches)
    // Delete ALL dpf_user_roles — system roles reference non-superadmin users too
    const layer3 = [
      { table: 'dpf_user_role_branches', query: sql`DELETE FROM dpf_user_role_branches` },
      { table: 'dpf_user_custom_permissions', query: sql`DELETE FROM dpf_user_custom_permissions` },
      { table: 'dpf_user_roles', query: sql`DELETE FROM dpf_user_roles` },
      { table: 'auth_tokens', query: sql`DELETE FROM auth_tokens` },
    ];

    for (const { table, query } of layer3) {
      const result = await db.execute(query);
      console.log(`  [3] ${table}: ${result.rowCount} deleted`);
    }

    // Layer 4: ALL DPF role-level data (screen authorizations, role permissions)
    const layer4 = [
      { table: 'dpf_role_screen_authorizations', query: sql`DELETE FROM dpf_role_screen_authorizations` },
      { table: 'dpf_role_permissions', query: sql`DELETE FROM dpf_role_permissions` },
    ];

    for (const { table, query } of layer4) {
      const result = await db.execute(query);
      console.log(`  [4] ${table}: ${result.rowCount} deleted`);
    }

    // Layer 5: DPF roles — delete ALL non-system + non-protected system roles
    const l5a = await db.execute(
      sql`DELETE FROM dpf_roles WHERE tenant_id != ${systemTenantId}`
    );
    console.log(`  [5] dpf_roles (non-system): ${l5a.rowCount} deleted`);

    const l5b = await db.execute(
      sql`DELETE FROM dpf_roles WHERE tenant_id = ${systemTenantId} AND is_protected != 'true'`
    );
    console.log(`  [5] dpf_roles (system non-protected): ${l5b.rowCount} deleted`);

    // Layer 6: DPF structure for non-system tenants (permissions, actions, screens, modules)
    const layer6 = [
      { table: 'dpf_permissions (non-system)', query: sql`DELETE FROM dpf_permissions WHERE tenant_id != ${systemTenantId}` },
      { table: 'dpf_actions (non-system)', query: sql`DELETE FROM dpf_actions WHERE tenant_id != ${systemTenantId}` },
      { table: 'dpf_screens (non-system)', query: sql`DELETE FROM dpf_screens WHERE tenant_id != ${systemTenantId}` },
      { table: 'dpf_modules (non-system)', query: sql`DELETE FROM dpf_modules WHERE tenant_id != ${systemTenantId}` },
    ];

    for (const { table, query } of layer6) {
      const result = await db.execute(query);
      console.log(`  [6] ${table}: ${result.rowCount} deleted`);
    }

    // Layer 7: Domain tables (patients → clients, breeds → species)
    const layer7 = [
      { table: 'patients', query: sql`DELETE FROM patients` },
      { table: 'clients', query: sql`DELETE FROM clients` },
      { table: 'breeds', query: sql`DELETE FROM breeds` },
      { table: 'species', query: sql`DELETE FROM species` },
    ];

    for (const { table, query } of layer7) {
      const result = await db.execute(query);
      console.log(`  [7] ${table}: ${result.rowCount} deleted`);
    }

    // Layer 8: Users (keep superadmin only)
    const l8 = await db.execute(
      sql`DELETE FROM users WHERE id != ${superadminId}`
    );
    console.log(`  [8] users (non-superadmin): ${l8.rowCount} deleted`);

    // Layer 9: Hierarchy (branches → business_lines → roles [legacy])
    const layer9 = [
      { table: 'branch_capacity', query: sql`DELETE FROM branch_capacity` },
      { table: 'branches', query: sql`DELETE FROM branches` },
      { table: 'business_lines', query: sql`DELETE FROM business_lines` },
      { table: 'roles (legacy)', query: sql`DELETE FROM roles` },
    ];

    for (const { table, query } of layer9) {
      const result = await db.execute(query);
      console.log(`  [9] ${table}: ${result.rowCount} deleted`);
    }

    // Layer 10: Tenants (keep SYSTEM only — reservations will be recreated)
    const l10 = await db.execute(
      sql`DELETE FROM tenants WHERE code != 'SYSTEM'`
    );
    console.log(`  [10] tenants (all non-SYSTEM): ${l10.rowCount} deleted`);

    await db.execute(sql`COMMIT`);
    console.log('\n  TRANSACTION COMMITTED');

  } catch (error) {
    await db.execute(sql`ROLLBACK`);
    console.error('\n  TRANSACTION ROLLED BACK');
    console.error('Error:', error);
    process.exit(1);
  }

  // ── Step 5: Verify final state ───────────────────────────────
  console.log(`\n--- Final State ---`);
  const finalCounts = await Promise.all([
    db.execute(sql`SELECT count(*) as c FROM tenants`),
    db.execute(sql`SELECT count(*) as c FROM users`),
    db.execute(sql`SELECT count(*) as c FROM business_lines`),
    db.execute(sql`SELECT count(*) as c FROM branches`),
    db.execute(sql`SELECT count(*) as c FROM dpf_roles WHERE tenant_id = ${systemTenantId}`),
    db.execute(sql`SELECT count(*) as c FROM dpf_modules WHERE tenant_id = ${systemTenantId}`),
    db.execute(sql`SELECT count(*) as c FROM dpf_screens WHERE tenant_id = ${systemTenantId}`),
  ]);
  const finalLabels = ['tenants (SYSTEM only)', 'users (superadmin only)', 'business_lines', 'branches', 'dpf_roles (system protected)', 'dpf_modules (system)', 'dpf_screens (system)'];
  finalLabels.forEach((label, i) => {
    console.log(`  ${label}: ${finalCounts[i].rows[0].c}`);
  });

  const duration = Date.now() - startTime;
  console.log(`\n${DIVIDER}`);
  console.log(`  RESET COMPLETE — ${duration}ms`);
  console.log(`  Superadmin login: superadmin@system.local / Admin@123`);
  console.log(`${DIVIDER}\n`);
}

resetToClean()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    pool.end();
    process.exit(1);
  });
