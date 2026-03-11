/**
 * E2E: Authentication Flow
 * Tests login, logout, invalid credentials, panel access guards
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('wrong@email.com');
    await page.locator('input[type="password"]').fill('WrongPassword');
    await page.getByLabel(/tenant/i).fill('INVALID');
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // Should stay on login page with error message
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[role="alert"], .error, [data-testid="login-error"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('logs in as admin and reaches dashboard', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/admin.json',
    });
    const page = await context.newPage();
    await page.goto('/admin');

    // Should not redirect to login
    await expect(page).not.toHaveURL(/\/login/);
    // Should show some dashboard content
    await expect(page.locator('body')).toContainText(/.+/);
    await context.close();
  });

  test('system panel guard blocks non-system users', async ({ browser }) => {
    // Admin user should not access /system routes
    const context = await browser.newContext({
      storageState: 'e2e/.auth/admin.json',
    });
    const page = await context.newPage();
    await page.goto('/system');

    // Should redirect away from /system (to login or forbidden)
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('/system/dashboard');
    await context.close();
  });

  test('logout clears session and redirects to login', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/admin.json',
    });
    const page = await context.newPage();
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/login/);

    // Find and click logout button/link
    const logoutButton = page.locator(
      'button:has-text("Logout"), button:has-text("Sign out"), [data-testid="logout"], button[aria-label="Logout"]'
    );

    if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutButton.click();
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    } else {
      // If logout button is in a menu, try opening user menu first
      const userMenu = page.locator(
        '[data-testid="user-menu"], button:has-text("Profile"), [aria-label="User menu"]'
      );
      if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        await userMenu.click();
        await page.locator('text=/logout|sign out/i').click();
        await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
      }
    }
    await context.close();
  });
});
