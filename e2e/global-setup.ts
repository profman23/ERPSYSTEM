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

/**
 * Seed test tenants and users via system API.
 * Idempotent — skips creation if tenant/user already exists.
 */
setup('seed test data', async ({ request }) => {
  setup.setTimeout(60_000); // Tenant creation with full setup (COA, DPF, etc.) takes time
  // 1. Login as system admin to get an access token
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

  // 2. Check existing tenants
  const tenantsRes = await request.get(`${API}/system/tenants?limit=100`, { headers });
  expect(tenantsRes.ok()).toBeTruthy();
  const tenantsData = await tenantsRes.json();
  const existingCodes = new Set(
    (tenantsData.data?.data || tenantsData.data || []).map((t: { code: string }) => t.code)
  );

  // 3. Create PETCARE tenant if not exists
  let petcareId: string | null = null;
  if (!existingCodes.has('PETCARE')) {
    const createRes = await request.post(`${API}/system/tenants/advanced`, {
      headers,
      data: {
        name: 'PetCare Clinic',
        code: 'PETCARE',
        countryCode: 'AE',
        subscriptionPlan: 'professional',
        contactEmail: 'admin@petcare.vet',
        defaultLanguage: 'en',
      },
    });
    expect(createRes.ok(), `Failed to create PETCARE: ${createRes.status()}`).toBeTruthy();
    const created = await createRes.json();
    petcareId = created.data?.id;
  } else {
    // Find the existing tenant ID
    const tenant = (tenantsData.data?.data || tenantsData.data || []).find(
      (t: { code: string }) => t.code === 'PETCARE'
    );
    petcareId = tenant?.id;
  }

  // 4. Create PETCAREPLUS tenant if not exists
  let petcarePlusId: string | null = null;
  if (!existingCodes.has('PETCAREPLUS')) {
    const createRes = await request.post(`${API}/system/tenants/advanced`, {
      headers,
      data: {
        name: 'PetCare Plus Veterinary',
        code: 'PETCAREPLUS',
        countryCode: 'AE',
        subscriptionPlan: 'professional',
        contactEmail: 'admin@petcareplus.vet',
        defaultLanguage: 'en',
      },
    });
    expect(createRes.ok(), `Failed to create PETCAREPLUS: ${createRes.status()}`).toBeTruthy();
    const created = await createRes.json();
    petcarePlusId = created.data?.id;
  } else {
    const tenant = (tenantsData.data?.data || tenantsData.data || []).find(
      (t: { code: string }) => t.code === 'PETCAREPLUS'
    );
    petcarePlusId = tenant?.id;
  }

  // 5. Create tenant admin user for PETCARE if not exists
  if (petcareId) {
    const createUserRes = await request.post(`${API}/system/users`, {
      headers,
      data: {
        userType: 'tenant_admin',
        firstName: 'Tenant',
        lastName: 'Admin',
        email: 'tenantadmin@petcare.vet',
        password: 'Test@123',
        tenantId: petcareId,
      },
    });
    // 201 = created, 400/409 = already exists (both OK)
    if (!createUserRes.ok()) {
      const body = await createUserRes.json().catch(() => ({}));
      const msg = body.error || body.message || '';
      // Only fail if it's NOT a duplicate error
      if (!msg.toLowerCase().includes('already exists') && !msg.toLowerCase().includes('duplicate')) {
        expect(createUserRes.ok(), `Failed to create PETCARE admin: ${createUserRes.status()} ${msg}`).toBeTruthy();
      }
    }
  }

  // 6. Create app user for PETCAREPLUS if not exists
  if (petcarePlusId) {
    const createUserRes = await request.post(`${API}/system/users`, {
      headers,
      data: {
        userType: 'tenant_admin',
        firstName: 'Doctor',
        lastName: 'User',
        email: 'doctor@petcareplus.vet',
        password: 'Test@123',
        tenantId: petcarePlusId,
      },
    });
    if (!createUserRes.ok()) {
      const body = await createUserRes.json().catch(() => ({}));
      const msg = body.error || body.message || '';
      if (!msg.toLowerCase().includes('already exists') && !msg.toLowerCase().includes('duplicate')) {
        expect(createUserRes.ok(), `Failed to create PETCAREPLUS user: ${createUserRes.status()} ${msg}`).toBeTruthy();
      }
    }
  }
});

/**
 * Authenticate each test user via UI and save storageState
 */
for (const user of TEST_USERS) {
  setup(`authenticate as ${user.name}`, async ({ page }) => {
    // Login via the UI
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.getByLabel(/tenant/i).fill(user.tenantCode);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // Wait for redirect away from login page (dashboard or panel home)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

    // Save authenticated state
    await page.context().storageState({ path: user.storageFile });
  });
}
