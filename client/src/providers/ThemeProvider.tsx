import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface TenantBranding {
  primary?: string;
  secondary?: string;
  background?: string;
  surface?: string;
  accent?: string;
  accentHover?: string;
  radius?: string;
  logo?: string;
  sidebarStyle?: 'dark' | 'light' | 'accent';
  fontFamily?: string;
  success?: string;
  warning?: string;
  danger?: string;
  info?: string;
}

interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  tenantBranding: TenantBranding | null;
  loadTenantBranding: (branding: TenantBranding) => void;
  clearTenantBranding: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const TENANT_BRANDING_STYLE_ID = 'tenant-branding-override';

const injectTenantBrandingCSS = (branding: TenantBranding) => {
  let existingStyle = document.getElementById(TENANT_BRANDING_STYLE_ID);
  
  if (!existingStyle) {
    existingStyle = document.createElement('style');
    existingStyle.id = TENANT_BRANDING_STYLE_ID;
    document.head.appendChild(existingStyle);
  }

  const cssVars: string[] = [];
  
  if (branding.primary) {
    cssVars.push(`--color-accent: ${branding.primary}`);
    cssVars.push(`--btn-primary-bg: ${branding.primary}`);
    cssVars.push(`--tenant-accent: ${branding.primary}`);
    cssVars.push(`--app-accent: ${branding.primary}`);
  }
  
  if (branding.accentHover) {
    cssVars.push(`--color-accent-hover: ${branding.accentHover}`);
    cssVars.push(`--btn-primary-bg-hover: ${branding.accentHover}`);
    cssVars.push(`--tenant-accent-hover: ${branding.accentHover}`);
    cssVars.push(`--app-accent-hover: ${branding.accentHover}`);
  }
  
  if (branding.secondary) {
    cssVars.push(`--btn-secondary-bg: ${branding.secondary}`);
  }
  
  if (branding.background) {
    cssVars.push(`--color-bg: ${branding.background}`);
    cssVars.push(`--tenant-bg: ${branding.background}`);
    cssVars.push(`--app-bg: ${branding.background}`);
  }
  
  if (branding.surface) {
    cssVars.push(`--color-surface: ${branding.surface}`);
    cssVars.push(`--card-bg: ${branding.surface}`);
    cssVars.push(`--tenant-surface: ${branding.surface}`);
    cssVars.push(`--app-surface: ${branding.surface}`);
  }
  
  if (branding.radius) {
    cssVars.push(`--radius: ${branding.radius}`);
  }
  
  if (branding.success) {
    cssVars.push(`--color-success: ${branding.success}`);
  }
  
  if (branding.warning) {
    cssVars.push(`--color-warning: ${branding.warning}`);
  }
  
  if (branding.danger) {
    cssVars.push(`--color-danger: ${branding.danger}`);
  }
  
  if (branding.info) {
    cssVars.push(`--color-info: ${branding.info}`);
  }

  if (branding.sidebarStyle === 'dark') {
    cssVars.push(`--sidebar-bg: #1A1A2E`);
    cssVars.push(`--sidebar-text: #E5E5E5`);
    cssVars.push(`--sidebar-item-bg-active: rgba(255, 255, 255, 0.1)`);
  } else if (branding.sidebarStyle === 'accent' && branding.primary) {
    cssVars.push(`--sidebar-bg: ${branding.primary}`);
    cssVars.push(`--sidebar-text: #FFFFFF`);
    cssVars.push(`--sidebar-item-bg-active: rgba(255, 255, 255, 0.2)`);
  }

  const cssContent = cssVars.length > 0 
    ? `[data-panel="tenant"], [data-panel="app"] { ${cssVars.join('; ')}; }`
    : '';
  
  existingStyle.textContent = cssContent;
};

const removeTenantBrandingCSS = () => {
  const existingStyle = document.getElementById(TENANT_BRANDING_STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [tenantBranding, setTenantBranding] = useState<TenantBranding | null>(null);

  const loadTenantBranding = useCallback((branding: TenantBranding) => {
    setTenantBranding(branding);
    injectTenantBrandingCSS(branding);
    console.log('🎨 Tenant branding loaded:', branding);
  }, []);

  const clearTenantBranding = useCallback(() => {
    setTenantBranding(null);
    removeTenantBrandingCSS();
    console.log('🎨 Tenant branding cleared');
  }, []);

  useEffect(() => {
    return () => {
      removeTenantBrandingCSS();
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      tenantBranding, 
      loadTenantBranding,
      clearTenantBranding 
    }}>
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
