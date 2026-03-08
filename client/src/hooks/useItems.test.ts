import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { createHookWrapper, createTestQueryClient } from '../test/renderWithProviders';
import { useItemsList, useItemDetail, useCreateItem, useDeleteItem } from './useItems';

const API = 'http://localhost:5500/api/v1';

const MOCK_ITEM = {
  id: 'item-1',
  tenantId: 't1',
  code: 'ITM-00001',
  name: 'Vaccine A',
  nameAr: '',
  itemType: 'ITEM',
  itemGroupId: null,
  isInventoryItem: true,
  isSalesItem: true,
  isPurchaseItem: false,
  isCounterSell: false,
  inventoryUomId: null,
  purchaseUomId: null,
  purchaseUomFactor: '1',
  salesUomId: null,
  salesUomFactor: '1',
  standardCost: null,
  lastPurchasePrice: null,
  defaultSellingPrice: '50.00',
  barcode: null,
  minimumStock: null,
  maximumStock: null,
  defaultWarehouseId: null,
  preferredVendor: null,
  version: 1,
  isActive: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

describe('useItems', () => {
  describe('useItemsList', () => {
    it('fetches paginated list', async () => {
      server.use(
        http.get(`${API}/tenant/items`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              data: [MOCK_ITEM],
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
            },
          });
        }),
      );

      const queryClient = createTestQueryClient();
      const wrapper = createHookWrapper({ queryClient });
      const { result } = renderHook(() => useItemsList(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].code).toBe('ITM-00001');
      expect(result.current.data?.pagination.total).toBe(1);
    });

    it('passes itemType filter param', async () => {
      let capturedUrl = '';
      server.use(
        http.get(`${API}/tenant/items`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
            },
          });
        }),
      );

      const queryClient = createTestQueryClient();
      const wrapper = createHookWrapper({ queryClient });
      const { result } = renderHook(() => useItemsList({ itemType: 'SERVICE' }), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(capturedUrl).toContain('itemType=SERVICE');
    });
  });

  describe('useItemDetail', () => {
    it('fetches single item', async () => {
      server.use(
        http.get(`${API}/tenant/items/:id`, ({ params }) => {
          if (params.id === 'item-1') {
            return HttpResponse.json({ success: true, data: MOCK_ITEM });
          }
          return HttpResponse.json({ success: false, error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
        }),
      );

      const queryClient = createTestQueryClient();
      const wrapper = createHookWrapper({ queryClient });
      const { result } = renderHook(() => useItemDetail('item-1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe('item-1');
      expect(result.current.data?.name).toBe('Vaccine A');
    });

    it('is disabled when id is undefined', () => {
      const queryClient = createTestQueryClient();
      const wrapper = createHookWrapper({ queryClient });
      const { result } = renderHook(() => useItemDetail(undefined), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreateItem', () => {
    it('calls POST and invalidates lists', async () => {
      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const wrapper = createHookWrapper({ queryClient });

      const { result } = renderHook(() => useCreateItem(), { wrapper });

      act(() => {
        result.current.mutate({
          name: 'New Item',
          itemType: 'ITEM',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data?.code).toBe('ITM-00001');
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['items', 'list'] }),
      );
    });
  });

  describe('useDeleteItem', () => {
    it('calls DELETE and invalidates lists', async () => {
      server.use(
        http.delete(`${API}/tenant/items/:id`, () => {
          return HttpResponse.json({ success: true, data: { data: { id: 'item-1' } } });
        }),
      );

      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const wrapper = createHookWrapper({ queryClient });

      const { result } = renderHook(() => useDeleteItem(), { wrapper });

      act(() => {
        result.current.mutate('item-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['items', 'list'] }),
      );
    });
  });
});
