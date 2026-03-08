/**
 * UserStyleContext — Per-user UI customization via CSS variable injection
 *
 * Injects a <style id="user-style-override"> into <head> with resolved preset CSS.
 * Sets data-user-style="active" and data-bg-pattern on <html> for CSS specificity.
 * Persisted in localStorage for instant apply; synced from server on login.
 *
 * Pattern follows InterfaceStyleContext.tsx
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import {
  type UserStylePreferences,
  DEFAULT_USER_STYLE,
  resolvePresetCSS,
} from '@/config/userStylePresets';

interface UserStyleContextType {
  userStyle: UserStylePreferences;
  setUserStyle: (prefs: Partial<UserStylePreferences>) => void;
  syncFromServer: (prefs: UserStylePreferences) => void;
}

const UserStyleCtx = createContext<UserStyleContextType | undefined>(undefined);

const STORAGE_KEY = 'user-style-preferences';
const STYLE_ID = 'user-style-override';

function readFromStorage(): UserStylePreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_USER_STYLE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_USER_STYLE, ...parsed };
  } catch {
    return DEFAULT_USER_STYLE;
  }
}

function writeToStorage(prefs: UserStylePreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* quota exceeded — ignore */ }
}

function applyToDOM(prefs: UserStylePreferences, theme: 'light' | 'dark') {
  const css = resolvePresetCSS(prefs, theme);
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

  if (css) {
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = css;
    document.documentElement.setAttribute('data-user-style', 'active');
  } else {
    if (el) el.textContent = '';
    document.documentElement.removeAttribute('data-user-style');
  }

  // Background pattern overlay
  if (prefs.showBackgroundPattern) {
    document.documentElement.setAttribute('data-bg-pattern', 'true');
  } else {
    document.documentElement.removeAttribute('data-bg-pattern');
  }
}

export function UserStyleProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const [userStyle, setStyleState] = useState<UserStylePreferences>(readFromStorage);

  // Apply on mount + when theme or prefs change
  useEffect(() => {
    applyToDOM(userStyle, theme);
  }, [userStyle, theme]);

  const setUserStyle = useCallback((partial: Partial<UserStylePreferences>) => {
    setStyleState(prev => {
      const next = { ...prev, ...partial };
      writeToStorage(next);
      return next;
    });
  }, []);

  const syncFromServer = useCallback((serverPrefs: UserStylePreferences) => {
    const merged = { ...DEFAULT_USER_STYLE, ...serverPrefs };
    setStyleState(merged);
    writeToStorage(merged);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const el = document.getElementById(STYLE_ID);
      if (el) el.remove();
      document.documentElement.removeAttribute('data-user-style');
      document.documentElement.removeAttribute('data-bg-pattern');
    };
  }, []);

  return (
    <UserStyleCtx.Provider value={{ userStyle, setUserStyle, syncFromServer }}>
      {children}
    </UserStyleCtx.Provider>
  );
}

export function useUserStyleContext() {
  const ctx = useContext(UserStyleCtx);
  if (!ctx) throw new Error('useUserStyleContext must be used within UserStyleProvider');
  return ctx;
}
