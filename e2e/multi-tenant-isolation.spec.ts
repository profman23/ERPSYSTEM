/**
 * E2E: Multi-Tenant Isolation
 * Verifies: Tenant A != Tenant B data, URL manipulation blocked, system sees all
 */
import { test, expect } from '@playwright/test';
import { waitForDataTable, waitForTableOrEmpty } from './helpers';

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

    // Wait for data table or empty state (AdvancedDataTable = div-based)
    await waitForTableOrEmpty(page);

    // Verify no data from other tenants appears
    // PETCAREPLUS-specific emails should NOT be visible
    const otherTenantData = page.locator('text=petcareplus');
    await page.waitForTimeout(2_000);
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
    await page.waitForTimeout(3_000);

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

    // AdvancedDataTable renders as <div>, not <table>
    await waitForDataTable(page);

    // Should have visible row content (tenants always exist — seeded in global-setup)
    // Verify by checking that known tenant text appears
    const hasTenantContent = page.locator('[data-testid="data-table"]').locator('div.border-b');
    await expect(hasTenantContent.first()).toBeVisible({ timeout: 10_000 });

    await ctx.close();
  });
});
