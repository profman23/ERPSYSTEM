/**
 * Spacing Configuration - Design System
 *
 * Consistent spacing values for margins, padding, and gaps
 */

// ═══════════════════════════════════════════════════════════════
// SPACING SCALE (matches Tailwind)
// ═══════════════════════════════════════════════════════════════
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '2px',
  1: '4px',       // xs
  1.5: '6px',
  2: '8px',       // sm
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',      // md (base)
  5: '20px',
  6: '24px',      // lg
  7: '28px',
  8: '32px',      // xl
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',     // 2xl
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
  36: '144px',
  40: '160px',
  44: '176px',
  48: '192px',
  52: '208px',
  56: '224px',
  60: '240px',
  64: '256px',
  72: '288px',
  80: '320px',
  96: '384px',
} as const;

// ═══════════════════════════════════════════════════════════════
// SEMANTIC SPACING - Named for specific use cases
// ═══════════════════════════════════════════════════════════════
export const semanticSpacing = {
  // Component internal padding
  inset: {
    xs: spacing[1],     // 4px
    sm: spacing[2],     // 8px
    md: spacing[4],     // 16px
    lg: spacing[6],     // 24px
    xl: spacing[8],     // 32px
  },

  // Gap between stacked elements
  stack: {
    xs: spacing[1],     // 4px
    sm: spacing[2],     // 8px
    md: spacing[4],     // 16px
    lg: spacing[6],     // 24px
    xl: spacing[8],     // 32px
  },

  // Gap between inline elements
  inline: {
    xs: spacing[1],     // 4px
    sm: spacing[2],     // 8px
    md: spacing[3],     // 12px
    lg: spacing[4],     // 16px
    xl: spacing[6],     // 24px
  },

  // Page sections
  section: {
    sm: spacing[6],     // 24px
    md: spacing[12],    // 48px
    lg: spacing[16],    // 64px
    xl: spacing[24],    // 96px
  },

  // Page margins
  page: {
    x: spacing[6],      // 24px (horizontal)
    y: spacing[6],      // 24px (vertical)
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// COMPONENT-SPECIFIC SPACING
// ═══════════════════════════════════════════════════════════════
export const componentSpacing = {
  // Button padding
  button: {
    xs: { x: spacing[2], y: spacing[1] },           // 8px 4px
    sm: { x: spacing[3], y: spacing[1.5] },         // 12px 6px
    md: { x: spacing[5], y: spacing[2.5] },         // 20px 10px
    lg: { x: spacing[7], y: spacing[3.5] },         // 28px 14px
  },

  // Card padding
  card: {
    sm: spacing[4],     // 16px
    md: spacing[6],     // 24px
    lg: spacing[8],     // 32px
  },

  // Modal padding
  modal: {
    header: spacing[6], // 24px
    body: spacing[6],   // 24px
    footer: spacing[6], // 24px
  },

  // Input padding
  input: {
    x: spacing[3],      // 12px
    y: spacing[2.5],    // 10px
  },

  // Table cell padding
  table: {
    cell: { x: spacing[4], y: spacing[4] },  // 16px
    header: { x: spacing[4], y: spacing[3] }, // 16px 12px
  },

  // Form spacing
  form: {
    fieldGap: spacing[4],    // 16px between fields
    labelGap: spacing[2],    // 8px between label and input
    sectionGap: spacing[8],  // 32px between sections
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// CSS VARIABLE GENERATOR
// ═══════════════════════════════════════════════════════════════
export function generateSpacingVariables(): Record<string, string> {
  const vars: Record<string, string> = {};

  // Add all spacing values
  Object.entries(spacing).forEach(([key, value]) => {
    // Convert 0.5 to 0-5 for CSS variable name
    const cssKey = key.toString().replace('.', '-');
    vars[`--space-${cssKey}`] = value;
  });

  // Add semantic spacing
  vars['--space-inset-xs'] = semanticSpacing.inset.xs;
  vars['--space-inset-sm'] = semanticSpacing.inset.sm;
  vars['--space-inset-md'] = semanticSpacing.inset.md;
  vars['--space-inset-lg'] = semanticSpacing.inset.lg;
  vars['--space-inset-xl'] = semanticSpacing.inset.xl;

  vars['--space-stack-xs'] = semanticSpacing.stack.xs;
  vars['--space-stack-sm'] = semanticSpacing.stack.sm;
  vars['--space-stack-md'] = semanticSpacing.stack.md;
  vars['--space-stack-lg'] = semanticSpacing.stack.lg;
  vars['--space-stack-xl'] = semanticSpacing.stack.xl;

  vars['--space-page-x'] = semanticSpacing.page.x;
  vars['--space-page-y'] = semanticSpacing.page.y;

  return vars;
}

export default {
  spacing,
  semanticSpacing,
  componentSpacing,
};
