import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createHookWrapper, createTestQueryClient } from '../test/renderWithProviders';
import { useBreedsList, useBreedDetail, useCreateBreed, useDeleteBreed } from './useBreeds';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';

const API = 'http://localhost:5500/api/v1';

describe('useBreedsList', () => {
  it('fetches paginated breeds', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useBreedsList({}), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.pagination.total).toBe(2);
    expect(result.current.data?.data[0].name).toBe('Labrador');
  });

  it('filters by speciesId', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    // The MSW handler already supports speciesId filtering
    const { result } = renderHook(() => useBreedsList({ speciesId: 's1' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(2);
    // All mock breeds belong to s1, so all should be returned
    expect(result.current.data?.data.every((b: { speciesId: string }) => b.speciesId === 's1')).toBe(true);
  });
});

describe('useBreedDetail', () => {
  it('fetches single breed by id', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useBreedDetail('b1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('b1');
    expect(result.current.data?.code).toBe('LAB');
    expect(result.current.data?.name).toBe('Labrador');
  });

  it('is disabled when id is undefined', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useBreedDetail(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.isSuccess).toBe(false);
  });
});

describe('useCreateBreed', () => {
  it('calls POST and invalidates lists', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useCreateBreed(), { wrapper });

    act(() => {
      result.current.mutate({
        speciesId: 's1',
        code: 'POM',
        name: 'Pomeranian',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.name).toBe('Pomeranian');
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['breeds', 'list'] }),
    );
  });
});

describe('useDeleteBreed', () => {
  it('calls DELETE and invalidates lists', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useDeleteBreed(), { wrapper });

    act(() => {
      result.current.mutate('b1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['breeds', 'list'] }),
    );
  });
});
