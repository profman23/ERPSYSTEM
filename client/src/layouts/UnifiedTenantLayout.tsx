/**
 * UnifiedTenantLayout — Unified /app Panel Layout
 *
 * RTL Strategy: We rely on `dir="rtl"` set on <html> by LanguageContext.
 * With dir="rtl", CSS flex-row automatically flows right-to-left.
 * We do NOT add flex-row-reverse for RTL — that would double-reverse.
 * Logical CSS properties (border-e, start-0, ms-auto) handle direction.
 */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Menu,
  X,
  LogOut,
  Building2,
  UserCog,
  Briefcase,
  MapPin,
  Users,
  Shield,
  Settings,
  LayoutDashboard,
  Bell,
  ChevronDown,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  PawPrint,
  DollarSign,
  ListTree,
  Receipt,
  Warehouse,
  Wrench,
  Layers,
  Ruler,
  Package,
  PackageSearch,
  Hash,
  Calendar,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/hooks/usePermissions';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { HeaderToolbar } from '@/components/ui/HeaderToolbar';
import { PageResourceProvider } from '@/contexts/PageResourceContext';
import { StyledIcon } from '@/components/ui/StyledIcon';
import AiAssistantChat from '@/components/ai/AiAssistantChat';
import { useAgiStatus } from '@/hooks/useAgi';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

interface NavChild {
  /** i18n translation key (e.g. 'nav.pets') */
  key: string;
  href: string;
  icon: LucideIcon;
  emoji: string;
  screenCode: string | null;
}

/** A sub-group that renders as a nested accordion inside a parent group */
interface NavSubGroup {
  id: string;
  key: string;
  icon: LucideIcon;
  emoji: string;
  children: NavChild[];
}

type NavGroupChild = NavChild | NavSubGroup;

function isSubGroup(item: NavGroupChild): item is NavSubGroup {
  return 'children' in item && Array.isArray((item as NavSubGroup).children);
}

interface NavGroup {
  id: string;
  /** i18n translation key for the group label */
  key: string;
  icon: LucideIcon;
  emoji: string;
  children: NavGroupChild[];
}

export default function UnifiedTenantLayout() {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('app-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { canAccessScreen, loading: permissionsLoading } = usePermissions();
  const { data: aiStatus } = useAgiStatus();

  useEffect(() => {
    document.documentElement.setAttribute('data-panel', 'app');
    return () => { document.documentElement.removeAttribute('data-panel'); };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isUserMenuOpen]);

  // Persist collapse state
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('app-sidebar-collapsed', String(next)); } catch { /* */ }
      return next;
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // TOP-LEVEL NAV ITEMS (rendered like Dashboard — direct links)
  // ═══════════════════════════════════════════════════════════════
  const topLevelItems: NavChild[] = [
    { key: 'nav.pets', href: '/app/patients', icon: PawPrint, emoji: '🐾', screenCode: 'PATIENT_LIST' },
  ];

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION GROUPS (accordion)
  // ═══════════════════════════════════════════════════════════════
  const administrationGroup: NavGroup = {
    id: 'administration',
    key: 'nav.administration',
    icon: UserCog,
    emoji: '⚙️',
    children: [
      { key: 'nav.businessLines', href: '/app/administration/business-lines', icon: Briefcase, emoji: '💼', screenCode: 'BUSINESS_LINES' },
      { key: 'nav.branches', href: '/app/administration/branches', icon: MapPin, emoji: '📍', screenCode: 'BRANCHES' },
      { key: 'nav.users', href: '/app/administration/users', icon: Users, emoji: '👥', screenCode: 'USERS' },
      { key: 'nav.rolesPermissions', href: '/app/administration/roles', icon: Shield, emoji: '🛡️', screenCode: 'ROLES' },
      { key: 'nav.settings', href: '/app/administration/settings', icon: Settings, emoji: '⚙️', screenCode: null },
      // Setup sub-group (nested accordion)
      {
        id: 'setup',
        key: 'nav.setup',
        icon: Wrench,
        emoji: '🔧',
        children: [
          { key: 'nav.postingPeriods', href: '/app/administration/setup/posting-periods', icon: Calendar, emoji: '📅', screenCode: 'POSTING_PERIODS' },
          { key: 'nav.taxCodes', href: '/app/administration/setup/tax-codes', icon: Receipt, emoji: '🧾', screenCode: 'TAX_CODES' },
          { key: 'nav.documentNumberSeries', href: '/app/administration/setup/document-number-series', icon: Hash, emoji: '#️⃣', screenCode: 'DOCUMENT_NUMBER_SERIES' },
          { key: 'nav.warehouses', href: '/app/administration/setup/warehouses', icon: Warehouse, emoji: '🏭', screenCode: 'WAREHOUSES' },
          { key: 'nav.itemGroups', href: '/app/administration/setup/item-groups', icon: Layers, emoji: '📦', screenCode: 'ITEM_GROUPS' },
          { key: 'nav.unitsOfMeasure', href: '/app/administration/setup/units-of-measure', icon: Ruler, emoji: '📏', screenCode: 'UNITS_OF_MEASURE' },
        ],
      },
    ],
  };

  const financialGroup: NavGroup = {
    id: 'financial',
    key: 'nav.financial',
    icon: DollarSign,
    emoji: '💰',
    children: [
      { key: 'nav.chartOfAccounts', href: '/app/finance/chart-of-accounts', icon: ListTree, emoji: '📊', screenCode: 'CHART_OF_ACCOUNTS' },
      { key: 'nav.journalEntries', href: '/app/finance/journal-entries', icon: BookOpen, emoji: '📖', screenCode: 'JOURNAL_ENTRIES' },
    ],
  };

  const inventoryGroup: NavGroup = {
    id: 'inventory',
    key: 'nav.inventory',
    icon: Package,
    emoji: '📦',
    children: [
      { key: 'nav.itemMaster', href: '/app/inventory/items', icon: PackageSearch, emoji: '📋', screenCode: 'ITEM_MASTER' },
    ],
  };

  const allGroups = [administrationGroup, financialGroup, inventoryGroup];

  const filteredTopLevelItems = useMemo(() => {
    if (permissionsLoading) return topLevelItems;
    return topLevelItems.filter(item =>
      item.screenCode === null || canAccessScreen(item.screenCode)
    );
  }, [permissionsLoading, canAccessScreen]);

  const filteredGroups = useMemo(() => {
    if (permissionsLoading) return allGroups;

    const filterChildren = (children: NavGroupChild[]): NavGroupChild[] => {
      return children
        .map((item) => {
          if (isSubGroup(item)) {
            const filtered = item.children.filter(
              (child) => child.screenCode === null || canAccessScreen(child.screenCode)
            );
            if (filtered.length === 0) return null;
            return { ...item, children: filtered };
          }
          return item.screenCode === null || canAccessScreen(item.screenCode) ? item : null;
        })
        .filter((item): item is NavGroupChild => item !== null);
    };

    return allGroups
      .map((group) => ({ ...group, children: filterChildren(group.children) }))
      .filter((group) => group.children.length > 0);
  }, [permissionsLoading, canAccessScreen]);

  const isActiveRoute = useCallback((href: string) => {
    if (href === '/app/dashboard') {
      return location.pathname === '/app/dashboard' || location.pathname === '/app';
    }
    return location.pathname.startsWith(href);
  }, [location.pathname]);

  // Check which group has an active child (including sub-group children)
  const activeGroupId = useMemo(() => {
    for (const group of allGroups) {
      for (const child of group.children) {
        if (isSubGroup(child)) {
          for (const sub of child.children) {
            if (location.pathname.startsWith(sub.href)) return group.id;
          }
        } else {
          if (location.pathname.startsWith(child.href)) return group.id;
        }
      }
    }
    return null;
  }, [location.pathname]);

  // Check which sub-group has an active child (for auto-expanding nested accordion)
  const activeSubGroupId = useMemo(() => {
    for (const group of allGroups) {
      for (const child of group.children) {
        if (isSubGroup(child)) {
          for (const sub of child.children) {
            if (location.pathname.startsWith(sub.href)) return child.id;
          }
        }
      }
    }
    return null;
  }, [location.pathname]);

  // Determine default open accordion group
  const defaultOpenGroup = useMemo(() => {
    return activeGroupId || undefined;
  }, [activeGroupId]);

  // Controlled accordion state — tracks which group is currently open
  const [openGroupId, setOpenGroupId] = useState<string | null>(defaultOpenGroup || null);

  // Top-level items (Dashboard, Pets) are only visually active when no group is open
  const isTopLevelActive = useCallback((href: string) => {
    if (openGroupId) return false;
    if (href === '/app/dashboard') {
      return location.pathname === '/app/dashboard' || location.pathname === '/app';
    }
    return location.pathname.startsWith(href);
  }, [location.pathname, openGroupId]);

  /** Get the first navigable href from a group's children (skips sub-groups) */
  const getFirstHref = (children: NavGroupChild[]): string => {
    for (const child of children) {
      if (isSubGroup(child)) {
        if (child.children.length > 0) return child.children[0].href;
      } else {
        return child.href;
      }
    }
    return '/app/dashboard';
  };

  const handleLogout = useCallback(async () => {
    setIsUserMenuOpen(false);
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  const userScope = user?.accessScope || 'branch';
  const isTenantOrSystem = userScope === 'tenant' || userScope === 'system';

  // User display
  const userName = user?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  // Effective collapsed: only on desktop
  const collapsed = !isMobile && isCollapsed;

  return (
    <PageResourceProvider>
    <div className="h-screen flex flex-row overflow-hidden bg-panel">
      {/* ═══ SIDEBAR ═══
       * No flex-row-reverse needed — dir="rtl" on <html> reverses flex-row automatically.
       * border-e = border on inline-end side (right in LTR, left in RTL).
       */}
      <aside
        className={cn(
          'flex flex-col sidebar-panel border-e transition-all duration-300 ease-in-out',
          isMobile
            ? cn(
                'fixed inset-y-0 z-50 w-64',
                isRTL ? 'right-0' : 'left-0',
                isSidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
              )
            : `sticky top-0 h-screen flex-shrink-0 ${collapsed ? 'w-[68px]' : 'w-64'}`
        )}
      >
        {/* Sidebar Header */}
        <div className={cn('h-16 flex items-center border-b', collapsed ? 'px-3 justify-center' : 'px-6')} style={{ borderColor: 'var(--sidebar-border, var(--color-border))' }}>
          <div className={cn('flex items-center gap-3')}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent flex-shrink-0">
              <StyledIcon icon={Building2} emoji="🏥" className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-sm font-bold" style={{ color: 'var(--sidebar-text, var(--color-text))' }}>{t('nav.vetClinic')}</h1>
                <p className="text-xs" style={{ color: 'var(--sidebar-item-text, var(--color-text-secondary))' }}>
                  {isTenantOrSystem
                    ? t('nav.managementPanel')
                    : (user?.role || t('nav.staff'))}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={cn('flex-1 py-4 space-y-1 overflow-y-auto', collapsed ? 'px-2' : 'px-3')}>
          {/* Dashboard — always first */}
          <Link
            to="/app/dashboard"
            onClick={() => { setOpenGroupId(null); if (isMobile) setIsSidebarOpen(false); }}
            title={collapsed ? t('nav.dashboard') : undefined}
            className={cn(
              'flex items-center rounded-lg text-sm font-medium transition-all duration-200',
              collapsed ? 'justify-center w-11 h-11 mx-auto' : 'gap-3 px-3 py-2.5',
              isTopLevelActive('/app/dashboard') ? 'sidebar-item-active' : 'sidebar-item'
            )}
          >
            <StyledIcon icon={LayoutDashboard} emoji="📊" className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{t('nav.dashboard')}</span>}
          </Link>

          {/* Top-level items — Pets, etc. */}
          {filteredTopLevelItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => { setOpenGroupId(null); if (isMobile) setIsSidebarOpen(false); }}
              title={collapsed ? t(item.key) : undefined}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-all duration-200',
                collapsed ? 'justify-center w-11 h-11 mx-auto' : 'gap-3 px-3 py-2.5',
                isTopLevelActive(item.href) ? 'sidebar-item-active' : 'sidebar-item'
              )}
            >
              <StyledIcon icon={item.icon} emoji={item.emoji} className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{t(item.key)}</span>}
            </Link>
          ))}

          {/* Accordion Groups */}
          {collapsed ? (
            // Collapsed mode: show each group as a single icon
            filteredGroups.map((group) => {
              const isGroupActive = activeGroupId === group.id;
              const firstChildHref = getFirstHref(group.children);
              return (
                <Link
                  key={group.id}
                  to={firstChildHref}
                  title={t(group.key)}
                  className={cn(
                    'flex items-center justify-center rounded-lg w-11 h-11 mx-auto text-sm font-medium transition-all duration-200',
                    isGroupActive ? 'sidebar-item-active' : 'sidebar-item'
                  )}
                >
                  <StyledIcon icon={group.icon} emoji={group.emoji} className="w-5 h-5 flex-shrink-0" />
                </Link>
              );
            })
          ) : (
            // Expanded mode: Accordion groups
            <Accordion
              type="single"
              className="w-full space-y-1"
              value={openGroupId ? [openGroupId] : []}
              onValueChange={(values) => setOpenGroupId(values[0] || null)}
            >
              {filteredGroups.map((group) => {
                const isGroupActive = activeGroupId === group.id && openGroupId === group.id;
                return (
                  <AccordionItem key={group.id} value={group.id} className="border-none">
                    <AccordionTrigger
                      className={cn(
                        'sidebar-group-trigger hover:no-underline',
                        isGroupActive && 'sidebar-group-active'
                      )}
                    >
                      <span className="flex items-center gap-2 flex-1">
                        <StyledIcon icon={group.icon} emoji={group.emoji} className="w-5 h-5 flex-shrink-0" />
                        {t(group.key)}
                      </span>
                    </AccordionTrigger>

                    <AccordionContent className="pb-0 pt-1">
                      <div className="sidebar-tree-container space-y-1">
                        {group.children.map((item) => {
                          if (isSubGroup(item)) {
                            const isSubActive = item.children.some((s) => isActiveRoute(s.href));
                            return (
                              <Accordion
                                key={item.id}
                                type="single"
                                className="w-full"
                                defaultValue={activeSubGroupId === item.id ? item.id : undefined}
                              >
                                <AccordionItem value={item.id} className="border-none">
                                  <AccordionTrigger
                                    className={cn(
                                      'sidebar-subgroup-trigger hover:no-underline',
                                      isSubActive && 'sidebar-subgroup-active'
                                    )}
                                  >
                                    <span className="flex items-center gap-2 flex-1">
                                      <StyledIcon icon={item.icon} emoji={item.emoji} className="w-4 h-4 flex-shrink-0" />
                                      {t(item.key)}
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent className="pb-0 pt-0.5">
                                    <div className="sidebar-subtree-container space-y-0.5">
                                      {item.children.map((subItem) => {
                                        const active = isActiveRoute(subItem.href);
                                        return (
                                          <Link
                                            key={subItem.href}
                                            to={subItem.href}
                                            onClick={() => isMobile && setIsSidebarOpen(false)}
                                            className={cn('sidebar-child-item', active && 'sidebar-child-item-active')}
                                          >
                                            <StyledIcon icon={subItem.icon} emoji={subItem.emoji} className="w-4 h-4 flex-shrink-0" />
                                            <span>{t(subItem.key)}</span>
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            );
                          }

                          const active = isActiveRoute(item.href);
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              onClick={() => isMobile && setIsSidebarOpen(false)}
                              className={cn('sidebar-child-item', active && 'sidebar-child-item-active')}
                            >
                              <StyledIcon icon={item.icon} emoji={item.emoji} className="w-4 h-4 flex-shrink-0" />
                              <span>{t(item.key)}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </nav>

        {/* Sidebar Footer — Logout + Collapse Toggle */}
        <div className="border-t" style={{ borderColor: 'var(--sidebar-border, var(--color-border))' }}>
          <div className={cn(collapsed ? 'px-2 pt-3 pb-1' : 'px-3 pt-3 pb-1')}>
            <button
              onClick={handleLogout}
              title={collapsed ? t('nav.logout') : undefined}
              className={cn(
                'w-full flex items-center rounded-lg text-sm font-medium sidebar-item transition-colors',
                collapsed ? 'justify-center w-11 h-11 mx-auto' : 'gap-3 px-3 py-2.5'
              )}
            >
              <StyledIcon icon={LogOut} emoji="🚪" className="w-5 h-5" />
              {!collapsed && <span>{t('nav.logout')}</span>}
            </button>
          </div>

          {!isMobile && (
            <div className={cn(collapsed ? 'px-2 pb-3 pt-1' : 'px-3 pb-3 pt-1')}>
              <button
                onClick={toggleCollapse}
                title={collapsed ? t('nav.expand') : t('nav.collapse')}
                className={cn(
                  'w-full flex items-center rounded-lg text-sm font-medium sidebar-item transition-colors',
                  collapsed ? 'justify-center w-11 h-11 mx-auto' : 'gap-3 px-3 py-2.5'
                )}
              >
                {collapsed
                  ? <StyledIcon icon={PanelLeftOpen} emoji="▶️" className={cn('w-5 h-5', isRTL && 'rotate-180')} />
                  : <StyledIcon icon={PanelLeftClose} emoji="◀️" className={cn('w-5 h-5', isRTL && 'rotate-180')} />
                }
                {!collapsed && <span>{t('nav.collapseSidebar')}</span>}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 modal-overlay z-40" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header
         * Uses dir="ltr" to opt out of automatic flex reversal,
         * then manually arranges items for each direction.
         * RTL order (left→right): hamburger, avatar, bell, name, theme ... APP badge
         * LTR order (left→right): hamburger, APP badge ... theme, name, bell, avatar
         */}
        <header
          className="h-16 border-b flex items-center px-4 sm:px-6 flex-shrink-0 sticky top-0 z-10 gap-3"
          dir="ltr"
          style={{
            backgroundColor: 'var(--header-bg, var(--color-surface))',
            borderColor: 'var(--header-border, var(--color-border))',
            color: 'var(--header-text, var(--color-text))',
          }}
        >
          {/* Hamburger — always physical left */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 rounded-lg transition-colors btn-ghost flex-shrink-0"
          >
            {isSidebarOpen
              ? <StyledIcon icon={X} emoji="✖️" className="w-5 h-5" />
              : <StyledIcon icon={Menu} emoji="☰" className="w-5 h-5" />
            }
          </button>

          {isRTL ? (
            <>
              {/* RTL: user controls on the left side */}
              <div className="flex items-center gap-3">
                {/* Avatar dropdown */}
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 p-1 rounded-lg transition-colors"
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { if (!isUserMenuOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold bg-accent">
                      {userInitial}
                    </div>
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', isUserMenuOpen && 'rotate-180')} />
                  </button>

                  {isUserMenuOpen && (
                    <div
                      className="absolute top-full mt-2 left-0 w-52 rounded-lg border shadow-lg overflow-hidden z-50"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
                      }}
                    >
                      <div className="px-4 py-3 border-b text-right" dir="rtl" style={{ borderColor: 'var(--color-border)' }}>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{userName}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{user?.email}</p>
                      </div>
                      <div className="py-1" dir="rtl">
                        <button
                          onClick={() => { setIsUserMenuOpen(false); navigate('/app/my-profile'); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                          style={{ color: 'var(--color-text)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <StyledIcon icon={User} emoji="👤" className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                          <span>{t('profile.title')}</span>
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                          style={{ color: 'var(--color-text-danger)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <StyledIcon icon={LogOut} emoji="🚪" className="w-4 h-4" />
                          <span>{t('nav.logout')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bell */}
                <button
                  className="relative p-2 rounded-lg transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  title={t('nav.notifications')}
                >
                  <StyledIcon icon={Bell} emoji="🔔" className="w-5 h-5" />
                </button>

                {/* Username */}
                <span className="text-sm font-medium hidden md:block" style={{ color: 'inherit' }}>{userName}</span>

                {/* Theme toggle */}
                <ThemeToggle variant="cycle" size="sm" />

                {/* Toolbar */}
                <HeaderToolbar />
              </div>

              <div className="flex-1" />

              {/* RTL: APP badge on the right side */}
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-bold rounded" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'inherit' }}>APP</span>
                <h2 className="text-lg font-semibold hidden sm:block" dir="rtl" style={{ color: 'inherit' }}>
                  {t('nav.applicationPanel')}
                </h2>
              </div>
            </>
          ) : (
            <>
              {/* LTR: APP badge on the left side */}
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-bold rounded" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'inherit' }}>APP</span>
                <h2 className="text-lg font-semibold hidden sm:block" style={{ color: 'inherit' }}>
                  {t('nav.applicationPanel')}
                </h2>
              </div>

              <div className="flex-1" />

              {/* LTR: user controls on the right side */}
              <div className="flex items-center gap-3">
                {/* Theme toggle */}
                <ThemeToggle variant="cycle" size="sm" />

                {/* Toolbar */}
                <HeaderToolbar />

                {/* Username */}
                <span className="text-sm font-medium hidden md:block" style={{ color: 'inherit' }}>{userName}</span>

                {/* Bell */}
                <button
                  className="relative p-2 rounded-lg transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  title={t('nav.notifications')}
                >
                  <StyledIcon icon={Bell} emoji="🔔" className="w-5 h-5" />
                </button>

                {/* Avatar dropdown */}
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 p-1 rounded-lg transition-colors"
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { if (!isUserMenuOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold bg-accent">
                      {userInitial}
                    </div>
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', isUserMenuOpen && 'rotate-180')} />
                  </button>

                  {isUserMenuOpen && (
                    <div
                      className="absolute top-full mt-2 right-0 w-52 rounded-lg border shadow-lg overflow-hidden z-50"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
                      }}
                    >
                      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{userName}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => { setIsUserMenuOpen(false); navigate('/app/my-profile'); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left"
                          style={{ color: 'var(--color-text)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <StyledIcon icon={User} emoji="👤" className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                          <span>{t('profile.title')}</span>
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left"
                          style={{ color: 'var(--color-text-danger)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <StyledIcon icon={LogOut} emoji="🚪" className="w-4 h-4" />
                          <span>{t('nav.logout')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-panel">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* AI Assistant */}
      <AiAssistantChat
        locale={isRTL ? 'ar' : 'en'}
        currentPage={location.pathname}
        currentModule="APP"
        isEnabled={aiStatus?.isEnabled ?? false}
      />
    </div>
    </PageResourceProvider>
  );
}
