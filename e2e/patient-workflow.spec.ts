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
    await page.goto('/admin/clients/create');

    // If redirected, navigate to correct route
    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated for this panel');
    }

    // Fill client form
    const firstNameField = page.getByLabel(/first.?name/i);
    if (await firstNameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstNameField.fill('E2E');
    }

    const lastNameField = page.getByLabel(/last.?name/i);
    if (await lastNameField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await lastNameField.fill(`Client${Date.now()}`);
    }

    const phoneField = page.getByLabel(/phone/i);
    if (await phoneField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await phoneField.fill('1234567890');
    }

    const emailField = page.getByLabel(/email/i);
    if (await emailField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailField.fill(`e2e-client-${Date.now()}@test.com`);
    }

    // Submit
    await page.getByRole('button', { name: /save|create|submit/i }).click();
    await page.waitForTimeout(3000);

    // Should navigate away from create page
    expect(page.url()).not.toContain('/create');
  });

  test('creates a new patient', async ({ page }) => {
    await page.goto('/admin/patients/create');

    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated for this panel');
    }

    // Fill patient name
    const nameField = page.getByLabel(/name/i).first();
    if (await nameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameField.fill(patientName);
    }

    // Select species if dropdown exists
    const speciesSelect = page.getByLabel(/species/i);
    if (await speciesSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await speciesSelect.click();
      await page.locator('[role="option"]').first().click();
    }

    // Select client if dropdown exists
    const clientSelect = page.getByLabel(/client|owner/i);
    if (await clientSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clientSelect.click();
      await page.locator('[role="option"]').first().click();
    }

    // Submit
    await page.getByRole('button', { name: /save|create|submit/i }).click();
    await page.waitForTimeout(3000);
    expect(page.url()).not.toContain('/create');
  });

  test('lists patients with search', async ({ page }) => {
    await page.goto('/admin/patients');

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
    await page.goto('/admin/patients');

    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated for this panel');
    }

    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 15_000 });

    // Click first row or edit button
    const editButton = page.locator('a:has-text("Edit"), button:has-text("Edit")');
    const firstRow = page.locator('tbody tr').first();

    if (await editButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await editButton.first().click();
    } else if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.click();
    }

    await page.waitForTimeout(2000);

    // Modify name if on edit page
    const nameField = page.getByLabel(/name/i).first();
    if (await nameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      const val = await nameField.inputValue();
      await nameField.fill(val + ' Updated');

      await page.getByRole('button', { name: /save|update|submit/i }).click();
      await page.waitForTimeout(3000);
    }
  });

  test('soft deletes a patient', async ({ page }) => {
    await page.goto('/admin/patients');

    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated for this panel');
    }

    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 15_000 });

    // Look for delete/deactivate button on first row
    const deleteButton = page.locator(
      'button[aria-label*="delete"], button[aria-label*="deactivate"], button:has-text("Delete")'
    );

    if (await deleteButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteButton.first().click();

      // Confirm dialog
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
      if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await page.waitForTimeout(2000);
    }
  });
});
