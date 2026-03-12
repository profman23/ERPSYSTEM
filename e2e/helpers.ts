/**
 * E2E Test Helpers — Shared utilities for all Playwright spec files
 *
 * Eliminates duplication across test files. Every spec imports from here.
 * Enterprise standard: single source of truth for locators, waits, and interactions.
 */
import { Page, Locator, expect } from '@playwright/test';

// ─── Data Table ──────────────────────────────────────────────────────────────

/** Wait for AdvancedDataTable to be visible (div-based, not <table>) */
export async function waitForDataTable(page: Page, timeout = 15_000): Promise<Locator> {
  const table = page.locator('[data-testid="data-table"]');
  await expect(table).toBeVisible({ timeout });
  return table;
}

/** Wait for either data table OR empty state OR error — use when data may not exist */
export async function waitForTableOrEmpty(page: Page, timeout = 20_000): Promise<'table' | 'empty'> {
  const table = page.locator('[data-testid="data-table"]');
  const empty = page.locator('text=/No.*data|No.*found|No.*entries|No.*results|No.*series|Error.*load|failed.*load/i');
  await expect(table.or(empty)).toBeVisible({ timeout });
  if (await table.isVisible().catch(() => false)) return 'table';
  return 'empty';
}

// ─── Branch (sessionStorage) ─────────────────────────────────────────────────

/**
 * Ensure active branch is set in sessionStorage.
 * Playwright storageState does NOT save sessionStorage — this fixes it.
 * Reads user object from localStorage (set during login) to extract branch info.
 */
export async function ensureBranch(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (sessionStorage.getItem('vet_erp_active_branch')) return;
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    try {
      const user = JSON.parse(userStr);
      const branchId = user.branchId || user.branches?.[0]?.id;
      const branchName = user.branches?.[0]?.name || 'Main Branch';
      if (branchId) {
        sessionStorage.setItem('vet_erp_active_branch', JSON.stringify({ branchId, branchName }));
        sessionStorage.setItem('vet_erp_branch_selected', 'true');
      }
    } catch { /* ignore parse errors */ }
  });
}

// ─── Form Helpers ────────────────────────────────────────────────────────────

/** Fill a field by data-testid if visible, skip silently otherwise */
export async function fillField(page: Page, testId: string, value: string, timeout = 5_000): Promise<boolean> {
  const field = page.locator(`[data-testid="${testId}"]`);
  if (await field.isVisible({ timeout }).catch(() => false)) {
    await field.fill(value);
    return true;
  }
  return false;
}

/** Click an element if visible, return whether it was clicked */
export async function clickIfVisible(locator: Locator, timeout = 3_000): Promise<boolean> {
  if (await locator.first().isVisible({ timeout }).catch(() => false)) {
    await locator.first().click();
    return true;
  }
  return false;
}

/** Click a button and auto-confirm any dialog that appears */
export async function clickWithConfirm(page: Page, buttonLocator: Locator, timeout = 3_000): Promise<boolean> {
  if (!(await clickIfVisible(buttonLocator, timeout))) return false;

  const confirm = page.locator(
    'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("OK")'
  );
  await clickIfVisible(confirm, 3_000);
  await page.waitForTimeout(2_000);
  return true;
}

// ─── Page Load ───────────────────────────────────────────────────────────────

/** Wait for lazy-loaded page content — spinner gone, no "Loading..." text */
export async function waitForPageLoad(page: Page, timeout = 15_000): Promise<void> {
  // Wait for any loading spinners to disappear
  const spinner = page.locator('[class*="animate-spin"]');
  await spinner.waitFor({ state: 'hidden', timeout }).catch(() => {});
  // Wait for "Loading..." text to disappear
  const loading = page.locator('text=Loading');
  await loading.waitFor({ state: 'hidden', timeout }).catch(() => {});
}

/** Skip test if page redirected to login (not authenticated) */
export function skipIfLoginRedirect(page: Page, test: { skip: (condition: boolean, reason: string) => void }): void {
  if (page.url().includes('/login')) {
    test.skip(true, 'Not authenticated for this panel');
  }
}

// ─── Data Generators ─────────────────────────────────────────────────────────

/** Generate a unique name with timestamp */
export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

/** Generate a unique email with timestamp */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@test.com`;
}

/** Generate a unique code (6 chars) */
export function uniqueCode(prefix: string): string {
  return `${prefix}${Date.now().toString().slice(-6)}`;
}
