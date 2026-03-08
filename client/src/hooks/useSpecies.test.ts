import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createHookWrapper, createTestQueryClient } from '../test/renderWithProviders';
import { useSpeciesList, useSpeciesDetail, useCreateSpecies, useDeleteSpecies } from './useSpecies';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';

const API = 'http://localhost:5500/api/v1';

describe('useSpeciesList', () => {
  it('fetches paginated list', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useSpeciesList({}), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.pagination.total).toBe(2);
    expect(result.current.data?.pagination.page).toBe(1);
  });

  it('passes search param and filters results', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useSpeciesList({ search: 'Dog' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].name).toBe('Dog');
  });
});

describe('useSpeciesDetail', () => {
  it('fetches single species by id', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useSpeciesDetail('s1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('s1');
    expect(result.current.data?.code).toBe('DOG');
    expect(result.current.data?.name).toBe('Dog');
  });

  it('is disabled when id is undefined', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useSpeciesDetail(undefined), { wrapper });

    // Should not fetch — stays in pending/idle state
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.isSuccess).toBe(false);
  });
});

describe('useCreateSpecies', () => {
  it('calls POST and invalidates lists', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useCreateSpecies(), { wrapper });

    act(() => {
      result.current.mutate({
        code: 'BIRD',
        name: 'Bird',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalled();
  });
});

describe('useDeleteSpecies', () => {
  it('calls DELETE and invalidates lists', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useDeleteSpecies(), { wrapper });

    act(() => {
      result.current.mutate('s1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalled();
  });
});
