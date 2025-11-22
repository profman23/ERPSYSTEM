import { ReactNode, createContext, useContext, useState } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  tenantBranding: TenantBranding | null;
  loadTenantBranding: (branding: TenantBranding) => void;
}

interface TenantBranding {
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
  fontFamily?: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [tenantBranding, setTenantBranding] = useState<TenantBranding | null>(null);

  const loadTenantBranding = (branding: TenantBranding) => {
    setTenantBranding(branding);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, tenantBranding, loadTenantBranding }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
