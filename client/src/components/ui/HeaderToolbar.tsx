/**
 * HeaderToolbar — Enterprise-Grade Header Quick Actions
 *
 * Self-contained toolbar dropdown for the header bar.
 * Uses DPF permissions to control visibility of each action.
 * Registry-based: add new tools by appending to TOOLBAR_ITEMS array.
 *
 * Features:
 * - Switch Branch (inline submenu with branch list)
 * - History Log (contextual — reads PageResourceContext, opens DocumentHistoryDrawer)
 * - Journal Entry Preview (placeholder — Coming Soon)
 *
 * Used in: UnifiedTenantLayout header (all panels)
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Settings2,
  GitBranch,
  History,
  BookOpen,
  Check,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslation } from 'react-i18next';
import { getActiveBranch, setActiveBranch } from '@/hooks/useActiveBranch';
import { usePageResource } from '@/contexts/PageResourceContext';
import { useAuditTrail } from '@/hooks/useAuditTrail';
import { DocumentHistoryDrawer } from '@/components/document';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ToolbarContext {
  userBranchCount: number;
}

interface ToolbarItemDef {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  screenCode: string;
  enabled: boolean;
  isVisible?: (ctx: ToolbarContext) => boolean;
  hasSubmenu?: boolean;
  isContextual?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// TOOLBAR ITEMS REGISTRY
// Add new toolbar items here — no JSX changes needed
// ═══════════════════════════════════════════════════════════════

const TOOLBAR_ITEMS: ToolbarItemDef[] = [
  {
    id: 'switch-branch',
    labelKey: 'toolbar.switchBranch',
    icon: GitBranch,
    screenCode: 'TOOLBAR_SWITCH_BRANCH',
    enabled: true,
    isVisible: (ctx) => ctx.userBranchCount >= 2,
    hasSubmenu: true,
  },
  {
    id: 'history-log',
    labelKey: 'toolbar.historyLog',
    icon: History,
    screenCode: 'TOOLBAR_HISTORY_LOG',
    enabled: true,
    isContextual: true,
  },
  {
    id: 'je-preview',
    labelKey: 'toolbar.journalEntryPreview',
    icon: BookOpen,
    screenCode: 'TOOLBAR_JE_PREVIEW',
    enabled: false,
  },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function HeaderToolbar() {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const { canAccessScreen, loading: permissionsLoading } = usePermissions();
  const pageResource = usePageResource();

  const [isOpen, setIsOpen] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeBranch = useMemo(() => getActiveBranch(), [isOpen]);

  // Fetch audit trail when there's a page resource
  const { data: historyEntries = [] } = useAuditTrail(
    pageResource?.resourceType ?? '',
    pageResource?.resourceId,
  );

  // Build toolbar context for visibility checks
  const toolbarCtx: ToolbarContext = useMemo(() => ({
    userBranchCount: user?.branches?.length ?? 0,
  }), [user?.branches?.length]);

  // Filter visible items based on permissions + visibility conditions
  const visibleItems = useMemo(() => {
    if (permissionsLoading || !user) return [];
    return TOOLBAR_ITEMS.filter((item) => {
      if (!canAccessScreen(item.screenCode)) return false;
      if (item.isVisible && !item.isVisible(toolbarCtx)) return false;
      return true;
    });
  }, [permissionsLoading, user, canAccessScreen, toolbarCtx]);

  // Calculate dropdown position
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: isRTL ? rect.right : rect.left,
    });
  }, [isRTL]);

  // Open/close handlers
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        setShowBranches(false);
      }
      return !prev;
    });
  }, []);

  // Update position when opening
  useEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return;
      setIsOpen(false);
      setShowBranches(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setShowBranches(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Branch switch handler
  const handleBranchSwitch = useCallback((branchId: string, branchName: string) => {
    setActiveBranch(branchId, branchName);
    setIsOpen(false);
    setShowBranches(false);
    window.location.href = '/app/dashboard';
  }, []);

  // History Log handler
  const handleHistoryLog = useCallback(() => {
    if (!pageResource) return;
    setIsOpen(false);
    setShowBranches(false);
    setIsHistoryOpen(true);
  }, [pageResource]);

  // Item click dispatcher
  const handleItemClick = useCallback((itemId: string) => {
    if (itemId === 'switch-branch') {
      setShowBranches((prev) => !prev);
    } else if (itemId === 'history-log') {
      handleHistoryLog();
    }
  }, [handleHistoryLog]);

  // Dropdown width
  const DROPDOWN_WIDTH = 240;

  // All hooks called above — safe to return null now
  if (visibleItems.length === 0) return null;

  return (
    <>
      {/* Toolbar trigger button — matches ThemeToggle size/style */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          'inline-flex items-center justify-center rounded-lg transition-colors h-8 w-8',
          'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]',
          'border border-[var(--color-border)]',
          'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]',
        )}
        title={t('toolbar.title')}
        aria-label={t('toolbar.title')}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Settings2 className="h-4 w-4" />
      </button>

      {/* Dropdown via Portal */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          role="menu"
          dir={isRTL ? 'rtl' : 'ltr'}
          className={cn(
            'fixed z-[9999] rounded-lg border shadow-lg overflow-hidden',
            'bg-[var(--select-dropdown-bg,var(--color-surface))]',
            'border-[var(--select-dropdown-border,var(--color-border))]',
          )}
          style={{
            top: dropdownPos.top,
            ...(isRTL
              ? { right: window.innerWidth - dropdownPos.left }
              : { left: dropdownPos.left }),
            width: DROPDOWN_WIDTH,
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
          }}
        >
          {/* Header */}
          <div
            className="px-3 py-2 border-b text-xs font-medium"
            style={{
              color: 'var(--color-text-muted)',
              borderColor: 'var(--color-border)',
            }}
          >
            {t('toolbar.title')}
          </div>

          {/* Items */}
          <div className="py-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isBranchItem = item.id === 'switch-branch';

              // Contextual items are disabled when no page resource is registered
              const isContextualDisabled = item.isContextual && !pageResource;
              const isDisabled = !item.enabled || isContextualDisabled;

              // Badge text: "No Record" for contextual without resource, "Coming Soon" for not-yet-enabled
              const badgeKey = isContextualDisabled
                ? 'toolbar.noRecord'
                : !item.enabled
                  ? 'toolbar.comingSoon'
                  : null;

              return (
                <div key={item.id}>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      handleItemClick(item.id);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer',
                    )}
                    style={{ color: isDisabled ? 'var(--color-text-muted)' : 'var(--color-text)' }}
                    onMouseEnter={(e) => {
                      if (!isDisabled) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                    <span className="flex-1 text-start">{t(item.labelKey)}</span>
                    {badgeKey && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: 'var(--color-surface-hover)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {t(badgeKey)}
                      </span>
                    )}
                    {item.hasSubmenu && !isDisabled && (
                      <ChevronRight
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 transition-transform',
                          isRTL && 'rotate-180',
                          showBranches && (isRTL ? '-rotate-90' : 'rotate-90'),
                        )}
                        style={{ color: 'var(--color-text-muted)' }}
                      />
                    )}
                  </button>

                  {/* Branch submenu */}
                  {isBranchItem && showBranches && user?.branches && (
                    <div
                      className="border-t border-b"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: 'var(--color-bg, var(--color-surface))',
                      }}
                    >
                      {user.branches.map((branch) => {
                        const isActive = activeBranch?.branchId === branch.id;
                        return (
                          <button
                            key={branch.id}
                            type="button"
                            role="menuitem"
                            onClick={() => handleBranchSwitch(branch.id, branch.name)}
                            className={cn(
                              'w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                              isActive && 'font-medium',
                            )}
                            style={{
                              color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                              paddingInlineStart: '2.5rem',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <span className="flex-1 text-start truncate">
                              {branch.name}
                              {branch.code && (
                                <span
                                  className="font-mono text-xs ms-1.5"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  ({branch.code})
                                </span>
                              )}
                            </span>
                            {isActive && (
                              <span className="flex items-center gap-1 shrink-0">
                                <Check className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                                <span
                                  className="text-[10px]"
                                  style={{ color: 'var(--color-primary)' }}
                                >
                                  {t('toolbar.currentBranch')}
                                </span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>,
        document.body,
      )}

      {/* Document History Drawer — opened by History Log toolbar item */}
      <DocumentHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        documentCode={pageResource?.resourceLabel || ''}
        entries={historyEntries}
      />
    </>
  );
}

export default HeaderToolbar;
