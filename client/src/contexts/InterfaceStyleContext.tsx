/**
 * InterfaceStyleContext — Manages UI style across the entire application
 *
 * 3 styles:
 * - default: Standard Lucide icons, normal UI
 * - playful: Emojis replace icons, fun rounded UI, colorful accents
 * - elegant: Thin icon strokes, soft shadows, refined minimalist feel
 *
 * Persisted in localStorage. Sets data-ui-style attribute on <html>.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type InterfaceStyle = 'default' | 'playful' | 'elegant';

interface InterfaceStyleContextType {
  interfaceStyle: InterfaceStyle;
  setInterfaceStyle: (style: InterfaceStyle) => void;
}

const InterfaceStyleContext = createContext<InterfaceStyleContextType | undefined>(undefined);

const STORAGE_KEY = 'interface-style';

export function InterfaceStyleProvider({ children }: { children: ReactNode }) {
  const [interfaceStyle, setStyleState] = useState<InterfaceStyle>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as InterfaceStyle | null;
      if (saved === 'default' || saved === 'playful' || saved === 'elegant') return saved;
    } catch { /* ignore */ }
    return 'default';
  });

  const setInterfaceStyle = useCallback((newStyle: InterfaceStyle) => {
    setStyleState(newStyle);
    try { localStorage.setItem(STORAGE_KEY, newStyle); } catch { /* ignore */ }
    document.documentElement.setAttribute('data-ui-style', newStyle);
  }, []);

  // Apply on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-ui-style', interfaceStyle);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <InterfaceStyleContext.Provider value={{ interfaceStyle, setInterfaceStyle }}>
      {children}
    </InterfaceStyleContext.Provider>
  );
}

export function useInterfaceStyle() {
  const context = useContext(InterfaceStyleContext);
  if (!context) {
    throw new Error('useInterfaceStyle must be used within an InterfaceStyleProvider');
  }
  return context;
}
