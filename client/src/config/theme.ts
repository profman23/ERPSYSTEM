/**
 * Theme Configuration - Design System
 *
 * Central theme configuration for Dark Mode, Light Mode, and System Auto
 * All colors and design tokens are defined here for easy customization
 *
 * Color choices (user selected):
 * - Primary: #F97316 (Orange)
 * - Background: #0D0D0D (Dark Black)
 * - Surface: #1A1A1A
 * - Text: #F5F5F5
 * - Border: #2D2D2D
 */

// ═══════════════════════════════════════════════════════════════
// DARK THEME (Default)
// ═══════════════════════════════════════════════════════════════
export const darkTheme = {
  // Primary - البرتقالي الرئيسي
  primary: '#F97316',
  primaryHover: '#EA580C',
  primaryActive: '#C2410C',
  primaryLight: '#FDBA74',
  primaryAlpha10: 'rgba(249, 115, 22, 0.1)',
  primaryAlpha20: 'rgba(249, 115, 22, 0.2)',

  // Backgrounds - الخلفيات
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceHover: '#252525',
  surfaceActive: '#2D2D2D',
  surfaceElevated: '#1F1F1F',

  // Text - النصوص
  textPrimary: '#F5F5F5',
  textSecondary: '#D4D4D4',
  textMuted: '#9CA3AF',
  textDisabled: '#6B7280',
  textInverse: '#0D0D0D',

  // Borders - الحدود
  border: '#2D2D2D',
  borderHover: '#404040',
  borderFocus: '#F97316',
  borderSubtle: '#262626',

  // Status Colors - ألوان الحالات
  danger: '#DC2626',
  dangerHover: '#B91C1C',
  dangerLight: '#FEE2E2',
  dangerAlpha10: 'rgba(220, 38, 38, 0.1)',
  dangerAlpha20: 'rgba(220, 38, 38, 0.2)',

  success: '#22C55E',
  successHover: '#16A34A',
  successLight: '#DCFCE7',
  successAlpha10: 'rgba(34, 197, 94, 0.1)',
  successAlpha20: 'rgba(34, 197, 94, 0.2)',

  warning: '#F59E0B',
  warningHover: '#D97706',
  warningLight: '#FEF3C7',
  warningAlpha10: 'rgba(245, 158, 11, 0.1)',
  warningAlpha20: 'rgba(245, 158, 11, 0.2)',

  info: '#3B82F6',
  infoHover: '#2563EB',
  infoLight: '#DBEAFE',
  infoAlpha10: 'rgba(59, 130, 246, 0.1)',
  infoAlpha20: 'rgba(59, 130, 246, 0.2)',

  // Overlay - التغطيات
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',

  // Focus Ring
  focusRing: 'rgba(249, 115, 22, 0.3)',
  focusRingDanger: 'rgba(220, 38, 38, 0.3)',
} as const;

// ═══════════════════════════════════════════════════════════════
// LIGHT THEME
// ═══════════════════════════════════════════════════════════════
export const lightTheme = {
  // Primary - أغمق قليلاً للتباين
  primary: '#EA580C',
  primaryHover: '#C2410C',
  primaryActive: '#9A3412',
  primaryLight: '#FED7AA',
  primaryAlpha10: 'rgba(234, 88, 12, 0.1)',
  primaryAlpha20: 'rgba(234, 88, 12, 0.15)',

  // Backgrounds - معكوسة
  background: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceHover: '#F3F4F6',
  surfaceActive: '#E5E7EB',
  surfaceElevated: '#FFFFFF',

  // Text - معكوسة
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  textDisabled: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Borders - أفتح
  border: '#E5E7EB',
  borderHover: '#D1D5DB',
  borderFocus: '#EA580C',
  borderSubtle: '#F3F4F6',

  // Status Colors - نفسها أو أغمق قليلاً
  danger: '#DC2626',
  dangerHover: '#B91C1C',
  dangerLight: '#FEE2E2',
  dangerAlpha10: 'rgba(220, 38, 38, 0.1)',
  dangerAlpha20: 'rgba(220, 38, 38, 0.15)',

  success: '#16A34A',
  successHover: '#15803D',
  successLight: '#DCFCE7',
  successAlpha10: 'rgba(22, 163, 74, 0.1)',
  successAlpha20: 'rgba(22, 163, 74, 0.15)',

  warning: '#D97706',
  warningHover: '#B45309',
  warningLight: '#FEF3C7',
  warningAlpha10: 'rgba(217, 119, 6, 0.1)',
  warningAlpha20: 'rgba(217, 119, 6, 0.15)',

  info: '#2563EB',
  infoHover: '#1D4ED8',
  infoLight: '#DBEAFE',
  infoAlpha10: 'rgba(37, 99, 235, 0.1)',
  infoAlpha20: 'rgba(37, 99, 235, 0.15)',

  // Overlay - التغطيات
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Focus Ring
  focusRing: 'rgba(234, 88, 12, 0.3)',
  focusRingDanger: 'rgba(220, 38, 38, 0.3)',
} as const;

// ═══════════════════════════════════════════════════════════════
// THEME TYPES
// ═══════════════════════════════════════════════════════════════
export type ThemeColors = typeof darkTheme;
export type ThemeMode = 'dark' | 'light' | 'system';

export const themes = {
  dark: darkTheme,
  light: lightTheme,
} as const;

// ═══════════════════════════════════════════════════════════════
// RADIUS - الزوايا المدورة
// ═══════════════════════════════════════════════════════════════
export const radius = {
  none: '0px',
  sm: '4px',
  md: '8px',       // Default for buttons
  lg: '12px',      // Default for cards
  xl: '16px',
  '2xl': '24px',
  full: '9999px',  // Pills/Badges
} as const;

// ═══════════════════════════════════════════════════════════════
// Z-INDEX SCALE
// ═══════════════════════════════════════════════════════════════
export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  drawer: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  toast: 800,
  max: 9999,
} as const;

// ═══════════════════════════════════════════════════════════════
// BREAKPOINTS
// ═══════════════════════════════════════════════════════════════
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ═══════════════════════════════════════════════════════════════
// LAYOUT
// ═══════════════════════════════════════════════════════════════
export const layout = {
  sidebarWidth: '280px',
  sidebarCollapsedWidth: '72px',
  headerHeight: '64px',
  maxContentWidth: '1400px',
  pageGutter: '24px',
} as const;

// ═══════════════════════════════════════════════════════════════
// CSS VARIABLE GENERATOR
// ═══════════════════════════════════════════════════════════════
export function generateCSSVariables(theme: ThemeColors): Record<string, string> {
  return {
    // Primary
    '--color-primary': theme.primary,
    '--color-primary-hover': theme.primaryHover,
    '--color-primary-active': theme.primaryActive,
    '--color-primary-light': theme.primaryLight,
    '--color-primary-alpha-10': theme.primaryAlpha10,
    '--color-primary-alpha-20': theme.primaryAlpha20,

    // Background
    '--color-background': theme.background,
    '--color-surface': theme.surface,
    '--color-surface-hover': theme.surfaceHover,
    '--color-surface-active': theme.surfaceActive,
    '--color-surface-elevated': theme.surfaceElevated,

    // Text
    '--color-text': theme.textPrimary,
    '--color-text-primary': theme.textPrimary,
    '--color-text-secondary': theme.textSecondary,
    '--color-text-muted': theme.textMuted,
    '--color-text-disabled': theme.textDisabled,
    '--color-text-inverse': theme.textInverse,

    // Border
    '--color-border': theme.border,
    '--color-border-hover': theme.borderHover,
    '--color-border-focus': theme.borderFocus,
    '--color-border-subtle': theme.borderSubtle,

    // Danger
    '--color-danger': theme.danger,
    '--color-danger-hover': theme.dangerHover,
    '--color-danger-light': theme.dangerLight,
    '--color-danger-alpha-10': theme.dangerAlpha10,
    '--color-danger-alpha-20': theme.dangerAlpha20,

    // Success
    '--color-success': theme.success,
    '--color-success-hover': theme.successHover,
    '--color-success-light': theme.successLight,
    '--color-success-alpha-10': theme.successAlpha10,
    '--color-success-alpha-20': theme.successAlpha20,

    // Warning
    '--color-warning': theme.warning,
    '--color-warning-hover': theme.warningHover,
    '--color-warning-light': theme.warningLight,
    '--color-warning-alpha-10': theme.warningAlpha10,
    '--color-warning-alpha-20': theme.warningAlpha20,

    // Info
    '--color-info': theme.info,
    '--color-info-hover': theme.infoHover,
    '--color-info-light': theme.infoLight,
    '--color-info-alpha-10': theme.infoAlpha10,
    '--color-info-alpha-20': theme.infoAlpha20,

    // Overlay
    '--color-overlay': theme.overlay,
    '--color-overlay-light': theme.overlayLight,

    // Focus
    '--focus-ring': theme.focusRing,
    '--focus-ring-danger': theme.focusRingDanger,
  };
}

// ═══════════════════════════════════════════════════════════════
// APPLY THEME TO DOCUMENT
// ═══════════════════════════════════════════════════════════════
export function applyTheme(mode: 'dark' | 'light'): void {
  const theme = themes[mode];
  const variables = generateCSSVariables(theme);

  const root = document.documentElement;
  root.setAttribute('data-theme', mode);

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

// ═══════════════════════════════════════════════════════════════
// GET SYSTEM PREFERENCE
// ═══════════════════════════════════════════════════════════════
export function getSystemThemePreference(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default {
  dark: darkTheme,
  light: lightTheme,
  radius,
  zIndex,
  breakpoints,
  layout,
};
