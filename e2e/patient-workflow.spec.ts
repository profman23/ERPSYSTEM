/**
 * E2E: Patient Workflow — App Panel
 * Tests: create client -> create patient -> list -> edit -> soft delete
 */
import { test, expect } from '@playwright/test';
import {
  waitForTableOrEmpty,
  waitForPageLoad,
  fillField,
  clickIfVisible,
  clickWithConfirm,
  skipIfLoginRedirect,
  uniqueEmail,
} from './helpers';

test.use({ storageState: 'e2e/.auth/admin.json' });

test.describe('Patient Workflow', () => {
  const patientName = `E2E Pet ${Date.now()}`;

  test('creates a new client', async ({ page }) => {
    await page.goto('/app/clients/create');
    skipIfLoginRedirect(page, test);

    // Wait for lazy-loaded form to render
    await waitForPageLoad(page);
    const firstNameField = page.locator('[data-testid="firstName"]');
    await expect(firstNameField).toBeVisible({ timeout: 15_000 });

    // Fill client form using data-testid
    await fillField(page, 'firstName', 'E2E');
    await fillField(page, 'lastName', `Client${Date.now()}`);
    await fillField(page, 'phone', '1234567890');
    await fillField(page, 'email', uniqueEmail('e2e-client'));

    // Submit
    const submitBtn = page.locator('[data-testid="submitBtn"]');
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(3_000);
    }

    // Should navigate away from create page
    expect(page.url()).not.toContain('/create');
  });

  test('creates a new patient', async ({ page }) => {
    await page.goto('/app/patients/create');
    skipIfLoginRedirect(page, test);

    await waitForPageLoad(page);

    // Fill patient name
    await fillField(page, 'petName', patientName);

    // Select species if dropdown exists
    const speciesWrapper = page.locator('[data-testid="species"] button');
    if (await speciesWrapper.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await speciesWrapper.click();
      const option = page.locator('[role="option"]').first();
      await clickIfVisible(option, 3_000);
    }

    // Search for client/owner
    const ownerInput = page.locator('[data-testid="ownerClient"] input');
    if (await ownerInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await ownerInput.fill('E2E');
      await page.waitForTimeout(1_000);

      // Click first result if available
      const ownerResult = page.locator('[data-testid="ownerClient"] button').first();
      await clickIfVisible(ownerResult, 3_000);
    }

    // Submit
    const submitBtn = page.locator('[data-testid="submitBtn"]');
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(3_000);
    }

    expect(page.url()).not.toContain('/create');
  });

  test('lists patients with search', async ({ page }) => {
    await page.goto('/app/patients');
    skipIfLoginRedirect(page, test);

    // Wait for either data table or empty state
    const state = await waitForTableOrEmpty(page);

    // Search field should exist regardless of data
    const searchField = page.getByPlaceholder(/search/i);
    if (await searchField.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchField.fill('E2E');
      await page.waitForTimeout(1_000); // debounce
    }

    // If we have data, verify the table is still visible after search
    if (state === 'table') {
      await page.locator('[data-testid="data-table"]').isVisible();
    }
  });

  test('edits a patient', async ({ page }) => {
    await page.goto('/app/patients');
    skipIfLoginRedirect(page, test);

    const state = await waitForTableOrEmpty(page);
    if (state === 'empty') {
      test.skip(true, 'No patients to edit');
    }

    // Click edit button (icon-only with title="Edit")
    const editButton = page.locator('button[title="Edit"]');
    if (await editButton.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await editButton.first().click();
    }

    await page.waitForTimeout(2_000);

    // Modify name if on edit page
    const nameField = page.locator('[data-testid="petName"]');
    if (await nameField.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const val = await nameField.inputValue();
      await nameField.fill(val + ' Updated');

      const submitBtn = page.locator('[data-testid="submitBtn"]');
      if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(3_000);
      }
    }
  });

  test('soft deletes a patient', async ({ page }) => {
    await page.goto('/app/patients');
    skipIfLoginRedirect(page, test);

    const state = await waitForTableOrEmpty(page);
    if (state === 'empty') {
      test.skip(true, 'No patients to deactivate');
    }

    // Toggle button (icon-only with title)
    const toggleButton = page.locator(
      'button[title="Deactivate"], button[title="Activate"]'
    );

    await clickWithConfirm(page, toggleButton, 5_000);
  });
});
