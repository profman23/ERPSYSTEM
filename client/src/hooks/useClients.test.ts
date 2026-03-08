import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createHookWrapper, createTestQueryClient } from '../test/renderWithProviders';
import { useClientsList, useClientDetail, useCreateClient, useDeleteClient } from './useClients';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';

const API = 'http://localhost:5500/api/v1';

describe('useClientsList', () => {
  it('fetches paginated list', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useClientsList({}), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.pagination.total).toBe(1);
    expect(result.current.data?.data[0].firstName).toBe('John');
  });

  it('passes search param', async () => {
    // Override handler to support search filtering
    server.use(
      http.get(`${API}/tenant/clients`, ({ request }) => {
        const url = new URL(request.url);
        const search = url.searchParams.get('search') || '';
        const clients = [
          { id: 'c1', tenantId: 't1', code: 'CLT-00001', firstName: 'John', lastName: 'Doe', isActive: true },
          { id: 'c2', tenantId: 't1', code: 'CLT-00002', firstName: 'Jane', lastName: 'Smith', isActive: true },
        ];
        const filtered = search
          ? clients.filter(c => c.firstName.toLowerCase().includes(search.toLowerCase()))
          : clients;
        return HttpResponse.json({
          success: true,
          data: {
            data: filtered,
            pagination: { page: 1, limit: 20, total: filtered.length, totalPages: 1, hasNext: false, hasPrev: false },
          },
        });
      }),
    );

    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useClientsList({ search: 'Jane' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].firstName).toBe('Jane');
  });
});

describe('useClientDetail', () => {
  it('fetches single client by id', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useClientDetail('c1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('c1');
    expect(result.current.data?.firstName).toBe('John');
    expect(result.current.data?.lastName).toBe('Doe');
  });

  it('is disabled when id is undefined', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useClientDetail(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.isSuccess).toBe(false);
  });
});

describe('useCreateClient', () => {
  it('calls POST and invalidates lists', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useCreateClient(), { wrapper });

    act(() => {
      result.current.mutate({
        firstName: 'Alice',
        lastName: 'Wonder',
        email: 'alice@test.com',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.firstName).toBe('Alice');
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['clients', 'list'] }),
    );
  });
});

describe('useDeleteClient', () => {
  it('calls DELETE and invalidates lists', async () => {
    // Add DELETE handler for clients
    server.use(
      http.delete(`${API}/tenant/clients/:id`, ({ params }) => {
        return HttpResponse.json({ success: true, data: { data: { id: params.id } } });
      }),
    );

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useDeleteClient(), { wrapper });

    act(() => {
      result.current.mutate('c1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['clients', 'list'] }),
    );
  });
});
