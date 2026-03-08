/**
 * ToggleActiveButton — Reusable active/inactive toggle for list pages
 *
 * Follows CLAUDE.md standard:
 * - Ban icon (active → will deactivate) / CheckCircle2 (inactive → will activate)
 * - Colored at REST (danger/success), same color on hover
 * - Loader2 spinner during mutation
 *
 * Usage:
 *   <ToggleActiveButton
 *     isActive={row.isActive}
 *     isLoading={togglingId === row.id}
 *     onClick={() => handleToggle(row)}
 *     activeTitle="Deactivate"
 *     inactiveTitle="Activate"
 *   />
 */

import { Ban, CheckCircle2, Loader2 } from 'lucide-react';

interface ToggleActiveButtonProps {
  isActive: boolean;
  isLoading: boolean;
  onClick: (e: React.MouseEvent) => void;
  activeTitle?: string;
  inactiveTitle?: string;
}

export function ToggleActiveButton({
  isActive,
  isLoading,
  onClick,
  activeTitle = 'Deactivate',
  inactiveTitle = 'Activate',
}: ToggleActiveButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      disabled={isLoading}
      className="w-8 h-8 rounded-md flex items-center justify-center transition-colors disabled:opacity-50"
      style={{ color: isActive ? 'var(--color-danger)' : 'var(--color-success)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      title={isActive ? activeTitle : inactiveTitle}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isActive ? (
        <Ban className="w-4 h-4" />
      ) : (
        <CheckCircle2 className="w-4 h-4" />
      )}
    </button>
  );
}
