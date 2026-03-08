import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom';

describe('minimal', () => {
  it('checks react versions', () => {
    console.log('React version:', React.version);
    console.log('ReactDOM version:', (ReactDOM as any).version);
    expect(React.version).toMatch(/^19/);
  });

  it('works with QueryClientProvider', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>
        {children}
      </QueryClientProvider>
    );
    const { result } = renderHook(() => ({ hello: 'world' }), { wrapper });
    expect(result.current.hello).toBe('world');
  });
});
