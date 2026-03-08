/**
 * Test Helpers — Factory functions and deterministic IDs for tests
 */

// Deterministic UUIDs for snapshot testing
export const TEST_TENANT_A = '00000000-0000-0000-0000-000000000001';
export const TEST_TENANT_B = '00000000-0000-0000-0000-000000000002';
export const TEST_USER_ID = '00000000-0000-0000-0000-000000000010';
export const TEST_USER_B_ID = '00000000-0000-0000-0000-000000000020';
export const TEST_BRANCH_ID = '00000000-0000-0000-0000-000000000100';
export const TEST_ROLE_ID = '00000000-0000-0000-0000-000000000200';

export function createTestSpecies(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    tenantId: TEST_TENANT_A,
    code: 'DOG',
    name: 'Dog',
    nameAr: 'كلب',
    description: null,
    icon: null,
    metadata: null,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createTestUser(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_A,
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    accessScope: 'tenant' as const,
    isActive: true,
    ...overrides,
  };
}
