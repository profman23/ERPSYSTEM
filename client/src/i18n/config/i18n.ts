import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en/translation.json';
import ar from '../locales/ar/translation.json';

// Read saved language from localStorage (set by LanguageContext)
const savedLang = (() => {
  try {
    const v = localStorage.getItem('language');
    return v === 'ar' ? 'ar' : 'en';
  } catch { return 'en'; }
})();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
