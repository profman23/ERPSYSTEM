/**
 * LanguageContext — Manages language (EN/AR) across the entire application
 *
 * Pattern: follows InterfaceStyleContext exactly.
 *
 * - Persists in localStorage (key: 'language')
 * - Sets `lang` and `dir` attributes on <html>
 * - Syncs with i18next via i18n.changeLanguage()
 * - Provides `isRTL` convenience boolean
 * - Provides inline `t(en, ar)` helper for quick bilingual text
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import i18n from '@/i18n/config/i18n';

export type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
  /** Inline bilingual helper: t('English text', 'النص العربي') */
  t: (en: string, ar: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'language';

function applyLanguage(lang: Language) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'ar') return saved;
    } catch { /* ignore */ }
    return 'en';
  });

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try { localStorage.setItem(STORAGE_KEY, newLang); } catch { /* ignore */ }
    applyLanguage(newLang);
    i18n.changeLanguage(newLang);
  }, []);

  // Apply on mount
  useEffect(() => {
    applyLanguage(language);
    i18n.changeLanguage(language);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isRTL = language === 'ar';

  const t = useCallback((en: string, ar: string) => {
    return language === 'ar' ? ar : en;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    isRTL,
    t,
  }), [language, setLanguage, isRTL, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
