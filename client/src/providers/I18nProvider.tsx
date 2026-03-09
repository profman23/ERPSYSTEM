import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n/config/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
}

export const I18nProvider = ({ children }: I18nProviderProps) => {
  // Double cast bridges React 19 built-in ReactNode (includes bigint) with @types/react ReactNode
  return <I18nextProvider i18n={i18n}>{children as unknown as React.JSX.Element}</I18nextProvider>;
};
