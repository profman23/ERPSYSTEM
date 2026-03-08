/**
 * ScreenAuthorizationGrid — SAP B1 Style Authorization Grid
 *
 * Clean flat-table design with module header rows and per-screen radio pills.
 * Module headers have bulk-action buttons that auto-inherit to all children.
 * Supports both single-module (tenant) and multi-module (system) layouts.
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Ban, Eye, Pencil } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';

/* ═══ Types ═══ */

export interface ScreenDefinition {
  screenCode: string;
  screenName: string;
  screenNameAr: string;
  route?: string;
}

export interface ModuleDefinition {
  moduleCode: string;
  moduleName: string;
  moduleNameAr: string;
  screens: ScreenDefinition[];
  children?: ModuleDefinition[];
  isParent?: boolean;
}

enum AuthLevel {
  NONE = 0,
  READ_ONLY = 1,
  FULL = 2,
}

const LEVEL_STYLE = {
  [AuthLevel.NONE]: {
    icon: Ban,
    emoji: '🚫',
    selectedClass: 'bg-[var(--color-surface-hover)] border-[var(--color-border)] text-[var(--color-text-secondary)]',
    badgeVariant: 'badge-default' as const,
    labelKey: 'roles.authNoneLabel',
    shortLabelKey: 'roles.authNone',
  },
  [AuthLevel.READ_ONLY]: {
    icon: Eye,
    emoji: '👁️',
    selectedClass: 'bg-[var(--badge-info-bg)] border-[var(--badge-info-border)] text-[var(--color-text-info)]',
    badgeVariant: 'badge-info' as const,
    labelKey: 'roles.authReadOnlyLabel',
    shortLabelKey: 'roles.authReadOnly',
  },
  [AuthLevel.FULL]: {
    icon: Pencil,
    emoji: '✏️',
    selectedClass: 'bg-[var(--badge-success-bg)] border-[var(--badge-success-border)] text-[var(--color-text-success)]',
    badgeVariant: 'badge-success' as const,
    labelKey: 'roles.authFullLabel',
    shortLabelKey: 'roles.authFull',
  },
};

/* ═══ Props ═══ */

interface ScreenAuthorizationGridProps {
  modules: ModuleDefinition[];
  screenAuthorizations: Record<string, number>;
  onAuthLevelChange: (screenCode: string, level: number) => void;
  onModuleLevelChange: (moduleCode: string, level: number) => void;
  isDisabled?: boolean;
}

/* ═══ Helpers ═══ */

/** Collect all screens from a module (including nested children) */
export function getAllModuleScreens(module: ModuleDefinition): ScreenDefinition[] {
  const screens = [...module.screens];
  if (module.children) {
    module.children.forEach(child => screens.push(...child.screens));
  }
  return screens;
}

function getModuleState(
  module: ModuleDefinition,
  auths: Record<string, number>,
): 'none' | 'read' | 'full' | 'mixed' {
  const allScreens = getAllModuleScreens(module);
  if (allScreens.length === 0) return 'none';
  const levels = allScreens.map(s => auths[s.screenCode] || 0);
  if (levels.every(l => l === AuthLevel.NONE)) return 'none';
  if (levels.every(l => l === AuthLevel.READ_ONLY)) return 'read';
  if (levels.every(l => l === AuthLevel.FULL)) return 'full';
  return 'mixed';
}

const STATE_BADGE: Record<string, { labelKey: string; variant: string }> = {
  full: { labelKey: 'roles.authStateFull', variant: 'badge-success' },
  read: { labelKey: 'roles.authStateReadOnly', variant: 'badge-info' },
  mixed: { labelKey: 'roles.authStateMixed', variant: 'badge-warning' },
  none: { labelKey: 'roles.authStateNone', variant: 'badge-default' },
};

/* ═══ Sub-components ═══ */

/** Single authorization level pill button */
function LevelPill({
  level,
  isSelected,
  isDisabled,
  onClick,
}: {
  level: AuthLevel;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const config = LEVEL_STYLE[level];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium
        transition-all duration-150 select-none
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isSelected
          ? `${config.selectedClass} ring-1 ring-offset-1 ring-[var(--color-accent)]`
          : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
        }
      `}
      title={t(config.labelKey)}
    >
      <StyledIcon icon={config.icon} emoji={config.emoji} className="w-3.5 h-3.5" />
      <span className="whitespace-nowrap">{t(config.shortLabelKey)}</span>
    </button>
  );
}

/** Single screen row: name + 3 level pills */
function ScreenRow({
  screen,
  currentLevel,
  onAuthLevelChange,
  isDisabled,
}: {
  screen: ScreenDefinition;
  currentLevel: number;
  onAuthLevelChange: (screenCode: string, level: number) => void;
  isDisabled: boolean;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-[var(--color-surface-hover)]"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <span className="text-sm font-medium text-[var(--color-text)]">
        {isAr && screen.screenNameAr ? screen.screenNameAr : screen.screenName}
      </span>
      <div className="flex gap-1.5">
        {[AuthLevel.NONE, AuthLevel.READ_ONLY, AuthLevel.FULL].map((level) => (
          <LevelPill
            key={level}
            level={level}
            isSelected={currentLevel === level}
            isDisabled={isDisabled}
            onClick={() => onAuthLevelChange(screen.screenCode, level)}
          />
        ))}
      </div>
    </div>
  );
}

/** Module header row: name + state badge + bulk action buttons */
function ModuleHeader({
  module,
  state,
  onSetLevel,
  isDisabled,
}: {
  module: ModuleDefinition;
  state: string;
  onSetLevel: (level: number) => void;
  isDisabled: boolean;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const badge = STATE_BADGE[state];

  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-semibold text-[var(--color-text)]">
          {isAr && module.moduleNameAr ? module.moduleNameAr : module.moduleName}
        </span>
        <Badge className={`border text-[10px] ${badge.variant}`}>{t(badge.labelKey)}</Badge>
      </div>

      <div className="flex gap-1.5">
        {[
          { level: AuthLevel.NONE, labelKey: 'roles.authAllNone', icon: Ban, emoji: '🚫' },
          { level: AuthLevel.READ_ONLY, labelKey: 'roles.authAllRead', icon: Eye, emoji: '👁️' },
          { level: AuthLevel.FULL, labelKey: 'roles.authAllFull', icon: Pencil, emoji: '✏️' },
        ].map(({ level, labelKey, icon, emoji }) => (
          <button
            key={level}
            type="button"
            onClick={() => onSetLevel(level)}
            disabled={isDisabled}
            className={`
              flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border
              transition-colors
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--color-surface-hover)]'}
              bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]
            `}
            title={t(labelKey)}
          >
            <StyledIcon icon={icon} emoji={emoji} className="w-3 h-3" />
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══ Main Component ═══ */

export default function ScreenAuthorizationGrid({
  modules,
  screenAuthorizations,
  onAuthLevelChange,
  onModuleLevelChange,
  isDisabled = false,
}: ScreenAuthorizationGridProps) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const handleModuleLevel = useCallback(
    (moduleCode: string, level: number) => {
      onModuleLevelChange(moduleCode, level);
    },
    [onModuleLevelChange],
  );

  return (
    <div className="space-y-4">
      {modules.map((module) => {
        const state = getModuleState(module, screenAuthorizations);
        const allScreens = getAllModuleScreens(module);

        return (
          <div
            key={module.moduleCode}
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {/* Module header with inheritance buttons */}
            <ModuleHeader
              module={module}
              state={state}
              onSetLevel={(level) => handleModuleLevel(module.moduleCode, level)}
              isDisabled={isDisabled}
            />

            {/* Screen rows — flat list, no accordion */}
            {module.isParent && module.children ? (
              // Parent with children: group by child module
              module.children.map((child) => (
                <div key={child.moduleCode}>
                  {/* Child module sub-header */}
                  <div
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderBottom: '1px solid var(--color-border)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {isAr && child.moduleNameAr ? child.moduleNameAr : child.moduleName}
                  </div>
                  {child.screens.map((screen) => (
                    <ScreenRow
                      key={screen.screenCode}
                      screen={screen}
                      currentLevel={screenAuthorizations[screen.screenCode] || 0}
                      onAuthLevelChange={onAuthLevelChange}
                      isDisabled={isDisabled}
                    />
                  ))}
                </div>
              ))
            ) : (
              // Flat module: direct screen rows
              allScreens.map((screen) => (
                <ScreenRow
                  key={screen.screenCode}
                  screen={screen}
                  currentLevel={screenAuthorizations[screen.screenCode] || 0}
                  onAuthLevelChange={onAuthLevelChange}
                  isDisabled={isDisabled}
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
