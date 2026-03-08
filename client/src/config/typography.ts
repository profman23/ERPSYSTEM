/**
 * Typography Configuration - Design System
 *
 * Font families, sizes, weights, and text styles
 * User choices:
 * - English Font: Inter
 * - Arabic Font: Cairo
 * - Base Size: 14px
 * - Heading Weight: 600 (Semi-Bold)
 */

// ═══════════════════════════════════════════════════════════════
// FONT FAMILIES
// ═══════════════════════════════════════════════════════════════
export const fontFamily = {
  // English font
  en: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

  // Arabic font
  ar: "'Cairo', 'Tajawal', 'Segoe UI', sans-serif",

  // Monospace for code
  mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
} as const;

// ═══════════════════════════════════════════════════════════════
// FONT SIZES
// ═══════════════════════════════════════════════════════════════
export const fontSize = {
  xs: '12px',      // Labels, badges
  sm: '13px',      // Captions, small text
  base: '14px',    // Body text (user choice)
  md: '15px',      // Medium text
  lg: '16px',      // Large text
  xl: '18px',      // Small headings
  '2xl': '20px',   // Medium headings
  '3xl': '24px',   // Large headings
  '4xl': '30px',   // Page titles
  '5xl': '36px',   // Hero text
  '6xl': '48px',   // Display text
} as const;

// ═══════════════════════════════════════════════════════════════
// FONT WEIGHTS
// ═══════════════════════════════════════════════════════════════
export const fontWeight = {
  light: 300,
  normal: 400,     // Body text
  medium: 500,     // Labels, buttons
  semibold: 600,   // Headings (user choice)
  bold: 700,       // Emphasis
} as const;

// ═══════════════════════════════════════════════════════════════
// LINE HEIGHTS
// ═══════════════════════════════════════════════════════════════
export const lineHeight = {
  none: 1,
  tight: 1.25,     // Headings
  snug: 1.375,
  normal: 1.5,     // Body text
  relaxed: 1.625,  // Long paragraphs
  loose: 2,
} as const;

// ═══════════════════════════════════════════════════════════════
// LETTER SPACING
// ═══════════════════════════════════════════════════════════════
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',   // Large headings
  normal: '0',         // Body text
  wide: '0.025em',     // Labels
  wider: '0.05em',     // Uppercase text
  widest: '0.1em',     // Tracking labels
} as const;

// ═══════════════════════════════════════════════════════════════
// TEXT STYLES - Pre-defined combinations
// ═══════════════════════════════════════════════════════════════
export const textStyles = {
  // Headings
  h1: {
    fontSize: fontSize['5xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
  },
  h4: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
  },
  h5: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
  },
  h6: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
  },

  // Body text
  body: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  bodyLarge: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  bodySmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },

  // UI elements
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.tight,
  },
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.tight,
  },
  button: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.none,
  },
  buttonSmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.none,
  },
  code: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
  },
  overline: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// CSS VARIABLE GENERATOR
// ═══════════════════════════════════════════════════════════════
export function generateTypographyVariables(): Record<string, string> {
  return {
    // Font families
    '--font-en': fontFamily.en,
    '--font-ar': fontFamily.ar,
    '--font-mono': fontFamily.mono,

    // Font sizes
    '--text-xs': fontSize.xs,
    '--text-sm': fontSize.sm,
    '--text-base': fontSize.base,
    '--text-md': fontSize.md,
    '--text-lg': fontSize.lg,
    '--text-xl': fontSize.xl,
    '--text-2xl': fontSize['2xl'],
    '--text-3xl': fontSize['3xl'],
    '--text-4xl': fontSize['4xl'],
    '--text-5xl': fontSize['5xl'],
    '--text-6xl': fontSize['6xl'],

    // Font weights
    '--font-light': String(fontWeight.light),
    '--font-normal': String(fontWeight.normal),
    '--font-medium': String(fontWeight.medium),
    '--font-semibold': String(fontWeight.semibold),
    '--font-bold': String(fontWeight.bold),

    // Line heights
    '--leading-none': String(lineHeight.none),
    '--leading-tight': String(lineHeight.tight),
    '--leading-snug': String(lineHeight.snug),
    '--leading-normal': String(lineHeight.normal),
    '--leading-relaxed': String(lineHeight.relaxed),
    '--leading-loose': String(lineHeight.loose),
  };
}

export default {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
};
