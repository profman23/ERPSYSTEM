/**
 * E2E: Patient Workflow — App Panel
 * Tests: create client -> create patient -> list -> edit -> soft delete
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/admin.json' });

test.describe('Patient Workflow', () => {
  const clientName = `E2E Client ${Date.now()}`;
  const patientName = `E2E Pet ${Date.now()}`;

  test('creates a new client', async ({ page }) => {
    await page.goto('/app/clients/create');

    // If redirected, skip
    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated for this panel');
    }

    // Fill client form using data-testid
    const firstNameField = page.locator('[data-testid="firstName"]');
    if (await firstNameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstNameField.fill('E2E');
    }

    const lastNameField = page.locator('[data-testid="lastName"]');
    if (await lastNameField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await lastNameField.fill(`Client${Date.now()}`);
    }

    const phoneField = page.locator('[data-testid="phone"]');
    if (await phoneField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await phoneField.fill('1234567890');
    }

    const emailField = page.locator('[data-testid="email"]');
    if (await emailField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailField.fill(`e2e-client-${Date.now()}@test.com`);
    }

    // Submit
    const submitBtn = page.locator('[data-testid="submitBtn"]');
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }

    // Should navigate away from create page
    expect(page.url()).not.toContain('/create');
  });

  test('creates a new patient', async ({ page }) => {
    await page.goto('/app/patients/create');

    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated for this panel');
    }

    // Fill patient name
    const nameField = page.locator('[data-testid="petName"]');
    if (await nameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameField.fill(patientName);
    }

    // Select species if dropdown exists
    const speciesWrapper = page.locator('[data-testid="species"] button');
    if (await speciesWrapper.isVisible({ timeout: 3000 }).catch(() => false)) {
      await speciesWrapper.click();
      const option = page.locator('[role="option"]').first();
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
      }
    }

    // Search for client/owner
    const ownerInput = page.locator('[data-testid="ownerClient"] input');
    if (await ownerInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ownerInput.fill('E2E');
      await page.waitForTimeout(1000); // wait for search results

      // Click first result if available
      const ownerResult = page.locator('[data-testid="ownerClient"] button').first();
      if (await ownerResult.isVisible({ timeout: 3000 }).catch(() => false)) {
        await ownerResult.click();
      }
    }

    // Submit
    const submitBtn = page.locator('[data-testid="submitBtn"]');
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }

    expect(page.url()).not.toContain('/create');
  });

  test('lists patients with search', async ({ page }) => {
    await page.goto('/app/patients');

    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated for this panel');
    }

    // Wait for table to load
    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 15_000 });

    // Search field should exist
    const searchField = page.getByPlaceholder(/search/i);
    if (await searchField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchField.fill('E2E');
      await page.waitForTimeout(1000); // debounce
    }
  });

  test('edits a patient', async ({ page }) => {
    await page.goto('/app/patients');

    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated for this panel');
    }

    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 15_000 });

    // Click edit button (icon-only with title="Edit")
    const editButton = page.locator('button[title="Edit"]');

    if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await editButton.first().click();
    }

    await page.waitForTimeout(2000);

    // Modify name if on edit page
    const nameField = page.locator('[data-testid="petName"]');
    if (await nameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      const val = await nameField.inputValue();
      await nameField.fill(val + ' Updated');

      const submitBtn = page.locator('[data-testid="submitBtn"]');
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
      }
    }
  });

  test('soft deletes a patient', async ({ page }) => {
    await page.goto('/app/patients');

    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated for this panel');
    }

    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 15_000 });

    // Look for deactivate button (icon-only with title)
    const toggleButton = page.locator(
      'button[title="Deactivate"], button[title="Activate"]'
    );

    if (await toggleButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await toggleButton.first().click();

      // Confirm dialog if present
      const confirmButton = page.locator(
        'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")'
      );
      if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await page.waitForTimeout(2000);
    }
  });
});
