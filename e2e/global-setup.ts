/**
 * Playwright Global Setup — Authenticate 3 test users and save storageState
 */
import { test as setup, expect } from '@playwright/test';

const API = 'http://localhost:5500/api/v1';

const TEST_USERS = [
  {
    name: 'system',
    email: 'superadmin@system.local',
    password: 'Admin@123',
    tenantCode: 'SYSTEM',
    storageFile: 'e2e/.auth/system.json',
  },
  {
    name: 'admin',
    email: 'tenantadmin@petcare.vet',
    password: 'Test@123',
    tenantCode: 'PETCARE',
    storageFile: 'e2e/.auth/admin.json',
  },
  {
    name: 'app',
    email: 'doctor@petcareplus.vet',
    password: 'Test@123',
    tenantCode: 'PETCAREPLUS',
    storageFile: 'e2e/.auth/app.json',
  },
];

for (const user of TEST_USERS) {
  setup(`authenticate as ${user.name}`, async ({ page }) => {
    // Login via the UI
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByLabel(/tenant/i).fill(user.tenantCode);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // Wait for redirect away from login page (dashboard or panel home)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

    // Save authenticated state
    await page.context().storageState({ path: user.storageFile });
  });
}
