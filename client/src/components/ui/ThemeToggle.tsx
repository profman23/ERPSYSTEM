/**
 * Theme Toggle Component
 *
 * A toggle button for switching between Dark and Light themes
 *
 * Usage:
 * <ThemeToggle />                    // Default: simple toggle
 * <ThemeToggle showLabel />          // With label
 */

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  variant?: 'cycle' | 'simple'; // kept for compatibility
}

const sizeMap = {
  sm: { button: 'h-8 w-8', icon: 'h-4 w-4', text: 'text-xs' },
  md: { button: 'h-10 w-10', icon: 'h-5 w-5', text: 'text-sm' },
  lg: { button: 'h-12 w-12', icon: 'h-6 w-6', text: 'text-base' },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
export function ThemeToggle({
  size = 'md',
  showLabel = false,
  className,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const sizes = sizeMap[size];

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const Icon = theme === 'dark' ? Moon : Sun;
  const label = theme === 'dark' ? 'Dark' : 'Light';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg transition-colors',
        'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]',
        'border border-[var(--color-border)]',
        'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]',
        showLabel ? 'px-3 py-2' : sizes.button,
        className
      )}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <Icon className={sizes.icon} />
      {showLabel && <span className={sizes.text}>{label}</span>}
    </button>
  );
}

export default ThemeToggle;
