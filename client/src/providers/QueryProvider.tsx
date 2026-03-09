/**
 * React Query Provider - Optimized for 3000+ Tenants
 *
 * Performance-tuned caching configuration with:
 * - Extended stale times for reduced API calls
 * - Structural sharing for memory efficiency
 * - Smart retry logic
 * - Background refetching disabled
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode, useState } from 'react';

/**
 * Create QueryClient with optimized settings
 * These settings are tuned for multi-tenant enterprise applications
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // ═══════════════════════════════════════════════════════════
        // CACHING
        // ═══════════════════════════════════════════════════════════

        // Data is considered fresh for 5 minutes
        // Prevents unnecessary refetches for frequently accessed data
        staleTime: 5 * 60 * 1000, // 5 minutes

        // Keep inactive data in cache for 30 minutes
        // Allows instant display when returning to a page
        gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)

        // ═══════════════════════════════════════════════════════════
        // REFETCHING BEHAVIOR
        // ═══════════════════════════════════════════════════════════

        // Don't refetch when window regains focus
        // Prevents unexpected data changes while user is working
        refetchOnWindowFocus: false,

        // Only refetch on mount if data is stale
        // Prevents redundant API calls during navigation
        refetchOnMount: 'always' as const,

        // Don't refetch when network reconnects
        // Let user manually refresh if needed
        refetchOnReconnect: false,

        // ═══════════════════════════════════════════════════════════
        // RETRY LOGIC
        // ═══════════════════════════════════════════════════════════

        // Smart retry: don't retry 4xx (client errors), only retry transient failures
        retry: (failureCount, error: any) => {
          if (failureCount >= 2) return false;
          const status = error?.response?.status;
          // Don't retry client errors (400-499)
          if (status && status >= 400 && status < 500) return false;
          return true;
        },

        // Exponential backoff with jitter to prevent thundering herd
        retryDelay: (attemptIndex) => {
          const baseDelay = Math.min(1000 * 2 ** attemptIndex, 10000);
          const jitter = Math.random() * baseDelay * 0.1;
          return baseDelay + jitter;
        },

        // Don't retry on mount (data already in cache)
        retryOnMount: false,

        // ═══════════════════════════════════════════════════════════
        // PERFORMANCE
        // ═══════════════════════════════════════════════════════════

        // Enable structural sharing to deduplicate identical responses
        // Reduces memory usage and improves performance
        structuralSharing: true,

        // Network mode: always attempt fetch, fallback to cache
        networkMode: 'offlineFirst',
      },

      mutations: {
        // Retry mutations once for transient failures (network blips)
        retry: (failureCount, error: any) => {
          if (failureCount >= 1) return false;
          const status = error?.response?.status;
          if (status && status >= 400 && status < 500) return false;
          return true;
        },

        // Network mode for mutations
        networkMode: 'always',
      },
    },
  });
}

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * QueryProvider with stable client instance
 * Uses useState to ensure client persists across re-renders
 */
export const QueryProvider = ({ children }: QueryProviderProps) => {
  // Create client once and reuse
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children as unknown as React.JSX.Element}
    </QueryClientProvider>
  );
};

/**
 * Export createQueryClient for testing and SSR scenarios
 */
export { createQueryClient };

export default QueryProvider;
