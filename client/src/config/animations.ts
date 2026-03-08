/**
 * Animations Configuration - Design System
 *
 * Transitions, durations, and easing functions
 */

// ═══════════════════════════════════════════════════════════════
// DURATIONS
// ═══════════════════════════════════════════════════════════════
export const duration = {
  instant: '0ms',
  fastest: '50ms',
  faster: '100ms',
  fast: '150ms',
  normal: '200ms',    // Default
  slow: '300ms',
  slower: '400ms',
  slowest: '500ms',
} as const;

// ═══════════════════════════════════════════════════════════════
// EASING FUNCTIONS
// ═══════════════════════════════════════════════════════════════
export const easing = {
  // Standard easings
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',

  // Cubic bezier easings
  easeInCubic: 'cubic-bezier(0.32, 0, 0.67, 0)',
  easeOutCubic: 'cubic-bezier(0.33, 1, 0.68, 1)',
  easeInOutCubic: 'cubic-bezier(0.65, 0, 0.35, 1)',

  // Default for UI (recommended)
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // Entrance
  enter: 'cubic-bezier(0, 0, 0.2, 1)',

  // Exit
  exit: 'cubic-bezier(0.4, 0, 1, 1)',

  // Bounce
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // Spring-like
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

// ═══════════════════════════════════════════════════════════════
// PRE-BUILT TRANSITIONS
// ═══════════════════════════════════════════════════════════════
export const transitions = {
  // General purpose
  all: `all ${duration.normal} ${easing.default}`,
  allFast: `all ${duration.fast} ${easing.default}`,
  allSlow: `all ${duration.slow} ${easing.default}`,

  // Colors only
  colors: `background-color ${duration.normal} ${easing.default}, border-color ${duration.normal} ${easing.default}, color ${duration.normal} ${easing.default}, fill ${duration.normal} ${easing.default}`,
  colorsFast: `background-color ${duration.fast} ${easing.default}, border-color ${duration.fast} ${easing.default}, color ${duration.fast} ${easing.default}, fill ${duration.fast} ${easing.default}`,

  // Opacity
  opacity: `opacity ${duration.normal} ${easing.default}`,
  opacityFast: `opacity ${duration.fast} ${easing.default}`,

  // Transform
  transform: `transform ${duration.normal} ${easing.default}`,
  transformFast: `transform ${duration.fast} ${easing.default}`,

  // Shadow
  shadow: `box-shadow ${duration.normal} ${easing.default}`,

  // Combined common
  button: `background-color ${duration.fast} ${easing.default}, border-color ${duration.fast} ${easing.default}, color ${duration.fast} ${easing.default}, box-shadow ${duration.fast} ${easing.default}, transform ${duration.fast} ${easing.default}`,

  // Modal
  modalIn: `opacity ${duration.normal} ${easing.enter}, transform ${duration.normal} ${easing.enter}`,
  modalOut: `opacity ${duration.fast} ${easing.exit}, transform ${duration.fast} ${easing.exit}`,

  // Dropdown
  dropdown: `opacity ${duration.fast} ${easing.enter}, transform ${duration.fast} ${easing.enter}`,

  // Drawer/Slide
  slideIn: `transform ${duration.slow} ${easing.enter}`,
  slideOut: `transform ${duration.normal} ${easing.exit}`,

  // None
  none: 'none',
} as const;

// ═══════════════════════════════════════════════════════════════
// KEYFRAMES - For CSS @keyframes
// ═══════════════════════════════════════════════════════════════
export const keyframes = {
  fadeIn: {
    from: { opacity: '0' },
    to: { opacity: '1' },
  },
  fadeOut: {
    from: { opacity: '1' },
    to: { opacity: '0' },
  },
  slideInUp: {
    from: { opacity: '0', transform: 'translateY(10px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  slideInDown: {
    from: { opacity: '0', transform: 'translateY(-10px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  slideInLeft: {
    from: { opacity: '0', transform: 'translateX(-10px)' },
    to: { opacity: '1', transform: 'translateX(0)' },
  },
  slideInRight: {
    from: { opacity: '0', transform: 'translateX(10px)' },
    to: { opacity: '1', transform: 'translateX(0)' },
  },
  scaleIn: {
    from: { opacity: '0', transform: 'scale(0.95)' },
    to: { opacity: '1', transform: 'scale(1)' },
  },
  scaleOut: {
    from: { opacity: '1', transform: 'scale(1)' },
    to: { opacity: '0', transform: 'scale(0.95)' },
  },
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  ping: {
    '0%': { transform: 'scale(1)', opacity: '1' },
    '75%, 100%': { transform: 'scale(2)', opacity: '0' },
  },
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
  bounce: {
    '0%, 100%': { transform: 'translateY(-25%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
    '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
  },
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// ANIMATION PRESETS - For animation property
// ═══════════════════════════════════════════════════════════════
export const animations = {
  // Entrances
  fadeIn: `fadeIn ${duration.normal} ${easing.enter}`,
  fadeInFast: `fadeIn ${duration.fast} ${easing.enter}`,
  slideInUp: `slideInUp ${duration.normal} ${easing.enter}`,
  slideInDown: `slideInDown ${duration.normal} ${easing.enter}`,
  scaleIn: `scaleIn ${duration.normal} ${easing.enter}`,

  // Exits
  fadeOut: `fadeOut ${duration.fast} ${easing.exit}`,
  scaleOut: `scaleOut ${duration.fast} ${easing.exit}`,

  // Continuous
  spin: `spin 1s ${easing.linear} infinite`,
  ping: `ping 1s ${easing.default} infinite`,
  pulse: `pulse 2s ${easing.default} infinite`,
  bounce: `bounce 1s infinite`,

  // Attention
  shake: `shake ${duration.slow} ${easing.default}`,
} as const;

// ═══════════════════════════════════════════════════════════════
// CSS VARIABLE GENERATOR
// ═══════════════════════════════════════════════════════════════
export function generateAnimationVariables(): Record<string, string> {
  return {
    // Durations
    '--duration-instant': duration.instant,
    '--duration-fastest': duration.fastest,
    '--duration-faster': duration.faster,
    '--duration-fast': duration.fast,
    '--duration-normal': duration.normal,
    '--duration-slow': duration.slow,
    '--duration-slower': duration.slower,
    '--duration-slowest': duration.slowest,

    // Easings
    '--ease-linear': easing.linear,
    '--ease-default': easing.default,
    '--ease-in': easing.easeInCubic,
    '--ease-out': easing.easeOutCubic,
    '--ease-in-out': easing.easeInOutCubic,
    '--ease-enter': easing.enter,
    '--ease-exit': easing.exit,
    '--ease-bounce': easing.bounce,
    '--ease-spring': easing.spring,

    // Common transitions
    '--transition-all': transitions.all,
    '--transition-colors': transitions.colors,
    '--transition-opacity': transitions.opacity,
    '--transition-transform': transitions.transform,
    '--transition-shadow': transitions.shadow,
    '--transition-button': transitions.button,
    '--transition-none': transitions.none,
  };
}

export default {
  duration,
  easing,
  transitions,
  keyframes,
  animations,
};
