import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { createHookWrapper, createTestQueryClient } from '../test/renderWithProviders';
import { server } from '../test/mocks/server';
import { useAuditTrail } from './useAuditTrail';

const API = 'http://localhost:5500/api/v1';

describe('useAuditTrail', () => {
  it('fetches audit trail for a resource', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useAuditTrail('species', 'sp-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].userName).toBe('Ahmed Mohamed');
  });

  it('maps create action to CREATED', async () => {
    server.use(
      http.get(`${API}/tenant/audit-trail/:resourceType/:resourceId`, () =>
        HttpResponse.json({
          success: true,
          data: [
            { id: 'a1', action: 'create', resourceType: 'species', resourceId: 'sp-1', userId: 'u1', userName: 'Ali', userEmail: 'ali@test.com', diff: null, createdAt: '2025-03-10T14:00:00Z' },
          ],
        }),
      ),
    );

    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });
    const { result } = renderHook(() => useAuditTrail('species', 'sp-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].action).toBe('CREATED');
  });

  it('maps update action to UPDATED', async () => {
    server.use(
      http.get(`${API}/tenant/audit-trail/:resourceType/:resourceId`, () =>
        HttpResponse.json({
          success: true,
          data: [
            { id: 'a2', action: 'update', resourceType: 'species', resourceId: 'sp-1', userId: 'u1', userName: 'Ali', userEmail: 'ali@test.com', diff: { name: { old: 'Dog', new: 'Canine' } }, createdAt: '2025-03-11T10:00:00Z' },
          ],
        }),
      ),
    );

    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });
    const { result } = renderHook(() => useAuditTrail('species', 'sp-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].action).toBe('UPDATED');
  });

  it('maps delete action to DELETED', async () => {
    server.use(
      http.get(`${API}/tenant/audit-trail/:resourceType/:resourceId`, () =>
        HttpResponse.json({
          success: true,
          data: [
            { id: 'a3', action: 'delete', resourceType: 'species', resourceId: 'sp-1', userId: 'u1', userName: 'Ali', userEmail: 'ali@test.com', diff: null, createdAt: '2025-03-12T08:00:00Z' },
          ],
        }),
      ),
    );

    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });
    const { result } = renderHook(() => useAuditTrail('species', 'sp-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].action).toBe('DELETED');
  });

  it('does not fetch when resourceId is undefined', () => {
    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });

    const { result } = renderHook(() => useAuditTrail('species', undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.isSuccess).toBe(false);
  });

  it('builds details from diff fields', async () => {
    server.use(
      http.get(`${API}/tenant/audit-trail/:resourceType/:resourceId`, () =>
        HttpResponse.json({
          success: true,
          data: [
            { id: 'a4', action: 'update', resourceType: 'species', resourceId: 'sp-1', userId: 'u1', userName: 'Ali', userEmail: 'ali@test.com', diff: { name: { old: 'Dog', new: 'Canine' }, code: { old: 'DOG', new: 'CAN' } }, createdAt: '2025-03-13T09:00:00Z' },
          ],
        }),
      ),
    );

    const queryClient = createTestQueryClient();
    const wrapper = createHookWrapper({ queryClient });
    const { result } = renderHook(() => useAuditTrail('species', 'sp-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].details).toBe('Changed: name, code');
  });
});
