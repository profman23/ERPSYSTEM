/**
 * Design System Configuration - Central Export
 *
 * Import everything from this file:
 * import { darkTheme, buttonConfig, typography } from '@/config';
 */

// Theme (Colors)
export {
  darkTheme,
  lightTheme,
  themes,
  radius,
  zIndex,
  breakpoints,
  layout,
  generateCSSVariables,
  applyTheme,
  getSystemThemePreference,
  type ThemeColors,
  type ThemeMode,
} from './theme';

// Component Variants
export {
  buttonConfig,
  sidebarConfig,
  cardConfig,
  inputConfig,
  badgeConfig,
  modalConfig,
  tableConfig,
  tooltipConfig,
  dropdownConfig,
  tabsConfig,
  avatarConfig,
  alertConfig,
} from './components';

// Typography
export {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
  generateTypographyVariables,
} from './typography';

// Spacing
export {
  spacing,
  semanticSpacing,
  componentSpacing,
  generateSpacingVariables,
} from './spacing';

// Shadows
export {
  shadows,
  darkShadows,
  coloredShadows,
  elevation,
  generateShadowVariables,
} from './shadows';

// Animations
export {
  duration,
  easing,
  transitions,
  keyframes,
  animations,
  generateAnimationVariables,
} from './animations';

// Default export with all configs
import themeConfig from './theme';
import componentsConfig from './components';
import typographyConfig from './typography';
import spacingConfig from './spacing';
import shadowsConfig from './shadows';
import animationsConfig from './animations';

export default {
  theme: themeConfig,
  components: componentsConfig,
  typography: typographyConfig,
  spacing: spacingConfig,
  shadows: shadowsConfig,
  animations: animationsConfig,
};
