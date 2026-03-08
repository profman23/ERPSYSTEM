/**
 * User Style Presets — Enterprise UI Customization Engine
 *
 * Static preset maps for per-user interface customization.
 * Each preset ID → fixed CSS variable overrides. Zero runtime computation.
 * WCAG AA contrast ratios pre-validated per preset.
 *
 * Categories: Accent Color · Header Color · Sidebar Color · Background Pattern
 */

/* ═══ Types ═══ */

export type ThemeColorId = 'default' | 'dark-teal' | 'bright-cyan';

export interface ThemeColorPreset {
  name: string;
  nameAr: string;
  hex: string;
}

export interface UserStylePreferences {
  accentColor: ThemeColorId;
  headerColor: ThemeColorId;
  sidebarColor: ThemeColorId;
  sidebarHoverColor: ThemeColorId;
  showBackgroundPattern: boolean;
}

/* ═══ Presets ═══ */

export const THEME_COLOR_PRESETS: Record<ThemeColorId, ThemeColorPreset> = {
  default:       { name: 'Default',     nameAr: 'الافتراضي',       hex: '' },
  'dark-teal':   { name: 'Dark Teal',   nameAr: 'أخضر مزرق داكن',  hex: '#274654' },
  'bright-cyan': { name: 'Bright Cyan', nameAr: 'سماوي فاتح',      hex: '#40bed7' },
};

/** Text color with sufficient WCAG AA contrast on each background */
const TEXT_ON_COLOR: Record<ThemeColorId, string> = {
  default:       '',
  'dark-teal':   '#FFFFFF',
  'bright-cyan': '#1F2937',
};

/* ═══ Defaults ═══ */

export const DEFAULT_USER_STYLE: UserStylePreferences = {
  accentColor: 'default',
  headerColor: 'default',
  sidebarColor: 'default',
  sidebarHoverColor: 'default',
  showBackgroundPattern: false,
};

/* ═══ CSS Resolution Engine ═══ */

function resolveAccentCSS(id: ThemeColorId): string {
  if (id === 'default') return '';
  const hex = THEME_COLOR_PRESETS[id].hex;
  const hover = adjustBrightness(hex, -15);
  const light = `${hex}14`; // 8% opacity hex suffix
  const text = TEXT_ON_COLOR[id];
  return [
    `--color-accent: ${hex}`,
    `--color-accent-hover: ${hover}`,
    `--color-accent-active: ${adjustBrightness(hex, -25)}`,
    `--color-accent-light: ${light}`,
    `--btn-primary-bg: ${hex}`,
    `--btn-primary-bg-hover: ${hover}`,
    `--btn-primary-text: ${text}`,
    `--btn-outline-border-hover: ${hex}`,
    `--btn-outline-text-hover: ${hex}`,
    `--input-border-focus: ${hex}`,
    `--sidebar-item-bg-active: ${hex}`,
    `--sidebar-item-text-active: ${text}`,
    `--sidebar-icon-color-active: ${text}`,
    `--color-text-on-accent: ${text}`,
  ].join('; ');
}

function resolveHeaderCSS(id: ThemeColorId): string {
  if (id === 'default') return '';
  const hex = THEME_COLOR_PRESETS[id].hex;
  const text = TEXT_ON_COLOR[id];
  return [
    `--header-bg: ${hex}`,
    `--header-text: ${text}`,
    `--header-border: ${adjustBrightness(hex, -10)}`,
  ].join('; ');
}

function resolveSidebarCSS(id: ThemeColorId): string {
  if (id === 'default') return '';
  const hex = THEME_COLOR_PRESETS[id].hex;
  const text = TEXT_ON_COLOR[id];
  const isDark = id === 'dark-teal';
  const itemText = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(31,41,55,0.7)';
  const iconColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(31,41,55,0.5)';
  const iconHover = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(31,41,55,0.8)';
  const hoverBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  return [
    `--sidebar-bg: ${hex}`,
    `--sidebar-border: ${adjustBrightness(hex, -10)}`,
    `--sidebar-text: ${text}`,
    `--sidebar-item-text: ${itemText}`,
    `--sidebar-icon-color: ${iconColor}`,
    `--sidebar-icon-color-hover: ${iconHover}`,
    `--sidebar-item-bg-hover: ${hoverBg}`,
    `--sidebar-item-text-hover: ${text}`,
  ].join('; ');
}

/**
 * Resolves all user presets into a single CSS string for `<style>` injection.
 * Pure function — no side effects, no DOM access.
 */
export function resolvePresetCSS(prefs: UserStylePreferences, theme: 'light' | 'dark'): string {
  const parts = [
    resolveAccentCSS(prefs.accentColor),
    // Header BG and Sidebar BG only apply in light mode — dark mode uses its own colors
    ...(theme === 'light' ? [
      resolveHeaderCSS(prefs.headerColor),
      resolveSidebarCSS(prefs.sidebarColor),
    ] : []),
  ].filter(Boolean);

  if (parts.length === 0) return '';

  // Triple attribute selector for specificity 0-3-0, beating theme selectors at 0-2-0
  const selector = '[data-user-style="active"][data-user-style="active"][data-user-style="active"]';
  return `${selector} { ${parts.join('; ')} }`;
}

/* ═══ Helpers ═══ */

/** Lighten (positive) or darken (negative) a hex color by a fixed amount */
function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
