/**
 * Theme Context - Design System
 *
 * Provides theme management (Dark/Light/System) with:
 * - localStorage persistence
 * - System preference detection
 * - Auto-switching on OS theme change
 *
 * Usage:
 * 1. Wrap your app with <ThemeProvider>
 * 2. Use useTheme() hook to get/set theme
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { themes, generateCSSVariables, type ThemeMode } from '@/config/theme';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
interface ThemeContextValue {
  // Current theme mode ('dark' | 'light' | 'system')
  mode: ThemeMode;

  // Resolved theme (actual applied theme: 'dark' | 'light')
  resolvedTheme: 'dark' | 'light';

  // Set theme mode
  setMode: (mode: ThemeMode) => void;

  // Convenience toggles
  setDark: () => void;
  setLight: () => void;
  setSystem: () => void;
  toggleTheme: () => void;

  // System preference
  systemPreference: 'dark' | 'light';

  // Is this the system-controlled theme
  isSystem: boolean;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
  storageKey?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const STORAGE_KEY = 'theme-mode';

// ═══════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get system theme preference
 */
function getSystemPreference(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get stored theme or default
 */
function getStoredMode(storageKey: string, defaultMode: ThemeMode): ThemeMode {
  if (typeof window === 'undefined') return defaultMode;

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored;
    }
  } catch (e) {
    console.warn('Failed to read theme from localStorage:', e);
  }

  return defaultMode;
}

/**
 * Apply theme to document
 */
function applyThemeToDocument(resolvedTheme: 'dark' | 'light'): void {
  const root = document.documentElement;
  const theme = themes[resolvedTheme];
  const variables = generateCSSVariables(theme);

  // Set data-theme attribute
  root.setAttribute('data-theme', resolvedTheme);

  // Apply CSS variables
  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Also update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      resolvedTheme === 'dark' ? '#0D0D0D' : '#FFFFFF'
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════
export function ThemeProvider({
  children,
  defaultMode = 'dark',
  storageKey = STORAGE_KEY,
}: ThemeProviderProps) {
  // State
  const [mode, setModeState] = useState<ThemeMode>(() =>
    getStoredMode(storageKey, defaultMode)
  );
  const [systemPreference, setSystemPreference] = useState<'dark' | 'light'>(
    () => getSystemPreference()
  );

  // Resolved theme (what's actually applied)
  const resolvedTheme = mode === 'system' ? systemPreference : mode;

  // Set mode with persistence
  const setMode = useCallback(
    (newMode: ThemeMode) => {
      setModeState(newMode);
      try {
        localStorage.setItem(storageKey, newMode);
      } catch (e) {
        console.warn('Failed to save theme to localStorage:', e);
      }
    },
    [storageKey]
  );

  // Convenience methods
  const setDark = useCallback(() => setMode('dark'), [setMode]);
  const setLight = useCallback(() => setMode('light'), [setMode]);
  const setSystem = useCallback(() => setMode('system'), [setMode]);

  const toggleTheme = useCallback(() => {
    if (mode === 'system') {
      // If system, switch to opposite of current system preference
      setMode(systemPreference === 'dark' ? 'light' : 'dark');
    } else {
      setMode(mode === 'dark' ? 'light' : 'dark');
    }
  }, [mode, systemPreference, setMode]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    // Modern browsers
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Apply theme when resolved theme changes
  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  // Context value
  const value: ThemeContextValue = {
    mode,
    resolvedTheme,
    setMode,
    setDark,
    setLight,
    setSystem,
    toggleTheme,
    systemPreference,
    isSystem: mode === 'system',
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════
export { ThemeContext };
export type { ThemeContextValue, ThemeProviderProps };
