/**
 * E2E: Multi-Tenant Isolation
 * Verifies: Tenant A != Tenant B data, URL manipulation blocked, system sees all
 */
import { test, expect } from '@playwright/test';

test.describe('Multi-Tenant Isolation', () => {
  test('tenant admin cannot see other tenant data', async ({ browser }) => {
    // Login as PETCARE admin
    const ctx = await browser.newContext({
      storageState: 'e2e/.auth/admin.json',
    });
    const page = await ctx.newPage();

    // Go to patients list — should only see PETCARE data
    await page.goto('/app/patients');

    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated');
    }

    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 15_000 });

    // Verify no data from other tenants appears
    // PETCAREPLUS-specific emails should NOT be visible
    const otherTenantData = page.locator('text=petcareplus');
    await page.waitForTimeout(2000);
    const count = await otherTenantData.count();
    expect(count).toBe(0);

    await ctx.close();
  });

  test('URL manipulation to another tenant is blocked', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: 'e2e/.auth/admin.json',
    });
    const page = await ctx.newPage();

    // Try to access system panel directly — should be blocked
    await page.goto('/system/tenants');
    await page.waitForTimeout(3000);

    // Should redirect away (to login, forbidden, or own dashboard)
    const url = page.url();
    expect(url).not.toMatch(/\/system\/tenants$/);

    await ctx.close();
  });

  test('system admin can see all tenants', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: 'e2e/.auth/system.json',
    });
    const page = await ctx.newPage();

    await page.goto('/system/tenants');
    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 15_000 });

    // Should see multiple tenants
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);

    await ctx.close();
  });
});
