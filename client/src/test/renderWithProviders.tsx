import React, { ReactElement, PropsWithChildren } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperOptions {
  initialEntries?: string[];
  queryClient?: QueryClient;
}

function createWrapper(options: WrapperOptions = {}) {
  const queryClient = options.queryClient || createTestQueryClient();

  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={options.initialEntries || ['/']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options: WrapperOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  const { initialEntries, queryClient, ...renderOptions } = options;
  const testQueryClient = queryClient || createTestQueryClient();
  const Wrapper = createWrapper({ initialEntries, queryClient: testQueryClient });
  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
  };
}

/**
 * Create a wrapper function for renderHook (React Query hooks testing).
 */
export function createHookWrapper(options: WrapperOptions = {}) {
  return createWrapper(options);
}

export { createTestQueryClient };
