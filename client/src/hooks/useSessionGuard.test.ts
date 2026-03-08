import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

// Mock useAuth before importing the hook
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Import after mocking
import { useSessionGuard } from './useSessionGuard';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function createSessionWrapper(initialPath = '/app/dashboard') {
  return function SessionWrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      MemoryRouter,
      { initialEntries: [initialPath] },
      children,
    );
  };
}

describe('useSessionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('returns session state', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', accessScope: 'branch', role: 'user' },
      isAuthenticated: true,
      validateSession: vi.fn().mockResolvedValue(true),
      forceSessionRefresh: vi.fn(),
    });

    const wrapper = createSessionWrapper('/app/dashboard');
    const { result } = renderHook(() => useSessionGuard(), { wrapper });

    expect(result.current).toHaveProperty('isValid');
    expect(result.current).toHaveProperty('isScopeMismatch');
    expect(result.current).toHaveProperty('currentPanel');
    expect(result.current).toHaveProperty('expectedPanel');
    expect(result.current).toHaveProperty('correctPath');
    expect(typeof result.current.forceRedirect).toBe('function');
  });

  it('redirects when scope mismatch detected', async () => {
    // Branch user trying to access /system
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', accessScope: 'branch', role: 'user' },
      isAuthenticated: true,
      validateSession: vi.fn().mockResolvedValue(true),
      forceSessionRefresh: vi.fn(),
    });

    const wrapper = createSessionWrapper('/system/dashboard');
    const { result } = renderHook(() => useSessionGuard(), { wrapper });

    expect(result.current.isScopeMismatch).toBe(true);
    expect(result.current.isValid).toBe(false);

    // The hook sets a 2-second timer for redirect
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app/dashboard', { replace: true });
    }, { timeout: 3000 });
  });

  it('allows access when authenticated with correct scope', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', accessScope: 'branch', role: 'user' },
      isAuthenticated: true,
      validateSession: vi.fn().mockResolvedValue(true),
      forceSessionRefresh: vi.fn(),
    });

    const wrapper = createSessionWrapper('/app/dashboard');
    const { result } = renderHook(() => useSessionGuard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isValid).toBe(true);
    });
    expect(result.current.isScopeMismatch).toBe(false);
    expect(result.current.currentPanel).toBe('app');
    expect(result.current.expectedPanel).toBe('app');
  });

  it('handles session expiry', async () => {
    vi.useFakeTimers();
    const validateSession = vi.fn().mockResolvedValue(false);

    mockUseAuth.mockReturnValue({
      user: { id: 'u1', accessScope: 'branch', role: 'user' },
      isAuthenticated: true,
      validateSession,
      forceSessionRefresh: vi.fn(),
    });

    const wrapper = createSessionWrapper('/app/dashboard');
    renderHook(() => useSessionGuard(), { wrapper });

    // Advance timers past the session check interval
    await vi.advanceTimersByTimeAsync(10000);

    // After expiry, hook should navigate to /login or set isValid=false
    expect(validateSession).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('checks access scope correctly', () => {
    // System user on /system path
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', accessScope: 'system', role: 'super_admin' },
      isAuthenticated: true,
      validateSession: vi.fn().mockResolvedValue(true),
      forceSessionRefresh: vi.fn(),
    });

    const wrapper = createSessionWrapper('/system/dashboard');
    const { result } = renderHook(() => useSessionGuard(), { wrapper });

    expect(result.current.expectedPanel).toBe('system');
    expect(result.current.currentPanel).toBe('system');
    expect(result.current.isScopeMismatch).toBe(false);
    expect(result.current.correctPath).toBe('/system/dashboard');
  });

  it('sets isValid to false when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      validateSession: vi.fn().mockResolvedValue(false),
      forceSessionRefresh: vi.fn(),
    });

    const wrapper = createSessionWrapper('/app/dashboard');
    const { result } = renderHook(() => useSessionGuard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isValid).toBe(false);
    });
  });
});
