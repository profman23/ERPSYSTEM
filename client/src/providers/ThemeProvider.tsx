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
const TENANT_FONT_LINK_ID = 'tenant-font-link';

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }
  const shortResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (shortResult) {
    return {
      r: parseInt(shortResult[1] + shortResult[1], 16),
      g: parseInt(shortResult[2] + shortResult[2], 16),
      b: parseInt(shortResult[3] + shortResult[3], 16)
    };
  }
  return null;
};

const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const getContrastTextColor = (bgColor: string): string => {
  const rgb = hexToRgb(bgColor);
  if (!rgb) return '#FFFFFF';
  
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.179 ? '#1F2937' : '#FFFFFF';
};

const getLightBgColor = (color: string): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const lightR = Math.round(rgb.r + (255 - rgb.r) * 0.9);
  const lightG = Math.round(rgb.g + (255 - rgb.g) * 0.9);
  const lightB = Math.round(rgb.b + (255 - rgb.b) * 0.9);
  return `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;
};

const isValidHexColor = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false;
  const sanitized = value.trim();
  const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
  return hexPattern.test(sanitized);
};

const isValidRadius = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false;
  const sanitized = value.trim();
  const radiusPattern = /^(\d+(\.\d+)?(px|rem|em|%))$/;
  return radiusPattern.test(sanitized);
};

const isValidFontFamily = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false;
  const sanitized = value.trim();
  const fontPattern = /^[a-zA-Z0-9\s,\-'"]+$/;
  return fontPattern.test(sanitized) && sanitized.length < 200;
};

const isValidSidebarStyle = (value: unknown): value is 'dark' | 'light' | 'accent' => {
  return value === 'dark' || value === 'light' || value === 'accent';
};

const sanitizeTenantBranding = (branding: TenantBranding): TenantBranding => {
  const sanitized: TenantBranding = {};
  
  if (branding.primary && isValidHexColor(branding.primary)) {
    sanitized.primary = branding.primary.trim();
  }
  if (branding.secondary && isValidHexColor(branding.secondary)) {
    sanitized.secondary = branding.secondary.trim();
  }
  if (branding.background && isValidHexColor(branding.background)) {
    sanitized.background = branding.background.trim();
  }
  if (branding.surface && isValidHexColor(branding.surface)) {
    sanitized.surface = branding.surface.trim();
  }
  if (branding.accent && isValidHexColor(branding.accent)) {
    sanitized.accent = branding.accent.trim();
  }
  if (branding.accentHover && isValidHexColor(branding.accentHover)) {
    sanitized.accentHover = branding.accentHover.trim();
  }
  if (branding.success && isValidHexColor(branding.success)) {
    sanitized.success = branding.success.trim();
  }
  if (branding.warning && isValidHexColor(branding.warning)) {
    sanitized.warning = branding.warning.trim();
  }
  if (branding.danger && isValidHexColor(branding.danger)) {
    sanitized.danger = branding.danger.trim();
  }
  if (branding.info && isValidHexColor(branding.info)) {
    sanitized.info = branding.info.trim();
  }
  if (branding.radius && isValidRadius(branding.radius)) {
    sanitized.radius = branding.radius.trim();
  }
  if (branding.fontFamily && isValidFontFamily(branding.fontFamily)) {
    sanitized.fontFamily = branding.fontFamily.trim();
  }
  if (isValidSidebarStyle(branding.sidebarStyle)) {
    sanitized.sidebarStyle = branding.sidebarStyle;
  }
  if (branding.logo && typeof branding.logo === 'string') {
    try {
      const url = new URL(branding.logo);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        sanitized.logo = branding.logo;
      }
    } catch {
      if (branding.logo.startsWith('/') && !branding.logo.includes('..')) {
        sanitized.logo = branding.logo;
      }
    }
  }
  
  return sanitized;
};

const injectTenantBrandingCSS = (branding: TenantBranding) => {
  const sanitized = sanitizeTenantBranding(branding);
  
  let existingStyle = document.getElementById(TENANT_BRANDING_STYLE_ID);
  
  if (!existingStyle) {
    existingStyle = document.createElement('style');
    existingStyle.id = TENANT_BRANDING_STYLE_ID;
    document.head.appendChild(existingStyle);
  }

  const cssVars: string[] = [];
  
  const accentColor = sanitized.primary || sanitized.accent;
  
  if (accentColor) {
    cssVars.push(`--color-accent: ${accentColor}`);
    cssVars.push(`--btn-primary-bg: ${accentColor}`);
    cssVars.push(`--tenant-accent: ${accentColor}`);
    cssVars.push(`--app-accent: ${accentColor}`);
    cssVars.push(`--color-text-on-accent: ${getContrastTextColor(accentColor)}`);
    cssVars.push(`--btn-primary-text: ${getContrastTextColor(accentColor)}`);
    cssVars.push(`--sidebar-item-text-active: ${getContrastTextColor(accentColor)}`);
  }
  
  if (sanitized.accentHover) {
    cssVars.push(`--color-accent-hover: ${sanitized.accentHover}`);
    cssVars.push(`--btn-primary-bg-hover: ${sanitized.accentHover}`);
    cssVars.push(`--tenant-accent-hover: ${sanitized.accentHover}`);
    cssVars.push(`--app-accent-hover: ${sanitized.accentHover}`);
  }
  
  if (sanitized.secondary) {
    cssVars.push(`--btn-secondary-bg: ${sanitized.secondary}`);
    cssVars.push(`--btn-secondary-text: ${getContrastTextColor(sanitized.secondary)}`);
    cssVars.push(`--btn-secondary-bg-hover: ${getLightBgColor(sanitized.secondary)}`);
  }
  
  if (sanitized.background) {
    cssVars.push(`--color-bg: ${sanitized.background}`);
    cssVars.push(`--tenant-bg: ${sanitized.background}`);
    cssVars.push(`--app-bg: ${sanitized.background}`);
  }
  
  if (sanitized.surface) {
    cssVars.push(`--color-surface: ${sanitized.surface}`);
    cssVars.push(`--card-bg: ${sanitized.surface}`);
    cssVars.push(`--tenant-surface: ${sanitized.surface}`);
    cssVars.push(`--app-surface: ${sanitized.surface}`);
  }
  
  if (sanitized.radius) {
    cssVars.push(`--radius: ${sanitized.radius}`);
  }
  
  if (sanitized.success) {
    cssVars.push(`--color-success: ${sanitized.success}`);
    cssVars.push(`--color-text-on-success: ${getContrastTextColor(sanitized.success)}`);
    cssVars.push(`--color-success-bg-light: ${getLightBgColor(sanitized.success)}`);
  }
  
  if (sanitized.warning) {
    cssVars.push(`--color-warning: ${sanitized.warning}`);
    cssVars.push(`--color-text-on-warning: ${getContrastTextColor(sanitized.warning)}`);
    cssVars.push(`--color-warning-bg-light: ${getLightBgColor(sanitized.warning)}`);
  }
  
  if (sanitized.danger) {
    cssVars.push(`--color-danger: ${sanitized.danger}`);
    cssVars.push(`--btn-danger-bg: ${sanitized.danger}`);
    cssVars.push(`--color-text-on-danger: ${getContrastTextColor(sanitized.danger)}`);
    cssVars.push(`--color-danger-bg-light: ${getLightBgColor(sanitized.danger)}`);
  }
  
  if (sanitized.info) {
    cssVars.push(`--color-info: ${sanitized.info}`);
    cssVars.push(`--color-text-on-info: ${getContrastTextColor(sanitized.info)}`);
    cssVars.push(`--color-info-bg-light: ${getLightBgColor(sanitized.info)}`);
  }
  
  if (sanitized.fontFamily) {
    cssVars.push(`--font-family-brand: ${sanitized.fontFamily}`);
    cssVars.push(`font-family: ${sanitized.fontFamily}, var(--font-family-base, Inter, sans-serif)`);
  }

  if (sanitized.sidebarStyle === 'dark') {
    cssVars.push(`--sidebar-bg: #1A1A2E`);
    cssVars.push(`--sidebar-border: #2D2D44`);
    cssVars.push(`--sidebar-text: #E5E5E5`);
    cssVars.push(`--sidebar-item-text: #A0A0A0`);
    cssVars.push(`--sidebar-item-text-hover: #E5E5E5`);
    cssVars.push(`--sidebar-item-text-active: #FFFFFF`);
    cssVars.push(`--sidebar-item-bg: transparent`);
    cssVars.push(`--sidebar-item-bg-hover: rgba(255, 255, 255, 0.05)`);
    cssVars.push(`--sidebar-item-bg-active: rgba(255, 255, 255, 0.1)`);
  } else if (sanitized.sidebarStyle === 'accent' && accentColor) {
    const textColor = getContrastTextColor(accentColor);
    cssVars.push(`--sidebar-bg: ${accentColor}`);
    cssVars.push(`--sidebar-border: ${accentColor}`);
    cssVars.push(`--sidebar-text: ${textColor}`);
    cssVars.push(`--sidebar-item-text: ${textColor === '#FFFFFF' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(31, 41, 55, 0.8)'}`);
    cssVars.push(`--sidebar-item-text-hover: ${textColor}`);
    cssVars.push(`--sidebar-item-text-active: ${textColor}`);
    cssVars.push(`--sidebar-item-bg: transparent`);
    cssVars.push(`--sidebar-item-bg-hover: ${textColor === '#FFFFFF' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`);
    cssVars.push(`--sidebar-item-bg-active: ${textColor === '#FFFFFF' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'}`);
  } else if (sanitized.sidebarStyle === 'light') {
    cssVars.push(`--sidebar-bg: #FFFFFF`);
    cssVars.push(`--sidebar-border: #E5E7EB`);
    cssVars.push(`--sidebar-text: #111827`);
    cssVars.push(`--sidebar-item-text: #6B7280`);
    cssVars.push(`--sidebar-item-text-hover: #111827`);
    cssVars.push(`--sidebar-item-text-active: #FFFFFF`);
    cssVars.push(`--sidebar-item-bg: transparent`);
    cssVars.push(`--sidebar-item-bg-hover: #F3F4F6`);
    cssVars.push(`--sidebar-item-bg-active: var(--color-accent)`);
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
  const existingFontLink = document.getElementById(TENANT_FONT_LINK_ID);
  if (existingFontLink) {
    existingFontLink.remove();
  }
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [tenantBranding, setTenantBranding] = useState<TenantBranding | null>(null);

  const loadTenantBranding = useCallback((branding: TenantBranding) => {
    const sanitized = sanitizeTenantBranding(branding);
    setTenantBranding(sanitized);
    injectTenantBrandingCSS(sanitized);
    console.log('🎨 Tenant branding loaded:', sanitized);
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
