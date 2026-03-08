import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createHookWrapper, createTestQueryClient } from '../test/renderWithProviders';
import { usePatientsList, usePatientDetail, useCreatePatient, useDeletePatient } from './usePatients';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';

const API = 'http://localhost:5500/api/v1';

describe('usePatientsList', () => {
  it('fetches paginated list', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => usePatientsList({}), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.pagination.total).toBe(1);
    expect(result.current.data?.data[0].name).toBe('Rex');
  });

  it('filters by speciesId', async () => {
    // Override handler to support speciesId filtering
    server.use(
      http.get(`${API}/tenant/patients`, ({ request }) => {
        const url = new URL(request.url);
        const speciesId = url.searchParams.get('speciesId');
        const patients = [
          { id: 'p1', tenantId: 't1', code: 'PAT-000001', name: 'Rex', speciesId: 's1', clientId: 'c1', isActive: true },
          { id: 'p2', tenantId: 't1', code: 'PAT-000002', name: 'Whiskers', speciesId: 's2', clientId: 'c1', isActive: true },
        ];
        const filtered = speciesId
          ? patients.filter(p => p.speciesId === speciesId)
          : patients;
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

    const { result } = renderHook(() => usePatientsList({ speciesId: 's1' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].name).toBe('Rex');
    expect(result.current.data?.data[0].speciesId).toBe('s1');
  });
});

describe('usePatientDetail', () => {
  it('fetches single patient by id', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => usePatientDetail('p1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('p1');
    expect(result.current.data?.name).toBe('Rex');
    expect(result.current.data?.code).toBe('PAT-000001');
  });

  it('is disabled when id is undefined', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => usePatientDetail(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.isSuccess).toBe(false);
  });
});

describe('useCreatePatient', () => {
  it('calls POST and invalidates lists', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useCreatePatient(), { wrapper });

    act(() => {
      result.current.mutate({
        clientId: 'c1',
        speciesId: 's1',
        name: 'Buddy',
        gender: 'male',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.name).toBe('Buddy');
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['patients', 'list'] }),
    );
  });
});

describe('useDeletePatient', () => {
  it('calls DELETE and invalidates lists', async () => {
    // Add DELETE handler for patients
    server.use(
      http.delete(`${API}/tenant/patients/:id`, ({ params }) => {
        return HttpResponse.json({ success: true, data: { data: { id: params.id } } });
      }),
    );

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useDeletePatient(), { wrapper });

    act(() => {
      result.current.mutate('p1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['patients', 'list'] }),
    );
  });
});
