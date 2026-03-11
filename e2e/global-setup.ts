/**
 * Playwright Global Setup — Seed test data + authenticate 3 test users
 *
 * On CI, the TEST database only has the SYSTEM tenant (auto-seeded on startup).
 * This setup creates PETCARE + PETCAREPLUS tenants and their users via API
 * before authenticating all 3 users and saving storageState.
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

/** Helper: create tenant + admin user if not exists */
async function ensureTenant(
  request: any,
  headers: Record<string, string>,
  existingTenants: { code: string; id: string }[],
  tenantConfig: { code: string; name: string; contactEmail: string },
  userConfig: { firstName: string; lastName: string; email: string; password: string }
) {
  const existing = existingTenants.find((t) => t.code === tenantConfig.code);
  let tenantId = existing?.id;

  // Create tenant if not exists
  if (!tenantId) {
    const res = await request.post(`${API}/system/tenants/advanced`, {
      headers,
      data: {
        name: tenantConfig.name,
        code: tenantConfig.code,
        countryCode: 'AE',
        subscriptionPlan: 'professional',
        contactEmail: tenantConfig.contactEmail,
        defaultLanguage: 'en',
      },
    });
    expect(res.ok(), `Failed to create ${tenantConfig.code}: ${res.status()}`).toBeTruthy();
    const body = await res.json();
    tenantId = body.data?.id;
  }

  // Create user (idempotent — ignore "already exists")
  if (tenantId) {
    const res = await request.post(`${API}/system/users`, {
      headers,
      data: {
        userType: 'tenant_admin',
        firstName: userConfig.firstName,
        lastName: userConfig.lastName,
        email: userConfig.email,
        password: userConfig.password,
        tenantId,
      },
    });
    if (!res.ok()) {
      const body = await res.json().catch(() => ({}));
      const msg = (body.error || body.message || '').toLowerCase();
      if (!msg.includes('already exists') && !msg.includes('duplicate')) {
        expect.soft(res.ok(), `Failed to create user ${userConfig.email}: ${res.status()} ${msg}`).toBeTruthy();
      }
    }
  }
}

/**
 * Seed test tenants and users via system API.
 * Idempotent — skips creation if tenant/user already exists.
 */
setup('seed test data', async ({ request }) => {
  // Each tenant advanced creation takes ~30s on CI (COA, DPF, posting periods)
  setup.setTimeout(180_000);

  // 1. Login as system admin
  const loginRes = await request.post(`${API}/auth/login`, {
    data: {
      tenantCode: 'SYSTEM',
      email: 'superadmin@system.local',
      password: 'Admin@123',
    },
  });
  expect(loginRes.ok(), `System admin login failed: ${loginRes.status()}`).toBeTruthy();
  const { accessToken } = await loginRes.json();
  const headers = { Authorization: `Bearer ${accessToken}` };

  // 2. Fetch existing tenants
  const tenantsRes = await request.get(`${API}/system/tenants?limit=100`, { headers });
  expect(tenantsRes.ok()).toBeTruthy();
  const tenantsData = await tenantsRes.json();
  const existingTenants = (tenantsData.data?.data || tenantsData.data || []) as { code: string; id: string }[];

  // 3. Ensure PETCARE tenant + admin user
  await ensureTenant(request, headers, existingTenants,
    { code: 'PETCARE', name: 'PetCare Clinic', contactEmail: 'admin@petcare.vet' },
    { firstName: 'Tenant', lastName: 'Admin', email: 'tenantadmin@petcare.vet', password: 'Test@123' }
  );

  // 4. Ensure PETCAREPLUS tenant + app user
  await ensureTenant(request, headers, existingTenants,
    { code: 'PETCAREPLUS', name: 'PetCare Plus Veterinary', contactEmail: 'admin@petcareplus.vet' },
    { firstName: 'Doctor', lastName: 'User', email: 'doctor@petcareplus.vet', password: 'Test@123' }
  );
});

/**
 * Authenticate each test user via UI and save storageState
 */
for (const user of TEST_USERS) {
  setup(`authenticate as ${user.name}`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.getByLabel(/tenant/i).fill(user.tenantCode);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // Wait for redirect away from login page
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

    // Save authenticated state
    await page.context().storageState({ path: user.storageFile });
  });
}
