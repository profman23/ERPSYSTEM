import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { createHookWrapper, createTestQueryClient } from '../test/renderWithProviders';
import { useTenant } from './useHierarchy';

const API = 'http://localhost:5500/api/v1';

const MOCK_HIERARCHY = {
  id: 't1',
  code: 'PETCARE',
  name: 'PetCare Clinic',
  defaultLanguage: 'en',
  country: 'SA',
  timezone: 'Asia/Riyadh',
  subscriptionPlan: 'enterprise',
  status: 'active',
  logoUrl: null,
  primaryColor: '#3B82F6',
  accentColor: '#10B981',
  contactEmail: 'info@petcare.vet',
  contactPhone: null,
  address: null,
  allowedBusinessLines: 5,
  allowedBranches: 10,
  allowedUsers: 50,
  storageLimitGB: 10,
  apiRateLimit: 5000,
  aiAssistantEnabled: true,
  settings: {},
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  businessLines: [
    {
      id: 'bl1',
      tenantId: 't1',
      code: 'VET',
      name: 'Veterinary',
      businessLineType: 'veterinary',
      description: null,
      logoUrl: null,
      primaryColor: null,
      contactEmail: null,
      contactPhone: null,
      settings: {},
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      branchCount: 1,
      totalUsers: 3,
      branches: [
        {
          id: 'br1',
          tenantId: 't1',
          businessLineId: 'bl1',
          code: 'MAIN',
          name: 'Main Branch',
          country: 'SA',
          city: 'Riyadh',
          state: null,
          postalCode: null,
          address: null,
          buildingNumber: null,
          district: null,
          vatRegistrationNumber: null,
          commercialRegistrationNumber: null,
          phone: null,
          email: null,
          timezone: null,
          workingHours: {},
          settings: {},
          isActive: true,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
          userCount: 3,
          users: [],
        },
      ],
    },
  ],
};

function setupHierarchyHandler() {
  server.use(
    http.get(`${API}/hierarchy/tenants/:tenantId/hierarchy`, () => {
      return HttpResponse.json({ success: true, data: MOCK_HIERARCHY });
    }),
  );
}

describe('useHierarchy', () => {
  describe('useTenant', () => {
    it('fetches tenant hierarchy tree', async () => {
      setupHierarchyHandler();

      const queryClient = createTestQueryClient();
      const wrapper = createHookWrapper({ queryClient });
      const { result } = renderHook(() => useTenant('t1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeDefined();
    });

    it('returns tenant info', async () => {
      setupHierarchyHandler();

      const queryClient = createTestQueryClient();
      const wrapper = createHookWrapper({ queryClient });
      const { result } = renderHook(() => useTenant('t1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.name).toBe('PetCare Clinic');
      expect(result.current.data?.code).toBe('PETCARE');
    });

    it('returns business lines with branches', async () => {
      setupHierarchyHandler();

      const queryClient = createTestQueryClient();
      const wrapper = createHookWrapper({ queryClient });
      const { result } = renderHook(() => useTenant('t1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.businessLines).toHaveLength(1);
      expect(result.current.data?.businessLines[0].name).toBe('Veterinary');
      expect(result.current.data?.businessLines[0].branches).toHaveLength(1);
      expect(result.current.data?.businessLines[0].branches[0].name).toBe('Main Branch');
    });

    it('handles error state', async () => {
      server.use(
        http.get(`${API}/hierarchy/tenants/:tenantId/hierarchy`, () => {
          return HttpResponse.json(
            { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500 },
          );
        }),
      );

      const queryClient = createTestQueryClient();
      const wrapper = createHookWrapper({ queryClient });
      const { result } = renderHook(() => useTenant('t1'), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });

    it('loading state is true initially', () => {
      setupHierarchyHandler();

      const queryClient = createTestQueryClient();
      const wrapper = createHookWrapper({ queryClient });
      const { result } = renderHook(() => useTenant('t1'), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    it('caches data on second render', async () => {
      setupHierarchyHandler();

      const queryClient = createTestQueryClient();
      const wrapper = createHookWrapper({ queryClient });

      // First render: fetch and populate cache
      const { result: result1 } = renderHook(() => useTenant('t1'), { wrapper });
      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      // Second render: should use cached data immediately
      const { result: result2 } = renderHook(() => useTenant('t1'), { wrapper });

      // Data should be available right away from cache (staleTime: 0 in test client, but data is still in cache)
      expect(result2.current.data).toBeDefined();
      expect(result2.current.data?.name).toBe('PetCare Clinic');
    });
  });
});
