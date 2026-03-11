/**
 * PageResourceContext — Enterprise Page Resource Registration
 *
 * Stateful context that lives at the LAYOUT level (UnifiedTenantLayout).
 * Pages call useSetPageResource() to register their current resource.
 * HeaderToolbar calls usePageResource() to read it.
 *
 * This pattern solves the React context hierarchy problem:
 * Layout header (HeaderToolbar) and page content (Outlet) are siblings —
 * the context must wrap both, with pages setting state via a setter.
 *
 * Pages without a registered resource → contextual toolbar items disabled (gray).
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────

interface PageResource {
  resourceType: string;
  resourceId: string;
  resourceLabel?: string;
}

interface PageResourceContextValue {
  resource: PageResource | null;
  setResource: (resource: PageResource | null) => void;
}

// ─── Context ────────────────────────────────────────────────────────────

const PageResourceContext = createContext<PageResourceContextValue>({
  resource: null,
  setResource: () => {},
});

// ─── Provider (used in UnifiedTenantLayout) ─────────────────────────────

export function PageResourceProvider({ children }: { children: ReactNode }) {
  const [resource, setResourceState] = useState<PageResource | null>(null);

  const setResource = useCallback((r: PageResource | null) => {
    setResourceState(r);
  }, []);

  return (
    <PageResourceContext.Provider value={{ resource, setResource }}>
      {children}
    </PageResourceContext.Provider>
  );
}

// ─── Consumer: read resource (HeaderToolbar uses this) ──────────────────

export function usePageResource(): PageResource | null {
  return useContext(PageResourceContext).resource;
}

// ─── Registrar: pages call this to set/clear resource ───────────────────

export function useSetPageResource(
  resourceType: string,
  resourceId: string | undefined,
  resourceLabel?: string,
) {
  const { setResource } = useContext(PageResourceContext);

  useEffect(() => {
    if (resourceId) {
      setResource({ resourceType, resourceId, resourceLabel });
    } else {
      setResource(null);
    }

    // Clear on unmount (page navigated away)
    return () => setResource(null);
  }, [resourceType, resourceId, resourceLabel, setResource]);
}
