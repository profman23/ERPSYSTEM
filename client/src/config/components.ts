/**
 * Component Variants Configuration - Design System
 *
 * Central configuration for all component styles and variants
 * Change button styles, sidebar active state, cards, etc. from one place
 */

// ═══════════════════════════════════════════════════════════════
// BUTTON CONFIGURATION
// ═══════════════════════════════════════════════════════════════
export const buttonConfig = {
  // Border radius for all buttons (user choice: 8px - Rounded)
  borderRadius: '8px',

  // Button variants
  variants: {
    primary: {
      background: 'var(--color-primary)',
      backgroundHover: 'var(--color-primary-hover)',
      text: '#FFFFFF',
      border: 'transparent',
    },
    secondary: {
      background: 'transparent',
      backgroundHover: 'var(--color-primary-alpha-10)',
      text: 'var(--color-primary)',
      border: 'var(--color-primary)',
    },
    danger: {
      background: 'var(--color-danger)',
      backgroundHover: 'var(--color-danger-hover)',
      text: '#FFFFFF',
      border: 'transparent',
    },
    dangerOutline: {
      background: 'transparent',
      backgroundHover: 'var(--color-danger-alpha-10)',
      text: 'var(--color-danger)',
      border: 'var(--color-danger)',
    },
    ghost: {
      background: 'transparent',
      backgroundHover: 'var(--color-surface-hover)',
      text: 'var(--color-text-secondary)',
      border: 'transparent',
    },
    outline: {
      background: 'transparent',
      backgroundHover: 'var(--color-surface-hover)',
      text: 'var(--color-text-primary)',
      border: 'var(--color-border)',
    },
    link: {
      background: 'transparent',
      backgroundHover: 'transparent',
      text: 'var(--color-primary)',
      border: 'transparent',
    },
  },

  // Button sizes
  sizes: {
    xs: {
      padding: '4px 8px',
      fontSize: '12px',
      height: '28px',
      iconSize: '14px',
    },
    sm: {
      padding: '6px 12px',
      fontSize: '13px',
      height: '32px',
      iconSize: '16px',
    },
    md: {
      padding: '10px 20px',
      fontSize: '14px',
      height: '40px',
      iconSize: '18px',
    },
    lg: {
      padding: '14px 28px',
      fontSize: '16px',
      height: '48px',
      iconSize: '20px',
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// SIDEBAR CONFIGURATION
// ═══════════════════════════════════════════════════════════════
export const sidebarConfig = {
  width: '280px',
  collapsedWidth: '72px',
  background: 'var(--color-background)',
  borderColor: 'var(--color-border)',

  // Menu item states
  menuItem: {
    // Default (not selected)
    default: {
      background: 'transparent',
      text: 'var(--color-text-muted)',
      icon: 'var(--color-text-muted)',
      borderRadius: '8px',
    },
    // Hover state
    hover: {
      background: 'var(--color-surface)',
      text: 'var(--color-text-primary)',
      icon: 'var(--color-text-primary)',
    },
    // Active/Selected state (user choice: full primary background)
    active: {
      background: 'var(--color-primary)',
      text: '#FFFFFF',
      icon: '#FFFFFF',
      borderRadius: '8px',
    },
  },

  // Logo section
  logo: {
    height: '64px',
    padding: '0 24px',
    iconBackground: 'var(--color-primary)',
    iconColor: '#FFFFFF',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// CARD CONFIGURATION
// ═══════════════════════════════════════════════════════════════
export const cardConfig = {
  borderRadius: '12px',
  padding: '24px',
  background: 'var(--color-surface)',
  border: 'var(--color-border)',
  borderHover: 'var(--color-border-hover)',

  // Card variants
  variants: {
    default: {
      background: 'var(--color-surface)',
      border: 'var(--color-border)',
      shadow: 'none',
    },
    elevated: {
      background: 'var(--color-surface-elevated)',
      border: 'transparent',
      shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    },
    outlined: {
      background: 'transparent',
      border: 'var(--color-border)',
      shadow: 'none',
    },
    interactive: {
      background: 'var(--color-surface)',
      border: 'var(--color-border)',
      shadow: 'none',
      hoverBackground: 'var(--color-surface-hover)',
      hoverBorder: 'var(--color-border-hover)',
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// INPUT CONFIGURATION
// ═══════════════════════════════════════════════════════════════
export const inputConfig = {
  borderRadius: '8px',
  height: '40px',
  paddingX: '12px',
  paddingY: '10px',
  fontSize: '14px',

  // States
  states: {
    default: {
      background: 'var(--color-surface)',
      border: 'var(--color-border)',
      text: 'var(--color-text-primary)',
      placeholder: 'var(--color-text-muted)',
    },
    focus: {
      border: 'var(--color-primary)',
      ring: 'var(--focus-ring)',
    },
    error: {
      border: 'var(--color-danger)',
      ring: 'var(--focus-ring-danger)',
    },
    disabled: {
      background: 'var(--color-surface-active)',
      text: 'var(--color-text-disabled)',
      cursor: 'not-allowed',
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// BADGE CONFIGURATION
// ═══════════════════════════════════════════════════════════════
export const badgeConfig = {
  borderRadius: '9999px', // Pill shape
  paddingX: '10px',
  paddingY: '4px',
  fontSize: '12px',
  fontWeight: '500',

  // Badge variants
  variants: {
    default: {
      background: 'var(--color-surface-active)',
      text: 'var(--color-text-secondary)',
    },
    primary: {
      background: 'var(--color-primary-alpha-20)',
      text: 'var(--color-primary)',
    },
    success: {
      background: 'var(--color-success-alpha-20)',
      text: 'var(--color-success)',
    },
    warning: {
      background: 'var(--color-warning-alpha-20)',
      text: 'var(--color-warning)',
    },
    danger: {
      background: 'var(--color-danger-alpha-20)',
      text: 'var(--color-danger)',
    },
    info: {
      background: 'var(--color-info-alpha-20)',
      text: 'var(--color-info)',
    },
    outline: {
      background: 'transparent',
      text: 'var(--color-text-secondary)',
      border: 'var(--color-border)',
    },
  },

  // Badge sizes
  sizes: {
    sm: {
      paddingX: '6px',
      paddingY: '2px',
      fontSize: '10px',
    },
    md: {
      paddingX: '10px',
      paddingY: '4px',
      fontSize: '12px',
    },
    lg: {
      paddingX: '14px',
      paddingY: '6px',
      fontSize: '14px',
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// MODAL/DIALOG CONFIGURATION
// ═══════════════════════════════════════════════════════════════
export const modalConfig = {
  borderRadius: '16px',
  background: 'var(--color-surface)',
  border: 'var(--color-border)',
  overlay: 'var(--color-overlay)',

  // Modal sizes
  sizes: {
    sm: { maxWidth: '400px' },
    md: { maxWidth: '500px' },
    lg: { maxWidth: '700px' },
    xl: { maxWidth: '900px' },
    full: { maxWidth: '100%', margin: '24px' },
  },

  // Header/Footer
  header: {
    padding: '24px 24px 0',
    borderBottom: 'none',
  },
  body: {
    padding: '24px',
  },
  footer: {
    padding: '0 24px 24px',
    borderTop: 'none',
    gap: '12px',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// TABLE CONFIGURATION
// ═══════════════════════════════════════════════════════════════
export const tableConfig = {
  borderRadius: '12px',
  background: 'var(--color-surface)',
  border: 'var(--color-border)',

  // Header
  header: {
    background: 'var(--color-surface-active)',
    text: 'var(--color-text-muted)',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '12px 16px',
  },

  // Row
  row: {
    background: 'transparent',
    backgroundHover: 'var(--color-surface-hover)',
    backgroundSelected: 'var(--color-primary-alpha-10)',
    borderBottom: 'var(--color-border-subtle)',
    padding: '16px',
  },

  // Cell
  cell: {
    fontSize: '14px',
    padding: '16px',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// TOOLTIP CONFIGURATION
// ═══════════════════════════════════════════════════════════════
export const tooltipConfig = {
  borderRadius: '6px',
  padding: '8px 12px',
  fontSize: '12px',
  background: 'var(--color-surface-elevated)',
  text: 'var(--color-text-primary)',
  border: 'var(--color-border)',
  maxWidth: '300px',
} as const;

// ═══════════════════════════════════════════════════════════════
// DROPDOWN CONFIGURATION
// ═══════════════════════════════════════════════════════════════
export const dropdownConfig = {
  borderRadius: '8px',
  padding: '4px',
  background: 'var(--color-surface-elevated)',
  border: 'var(--color-border)',
  shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',

  // Item
  item: {
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '14px',
    background: 'transparent',
    backgroundHover: 'var(--color-surface-hover)',
    text: 'var(--color-text-primary)',
    textMuted: 'var(--color-text-muted)',
  },

  // Separator
  separator: {
    height: '1px',
    background: 'var(--color-border)',
    margin: '4px 0',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// TABS CONFIGURATION
// ═══════════════════════════════════════════════════════════════
export const tabsConfig = {
  borderRadius: '8px',

  // Tab list
  list: {
    background: 'var(--color-surface)',
    padding: '4px',
    borderRadius: '8px',
  },

  // Tab trigger
  trigger: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '6px',
    text: 'var(--color-text-muted)',
    textHover: 'var(--color-text-primary)',
    textActive: 'var(--color-text-primary)',
    background: 'transparent',
    backgroundActive: 'var(--color-background)',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// AVATAR CONFIGURATION
// ═══════════════════════════════════════════════════════════════
export const avatarConfig = {
  borderRadius: '9999px', // Circle

  // Sizes
  sizes: {
    xs: { size: '24px', fontSize: '10px' },
    sm: { size: '32px', fontSize: '12px' },
    md: { size: '40px', fontSize: '14px' },
    lg: { size: '48px', fontSize: '16px' },
    xl: { size: '64px', fontSize: '20px' },
  },

  // Fallback (initials)
  fallback: {
    background: 'var(--color-primary)',
    text: '#FFFFFF',
    fontWeight: '600',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// ALERT CONFIGURATION
// ═══════════════════════════════════════════════════════════════
export const alertConfig = {
  borderRadius: '8px',
  padding: '16px',

  // Variants
  variants: {
    info: {
      background: 'var(--color-info-alpha-10)',
      border: 'var(--color-info)',
      text: 'var(--color-info)',
      icon: 'var(--color-info)',
    },
    success: {
      background: 'var(--color-success-alpha-10)',
      border: 'var(--color-success)',
      text: 'var(--color-success)',
      icon: 'var(--color-success)',
    },
    warning: {
      background: 'var(--color-warning-alpha-10)',
      border: 'var(--color-warning)',
      text: 'var(--color-warning)',
      icon: 'var(--color-warning)',
    },
    error: {
      background: 'var(--color-danger-alpha-10)',
      border: 'var(--color-danger)',
      text: 'var(--color-danger)',
      icon: 'var(--color-danger)',
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// EXPORT ALL CONFIGS
// ═══════════════════════════════════════════════════════════════
export default {
  button: buttonConfig,
  sidebar: sidebarConfig,
  card: cardConfig,
  input: inputConfig,
  badge: badgeConfig,
  modal: modalConfig,
  table: tableConfig,
  tooltip: tooltipConfig,
  dropdown: dropdownConfig,
  tabs: tabsConfig,
  avatar: avatarConfig,
  alert: alertConfig,
};
