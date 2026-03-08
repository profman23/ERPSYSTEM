import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createHookWrapper, createTestQueryClient } from '../test/renderWithProviders';
import { useRoles, useRole, useCreateRole, useDeleteRole } from './useRoles';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';

const API = 'http://localhost:5500/api/v1';

describe('useRoles', () => {
  it('fetches paginated list', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useRoles({}), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.pagination.total).toBe(1);
    expect(result.current.data?.data[0].code).toBe('ADMIN');
  });

  it('is disabled when enabled=false', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useRoles({ enabled: false }), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.isSuccess).toBe(false);
  });
});

describe('useRole', () => {
  it('fetches single role by id', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useRole('r1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('r1');
    expect(result.current.data?.code).toBe('ADMIN');
    expect(result.current.data?.name).toBe('Admin');
  });

  it('is disabled when id is undefined', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useRole(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.isSuccess).toBe(false);
  });
});

describe('useCreateRole', () => {
  it('calls POST and invalidates queries', async () => {
    // Add POST handler for roles
    server.use(
      http.post(`${API}/tenant/roles`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        return HttpResponse.json(
          { success: true, data: { data: { id: 'new-r1', tenantId: 't1', ...body, isActive: true } } },
          { status: 201 },
        );
      }),
    );

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useCreateRole(), { wrapper });

    act(() => {
      result.current.mutate({
        roleName: 'Manager',
        roleCode: 'MGR',
        description: 'Manager role',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['roles'] }),
    );
  });
});

describe('useDeleteRole', () => {
  it('calls DELETE and invalidates queries', async () => {
    // Add DELETE handler for roles
    server.use(
      http.delete(`${API}/tenant/roles/:id`, ({ params }) => {
        return HttpResponse.json({ success: true, data: { data: { id: params.id } } });
      }),
    );

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useDeleteRole(), { wrapper });

    act(() => {
      result.current.mutate('r1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['roles'] }),
    );
  });
});
