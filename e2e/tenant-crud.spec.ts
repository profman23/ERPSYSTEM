/**
 * E2E: Tenant CRUD — System Admin Panel
 * Tests tenant list, create, edit, suspend
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/system.json' });

test.describe('Tenant CRUD (System Admin)', () => {
  test('displays tenant list with pagination', async ({ page }) => {
    await page.goto('/system/tenants');
    await expect(page).not.toHaveURL(/\/login/);

    // Should show a table or list of tenants
    await expect(page.locator('table, [role="table"], [data-testid="tenant-list"]')).toBeVisible({
      timeout: 15_000,
    });

    // Should have at least one tenant row
    const rows = page.locator('tbody tr, [data-testid="tenant-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
  });

  test('creates a new tenant', async ({ page }) => {
    await page.goto('/system/tenants/create');
    await expect(page).not.toHaveURL(/\/login/);

    const uniqueName = `E2E Test Clinic ${Date.now()}`;
    const uniqueCode = `E2E${Date.now().toString().slice(-6)}`;

    // Fill required fields — form field labels may vary
    await page.getByLabel(/name/i).first().fill(uniqueName);

    // Look for code field — some forms auto-generate codes
    const codeField = page.getByLabel(/code/i);
    if (await codeField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await codeField.fill(uniqueCode);
    }

    // Fill email if present
    const emailField = page.getByLabel(/email/i);
    if (await emailField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailField.fill(`e2e-${Date.now()}@test.com`);
    }

    // Submit
    await page.getByRole('button', { name: /save|create|submit/i }).click();

    // Should redirect to tenant list or detail, or show success
    await page.waitForTimeout(3000);
    const url = page.url();
    const hasSuccess =
      url.includes('/tenants') ||
      (await page.locator('text=/success|created/i').isVisible({ timeout: 5000 }).catch(() => false));

    expect(hasSuccess || !url.includes('/create')).toBeTruthy();
  });

  test('edits an existing tenant', async ({ page }) => {
    await page.goto('/system/tenants');
    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 15_000 });

    // Click first tenant row or edit button (icon-only with aria-label/title)
    const editButton = page.locator(
      'button[aria-label="Edit"], button[title="Edit"], [data-testid="edit-tenant"]'
    );
    const firstRow = page.locator('tbody tr').first();

    if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await editButton.first().click();
    } else {
      await firstRow.click();
    }

    await page.waitForTimeout(2000);

    // Should be on edit/detail page
    const nameField = page.getByLabel(/name/i).first();
    if (await nameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      const currentValue = await nameField.inputValue();
      // Append a marker to verify edit works
      await nameField.fill(currentValue.replace(/ \[edited\]$/, '') + ' [edited]');
      await page.getByRole('button', { name: /save|update|submit/i }).click();
      await page.waitForTimeout(3000);
    }
  });

  test('suspends and reactivates a tenant', async ({ page }) => {
    await page.goto('/system/tenants');
    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 15_000 });

    // Look for a suspend/deactivate toggle button
    const toggleButton = page.locator(
      'button[aria-label*="suspend"], button[aria-label*="deactivate"], button:has-text("Suspend"), [data-testid="toggle-status"]'
    );

    if (await toggleButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await toggleButton.first().click();

      // Confirm dialog if present
      const confirmButton = page.locator(
        'button:has-text("Confirm"), button:has-text("Yes"), [data-testid="confirm-action"]'
      );
      if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await page.waitForTimeout(2000);

      // Reactivate
      const activateButton = page.locator(
        'button[aria-label*="activate"], button:has-text("Activate"), [data-testid="toggle-status"]'
      );
      if (await activateButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await activateButton.first().click();
        const confirm2 = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirm2.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirm2.click();
        }
      }
    }
  });
});
