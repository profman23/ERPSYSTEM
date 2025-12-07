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

const getContrastRatio = (l1: number, l2: number): number => {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

const DARK_TEXT = '#1F2937';
const LIGHT_TEXT = '#FFFFFF';
const WCAG_AA_THRESHOLD = 4.5;

const ensureWcagContrast = (bgColor: string, preferredTextColor: string): { bg: string; text: string } => {
  const bgRgb = hexToRgb(bgColor);
  if (!bgRgb) return { bg: bgColor, text: preferredTextColor };
  
  const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const darkTextLuminance = getLuminance(0x1F, 0x29, 0x37);
  const lightTextLuminance = getLuminance(0xFF, 0xFF, 0xFF);
  
  const darkContrast = getContrastRatio(bgLuminance, darkTextLuminance);
  const lightContrast = getContrastRatio(bgLuminance, lightTextLuminance);
  
  if (Math.max(darkContrast, lightContrast) >= WCAG_AA_THRESHOLD) {
    return { 
      bg: bgColor, 
      text: darkContrast > lightContrast ? DARK_TEXT : LIGHT_TEXT 
    };
  }
  
  return { bg: bgColor, text: darkContrast > lightContrast ? DARK_TEXT : LIGHT_TEXT };
};

const adjustColorForContrast = (
  bgColor: string, 
  preferredTextColor: string, 
  direction: 'lighten' | 'darken'
): { bg: string; text: string } => {
  const bgRgb = hexToRgb(bgColor);
  if (!bgRgb) return ensureWcagContrast(bgColor, preferredTextColor);
  
  let { r, g, b } = bgRgb;
  
  for (let i = 0; i < 30; i++) {
    const currentBg = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    const bgLuminance = getLuminance(r, g, b);
    
    const darkTextLuminance = getLuminance(0x1F, 0x29, 0x37);
    const lightTextLuminance = getLuminance(0xFF, 0xFF, 0xFF);
    
    const darkContrast = getContrastRatio(bgLuminance, darkTextLuminance);
    const lightContrast = getContrastRatio(bgLuminance, lightTextLuminance);
    const bestContrast = Math.max(darkContrast, lightContrast);
    const bestText = darkContrast > lightContrast ? DARK_TEXT : LIGHT_TEXT;
    
    if (bestContrast >= WCAG_AA_THRESHOLD) {
      return { bg: currentBg, text: bestText };
    }
    
    if (direction === 'lighten') {
      r = Math.min(255, Math.round(r + (255 - r) * 0.08));
      g = Math.min(255, Math.round(g + (255 - g) * 0.08));
      b = Math.min(255, Math.round(b + (255 - b) * 0.08));
    } else {
      r = Math.max(0, Math.round(r * 0.92));
      g = Math.max(0, Math.round(g * 0.92));
      b = Math.max(0, Math.round(b * 0.92));
    }
  }
  
  const finalBg = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  const finalLuminance = getLuminance(r, g, b);
  const darkContrast = getContrastRatio(finalLuminance, getLuminance(0x1F, 0x29, 0x37));
  const lightContrast = getContrastRatio(finalLuminance, getLuminance(0xFF, 0xFF, 0xFF));
  
  return { 
    bg: finalBg, 
    text: darkContrast > lightContrast ? DARK_TEXT : LIGHT_TEXT 
  };
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
  const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
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
    const accentRgb = hexToRgb(accentColor);
    if (accentRgb) {
      const accentLuminance = getLuminance(accentRgb.r, accentRgb.g, accentRgb.b);
      const preferredTextColor = accentLuminance > 0.179 ? DARK_TEXT : LIGHT_TEXT;
      const accentResult = adjustColorForContrast(accentColor, preferredTextColor, accentLuminance > 0.5 ? 'darken' : 'lighten');
      
      cssVars.push(`--color-accent: ${accentResult.bg}`);
      cssVars.push(`--btn-primary-bg: ${accentResult.bg}`);
      cssVars.push(`--tenant-accent: ${accentResult.bg}`);
      cssVars.push(`--app-accent: ${accentResult.bg}`);
      cssVars.push(`--color-text-on-accent: ${accentResult.text}`);
      cssVars.push(`--btn-primary-text: ${accentResult.text}`);
      cssVars.push(`--sidebar-item-text-active: ${accentResult.text}`);
    }
  }
  
  if (sanitized.accentHover) {
    const hoverRgb = hexToRgb(sanitized.accentHover);
    if (hoverRgb) {
      const hoverLuminance = getLuminance(hoverRgb.r, hoverRgb.g, hoverRgb.b);
      const preferredHoverText = hoverLuminance > 0.179 ? DARK_TEXT : LIGHT_TEXT;
      const hoverResult = adjustColorForContrast(sanitized.accentHover, preferredHoverText, hoverLuminance > 0.5 ? 'darken' : 'lighten');
      
      cssVars.push(`--color-accent-hover: ${hoverResult.bg}`);
      cssVars.push(`--btn-primary-bg-hover: ${hoverResult.bg}`);
      cssVars.push(`--tenant-accent-hover: ${hoverResult.bg}`);
      cssVars.push(`--app-accent-hover: ${hoverResult.bg}`);
      cssVars.push(`--btn-primary-text-hover: ${hoverResult.text}`);
    }
  } else if (accentColor) {
    const accentRgb = hexToRgb(accentColor);
    if (accentRgb) {
      const accentLuminance = getLuminance(accentRgb.r, accentRgb.g, accentRgb.b);
      const preferredText = accentLuminance > 0.179 ? DARK_TEXT : LIGHT_TEXT;
      const accentHoverResult = adjustColorForContrast(accentColor, preferredText, 'darken');
      
      cssVars.push(`--color-accent-hover: ${accentHoverResult.bg}`);
      cssVars.push(`--btn-primary-bg-hover: ${accentHoverResult.bg}`);
      cssVars.push(`--tenant-accent-hover: ${accentHoverResult.bg}`);
      cssVars.push(`--app-accent-hover: ${accentHoverResult.bg}`);
      cssVars.push(`--btn-primary-text-hover: ${accentHoverResult.text}`);
    }
  }
  
  if (sanitized.secondary) {
    const secondaryRgb = hexToRgb(sanitized.secondary);
    if (secondaryRgb) {
      const secondaryLuminance = getLuminance(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
      const preferredSecondaryText = secondaryLuminance > 0.179 ? DARK_TEXT : LIGHT_TEXT;
      
      const baseDirection: 'lighten' | 'darken' = secondaryLuminance > 0.5 ? 'darken' : 'lighten';
      const baseResult = adjustColorForContrast(sanitized.secondary, preferredSecondaryText, baseDirection);
      
      const baseRgb = hexToRgb(baseResult.bg);
      const baseLuminance = baseRgb ? getLuminance(baseRgb.r, baseRgb.g, baseRgb.b) : secondaryLuminance;
      const hoverDirection: 'lighten' | 'darken' = baseLuminance > 0.5 ? 'darken' : 'lighten';
      const hoverResult = adjustColorForContrast(baseResult.bg, baseResult.text, hoverDirection);
      
      cssVars.push(`--btn-secondary-bg: ${baseResult.bg}`);
      cssVars.push(`--btn-secondary-text: ${baseResult.text}`);
      cssVars.push(`--btn-secondary-bg-hover: ${hoverResult.bg}`);
      cssVars.push(`--btn-secondary-text-hover: ${hoverResult.text}`);
    }
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
    const successRgb = hexToRgb(sanitized.success);
    if (successRgb) {
      const successLuminance = getLuminance(successRgb.r, successRgb.g, successRgb.b);
      const preferredText = successLuminance > 0.179 ? DARK_TEXT : LIGHT_TEXT;
      const successResult = adjustColorForContrast(sanitized.success, preferredText, successLuminance > 0.5 ? 'darken' : 'lighten');
      cssVars.push(`--color-success: ${successResult.bg}`);
      cssVars.push(`--color-text-on-success: ${successResult.text}`);
      cssVars.push(`--color-success-bg-light: ${getLightBgColor(successResult.bg)}`);
    }
  }
  
  if (sanitized.warning) {
    const warningRgb = hexToRgb(sanitized.warning);
    if (warningRgb) {
      const warningLuminance = getLuminance(warningRgb.r, warningRgb.g, warningRgb.b);
      const preferredText = warningLuminance > 0.179 ? DARK_TEXT : LIGHT_TEXT;
      const warningResult = adjustColorForContrast(sanitized.warning, preferredText, warningLuminance > 0.5 ? 'darken' : 'lighten');
      cssVars.push(`--color-warning: ${warningResult.bg}`);
      cssVars.push(`--color-text-on-warning: ${warningResult.text}`);
      cssVars.push(`--color-warning-bg-light: ${getLightBgColor(warningResult.bg)}`);
    }
  }
  
  if (sanitized.danger) {
    const dangerRgb = hexToRgb(sanitized.danger);
    if (dangerRgb) {
      const dangerLuminance = getLuminance(dangerRgb.r, dangerRgb.g, dangerRgb.b);
      const preferredText = dangerLuminance > 0.179 ? DARK_TEXT : LIGHT_TEXT;
      const dangerResult = adjustColorForContrast(sanitized.danger, preferredText, dangerLuminance > 0.5 ? 'darken' : 'lighten');
      cssVars.push(`--color-danger: ${dangerResult.bg}`);
      cssVars.push(`--btn-danger-bg: ${dangerResult.bg}`);
      cssVars.push(`--color-text-on-danger: ${dangerResult.text}`);
      cssVars.push(`--btn-danger-text: ${dangerResult.text}`);
      cssVars.push(`--color-danger-bg-light: ${getLightBgColor(dangerResult.bg)}`);
    }
  }
  
  if (sanitized.info) {
    const infoRgb = hexToRgb(sanitized.info);
    if (infoRgb) {
      const infoLuminance = getLuminance(infoRgb.r, infoRgb.g, infoRgb.b);
      const preferredText = infoLuminance > 0.179 ? DARK_TEXT : LIGHT_TEXT;
      const infoResult = adjustColorForContrast(sanitized.info, preferredText, infoLuminance > 0.5 ? 'darken' : 'lighten');
      cssVars.push(`--color-info: ${infoResult.bg}`);
      cssVars.push(`--color-text-on-info: ${infoResult.text}`);
      cssVars.push(`--color-info-bg-light: ${getLightBgColor(infoResult.bg)}`);
    }
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
    const accentRgb = hexToRgb(accentColor);
    if (accentRgb) {
      const sidebarLuminance = getLuminance(accentRgb.r, accentRgb.g, accentRgb.b);
      const preferredText = sidebarLuminance > 0.179 ? DARK_TEXT : LIGHT_TEXT;
      const sidebarResult = adjustColorForContrast(accentColor, preferredText, sidebarLuminance > 0.5 ? 'darken' : 'lighten');
      
      const textColor = sidebarResult.text;
      const bgRgb = hexToRgb(sidebarResult.bg);
      
      if (bgRgb) {
        let hoverBg: string;
        let activeBg: string;
        
        if (textColor === LIGHT_TEXT) {
          const hoverR = Math.min(255, bgRgb.r + 15);
          const hoverG = Math.min(255, bgRgb.g + 15);
          const hoverB = Math.min(255, bgRgb.b + 15);
          hoverBg = `#${hoverR.toString(16).padStart(2, '0')}${hoverG.toString(16).padStart(2, '0')}${hoverB.toString(16).padStart(2, '0')}`;
          
          const activeR = Math.min(255, bgRgb.r + 30);
          const activeG = Math.min(255, bgRgb.g + 30);
          const activeB = Math.min(255, bgRgb.b + 30);
          activeBg = `#${activeR.toString(16).padStart(2, '0')}${activeG.toString(16).padStart(2, '0')}${activeB.toString(16).padStart(2, '0')}`;
        } else {
          const hoverR = Math.max(0, bgRgb.r - 15);
          const hoverG = Math.max(0, bgRgb.g - 15);
          const hoverB = Math.max(0, bgRgb.b - 15);
          hoverBg = `#${hoverR.toString(16).padStart(2, '0')}${hoverG.toString(16).padStart(2, '0')}${hoverB.toString(16).padStart(2, '0')}`;
          
          const activeR = Math.max(0, bgRgb.r - 30);
          const activeG = Math.max(0, bgRgb.g - 30);
          const activeB = Math.max(0, bgRgb.b - 30);
          activeBg = `#${activeR.toString(16).padStart(2, '0')}${activeG.toString(16).padStart(2, '0')}${activeB.toString(16).padStart(2, '0')}`;
        }
        
        const hoverResult = adjustColorForContrast(hoverBg, textColor, textColor === LIGHT_TEXT ? 'darken' : 'lighten');
        const activeResult = adjustColorForContrast(activeBg, textColor, textColor === LIGHT_TEXT ? 'darken' : 'lighten');
        
        cssVars.push(`--sidebar-bg: ${sidebarResult.bg}`);
        cssVars.push(`--sidebar-border: ${sidebarResult.bg}`);
        cssVars.push(`--sidebar-text: ${textColor}`);
        cssVars.push(`--sidebar-item-text: ${textColor}`);
        cssVars.push(`--sidebar-item-text-hover: ${textColor}`);
        cssVars.push(`--sidebar-item-text-active: ${textColor}`);
        cssVars.push(`--sidebar-item-bg: ${sidebarResult.bg}`);
        cssVars.push(`--sidebar-item-bg-hover: ${hoverResult.bg}`);
        cssVars.push(`--sidebar-item-bg-active: ${activeResult.bg}`);
      }
    }
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
