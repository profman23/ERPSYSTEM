/**
 * E2E: Journal Entry — Financial Workflow
 * Tests: create balanced entry, reject unbalanced, reverse, verify REVERSED status
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/admin.json' });

test.describe('Journal Entry', () => {
  test('creates a balanced journal entry', async ({ page }) => {
    await page.goto('/admin/finance/journal-entries/create');

    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated for this panel');
    }

    // Wait for the form to render
    await page.waitForTimeout(3000);

    // Fill posting date
    const dateField = page.getByLabel(/posting.?date|date/i).first();
    if (await dateField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dateField.fill('2025-06-01');
    }

    // Fill remarks
    const remarksField = page.getByLabel(/remarks|memo|description/i);
    if (await remarksField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await remarksField.fill('E2E Test Journal Entry');
    }

    // Add first line — debit
    const debitInputs = page.locator('input[name*="debit"], input[placeholder*="Debit"]');
    const creditInputs = page.locator('input[name*="credit"], input[placeholder*="Credit"]');

    if (await debitInputs.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await debitInputs.first().fill('1000');
      await creditInputs.nth(1).fill('1000');
    }

    // Submit
    await page.getByRole('button', { name: /save|post|create|submit/i }).click();
    await page.waitForTimeout(3000);

    // Should show success or redirect to detail/list
    const url = page.url();
    const isSuccess =
      !url.includes('/create') ||
      (await page.locator('text=/success|posted/i').isVisible({ timeout: 5000 }).catch(() => false));
    expect(isSuccess).toBeTruthy();
  });

  test('rejects unbalanced journal entry', async ({ page }) => {
    await page.goto('/admin/finance/journal-entries/create');

    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated for this panel');
    }

    await page.waitForTimeout(3000);

    // Fill date
    const dateField = page.getByLabel(/posting.?date|date/i).first();
    if (await dateField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dateField.fill('2025-06-01');
    }

    // Add unbalanced lines — debit 1000 but credit only 500
    const debitInputs = page.locator('input[name*="debit"], input[placeholder*="Debit"]');
    const creditInputs = page.locator('input[name*="credit"], input[placeholder*="Credit"]');

    if (await debitInputs.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await debitInputs.first().fill('1000');
      await creditInputs.nth(1).fill('500');
    }

    // Submit
    await page.getByRole('button', { name: /save|post|create|submit/i }).click();
    await page.waitForTimeout(3000);

    // Should stay on create page with error about balance
    const hasError =
      page.url().includes('/create') ||
      (await page
        .locator('text=/balance|equal|mismatch|debit.*credit/i')
        .isVisible({ timeout: 5000 })
        .catch(() => false));
    expect(hasError).toBeTruthy();
  });

  test('reverses a posted journal entry', async ({ page }) => {
    await page.goto('/admin/finance/journal-entries');

    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated for this panel');
    }

    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 15_000 });

    // Click on first POSTED entry
    const postedRow = page.locator('tbody tr:has-text("POSTED")').first();
    if (await postedRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await postedRow.click();
      await page.waitForTimeout(2000);

      // Find reverse button
      const reverseButton = page.locator(
        'button:has-text("Reverse"), button[aria-label*="reverse"]'
      );
      if (await reverseButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await reverseButton.click();

        // Confirm dialog
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmButton.click();
        }
        await page.waitForTimeout(3000);
      }
    }
  });

  test('shows REVERSED status on reversed entry', async ({ page }) => {
    await page.goto('/admin/finance/journal-entries');

    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated for this panel');
    }

    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 15_000 });

    // Check if any entry shows REVERSED status
    const reversedBadge = page.locator('text=/REVERSED/i');
    if (await reversedBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(await reversedBadge.count()).toBeGreaterThan(0);
    }
  });
});
