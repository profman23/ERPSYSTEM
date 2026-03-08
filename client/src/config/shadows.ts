/**
 * Shadows Configuration - Design System
 *
 * Box shadows and elevation system for depth
 */

// ═══════════════════════════════════════════════════════════════
// SHADOW SCALE - Light Mode
// ═══════════════════════════════════════════════════════════════
export const shadows = {
  none: 'none',

  // Subtle shadow - for slight elevation
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',

  // Small shadow - for cards, buttons
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',

  // Medium shadow - for dropdowns, popovers
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',

  // Large shadow - for modals, dialogs
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',

  // Extra large - for high elevation elements
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',

  // 2xl - for maximum elevation
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

  // Inner shadow - for inset effects
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
} as const;

// ═══════════════════════════════════════════════════════════════
// DARK MODE SHADOWS - Stronger for visibility
// ═══════════════════════════════════════════════════════════════
export const darkShadows = {
  none: 'none',

  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',

  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)',

  md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',

  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',

  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',

  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.7)',

  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.15)',
} as const;

// ═══════════════════════════════════════════════════════════════
// COLORED SHADOWS - For focus rings and emphasis
// ═══════════════════════════════════════════════════════════════
export const coloredShadows = {
  // Primary focus ring
  primaryRing: '0 0 0 3px rgba(249, 115, 22, 0.3)',
  primaryGlow: '0 4px 14px 0 rgba(249, 115, 22, 0.25)',

  // Danger focus ring
  dangerRing: '0 0 0 3px rgba(220, 38, 38, 0.3)',
  dangerGlow: '0 4px 14px 0 rgba(220, 38, 38, 0.25)',

  // Success focus ring
  successRing: '0 0 0 3px rgba(34, 197, 94, 0.3)',
  successGlow: '0 4px 14px 0 rgba(34, 197, 94, 0.25)',

  // Warning focus ring
  warningRing: '0 0 0 3px rgba(245, 158, 11, 0.3)',
  warningGlow: '0 4px 14px 0 rgba(245, 158, 11, 0.25)',

  // Info focus ring
  infoRing: '0 0 0 3px rgba(59, 130, 246, 0.3)',
  infoGlow: '0 4px 14px 0 rgba(59, 130, 246, 0.25)',
} as const;

// ═══════════════════════════════════════════════════════════════
// ELEVATION SYSTEM - Semantic naming
// ═══════════════════════════════════════════════════════════════
export const elevation = {
  // Level 0: Base (no elevation)
  base: shadows.none,

  // Level 1: Raised slightly (cards, tiles)
  raised: shadows.sm,

  // Level 2: Floating (dropdowns, tooltips)
  floating: shadows.md,

  // Level 3: Overlay (modals, dialogs)
  overlay: shadows.lg,

  // Level 4: High (notifications, toasts)
  high: shadows.xl,

  // Level 5: Maximum (critical overlays)
  maximum: shadows['2xl'],
} as const;

// ═══════════════════════════════════════════════════════════════
// CSS VARIABLE GENERATOR
// ═══════════════════════════════════════════════════════════════
export function generateShadowVariables(isDark = false): Record<string, string> {
  const shadowSet = isDark ? darkShadows : shadows;

  return {
    // Shadow scale
    '--shadow-none': shadowSet.none,
    '--shadow-xs': shadowSet.xs,
    '--shadow-sm': shadowSet.sm,
    '--shadow-md': shadowSet.md,
    '--shadow-lg': shadowSet.lg,
    '--shadow-xl': shadowSet.xl,
    '--shadow-2xl': shadowSet['2xl'],
    '--shadow-inner': shadowSet.inner,

    // Elevation
    '--elevation-base': shadows.none,
    '--elevation-raised': isDark ? darkShadows.sm : shadows.sm,
    '--elevation-floating': isDark ? darkShadows.md : shadows.md,
    '--elevation-overlay': isDark ? darkShadows.lg : shadows.lg,
    '--elevation-high': isDark ? darkShadows.xl : shadows.xl,

    // Focus rings
    '--ring-primary': coloredShadows.primaryRing,
    '--ring-danger': coloredShadows.dangerRing,
    '--ring-success': coloredShadows.successRing,
    '--ring-warning': coloredShadows.warningRing,
    '--ring-info': coloredShadows.infoRing,

    // Glows
    '--glow-primary': coloredShadows.primaryGlow,
    '--glow-danger': coloredShadows.dangerGlow,
  };
}

export default {
  shadows,
  darkShadows,
  coloredShadows,
  elevation,
};
