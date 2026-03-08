import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  Settings,
  Activity,
  Database,
  Menu,
  X,
  LogOut,
  Globe,
  Cpu,
  UserCog,
  Bell,
  ChevronDown,
  User,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/hooks/usePermissions';
import { ErrorBoundary, SystemErrorFallback } from '@/components/ErrorBoundary';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import AiAssistantChat from '@/components/ai/AiAssistantChat';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export default function SystemAdminLayout() {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { canAccessScreen, loading: permissionsLoading } = usePermissions();

  // RTL detection
  useEffect(() => {
    document.documentElement.setAttribute('data-panel', 'system');
    return () => { document.documentElement.removeAttribute('data-panel'); };
  }, []);


  // Responsive
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
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch { /* */ }
      return next;
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════
  const administrationGroup = {
    id: 'administration',
    label: t('nav.administration'),
    icon: UserCog,
    children: [
      { label: t('nav.platformUsers'), href: '/system/administration/users', icon: Users, screenCode: 'SYSTEM_USER_LIST' },
      { label: t('nav.rolesPermissions'), href: '/system/administration/roles', icon: Shield, screenCode: 'SYSTEM_ROLE_LIST' },
    ],
  };

  const standaloneNavigation = [
    { label: t('nav.systemDashboard'), href: '/system/dashboard', icon: LayoutDashboard, screenCode: null },
    { label: t('nav.tenants'), href: '/system/tenants', icon: Building2, screenCode: 'SYSTEM_TENANT_LIST' },
    { label: t('nav.dpfManager'), href: '/system/dpf', icon: Database, screenCode: 'SYSTEM_DPF_MANAGER' },
    { label: t('nav.aiManagement'), href: '/system/ai', icon: Cpu, screenCode: 'SYS_AI_CONFIG' },
    { label: t('nav.platformMetrics'), href: '/system/metrics', icon: Activity, screenCode: 'SYSTEM_METRICS' },
    { label: t('nav.systemSettings'), href: '/system/settings', icon: Settings, screenCode: 'SYSTEM_SETTINGS' },
  ];

  const filteredStandaloneNav = useMemo(() => {
    if (permissionsLoading) return standaloneNavigation;
    return standaloneNavigation.filter(item => item.screenCode === null || canAccessScreen(item.screenCode));
  }, [permissionsLoading, canAccessScreen]);

  const filteredAdminChildren = useMemo(() => {
    if (permissionsLoading) return administrationGroup.children;
    return administrationGroup.children.filter(item => item.screenCode === null || canAccessScreen(item.screenCode));
  }, [permissionsLoading, canAccessScreen]);

  const showAdministrationGroup = filteredAdminChildren.length > 0;

  // Active route detection — exact match for dashboard, startsWith for others
  const isActiveRoute = useCallback((href: string) => {
    if (href === '/system/dashboard') {
      return location.pathname === '/system/dashboard' || location.pathname === '/system';
    }
    return location.pathname.startsWith(href);
  }, [location.pathname]);

  // Check if any child in administration group is active
  const isAdminGroupActive = useMemo(() => {
    return filteredAdminChildren.some(child => location.pathname.startsWith(child.href));
  }, [location.pathname, filteredAdminChildren]);

  const handleLogout = useCallback(async () => {
    setIsUserMenuOpen(false);
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  // User display
  const userName = user?.name || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();

  // Effective collapsed: only on desktop
  const collapsed = !isMobile && isCollapsed;

  return (
    <div className="h-screen flex overflow-hidden bg-panel flex-row">
      {/* ═══ SIDEBAR ═══ */}
      <aside
        className={cn(
          'flex flex-col bg-surface border-panel transition-all duration-300 ease-in-out',
          'border-e',
          isMobile
            ? `fixed inset-y-0 z-50 w-64 ${isRTL ? 'right-0' : 'left-0'} ${isSidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'}`
            : `sticky top-0 h-screen flex-shrink-0 ${collapsed ? 'w-[68px]' : 'w-64'}`
        )}
      >
        {/* Sidebar Header */}
        <div className={cn('h-16 flex items-center border-b border-panel', collapsed ? 'px-3 justify-center' : 'px-6')}>
          <div className={cn('flex items-center gap-3')}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent flex-shrink-0">
              <Globe className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-sm font-bold text-panel">{t('nav.systemAdmin')}</h1>
                <p className="text-xs text-secondary">{t('nav.platformControl')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={cn('flex-1 py-4 space-y-1 overflow-y-auto', collapsed ? 'px-2' : 'px-3')}>
          {/* Dashboard — always first */}
          <Link
            to="/system/dashboard"
            onClick={() => isMobile && setIsSidebarOpen(false)}
            title={collapsed ? t('nav.systemDashboard') : undefined}
            className={cn(
              'flex items-center rounded-lg text-sm font-medium transition-all duration-200',
              collapsed ? 'justify-center w-11 h-11 mx-auto' : 'gap-3 px-3 py-2.5',
              isActiveRoute('/system/dashboard') ? 'sidebar-item-active' : 'sidebar-item'
            )}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{t('nav.systemDashboard')}</span>}
          </Link>

          {/* Administration Group */}
          {showAdministrationGroup && (
            collapsed ? (
              // Collapsed: single icon for the group, navigates to first child
              <Link
                to={filteredAdminChildren[0]?.href || '/system/administration/users'}
                title={administrationGroup.label}
                className={cn(
                  'flex items-center justify-center rounded-lg w-11 h-11 mx-auto text-sm font-medium transition-all duration-200',
                  isAdminGroupActive ? 'sidebar-item-active' : 'sidebar-item'
                )}
              >
                <UserCog className="w-5 h-5 flex-shrink-0" />
              </Link>
            ) : (
              // Expanded: Accordion with children
              <Accordion type="single" className="w-full" defaultValue={isAdminGroupActive ? 'administration' : undefined}>
                <AccordionItem value="administration" className="border-none">
                  <AccordionTrigger
                    className={cn(
                      'sidebar-group-trigger hover:no-underline',
                      isAdminGroupActive && 'sidebar-group-active'
                    )}
                  >
                    <span className={cn('flex items-center gap-2 flex-1')}>
                      <UserCog className="w-5 h-5 flex-shrink-0" />
                      {administrationGroup.label}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0 pt-1">
                    <div className="sidebar-tree-container space-y-1">
                      {filteredAdminChildren.map((item) => {
                        const ItemIcon = item.icon;
                        const active = isActiveRoute(item.href);
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => isMobile && setIsSidebarOpen(false)}
                            className={cn(
                              'sidebar-child-item',
                              active && 'sidebar-child-item-active'
                            )}
                          >
                            <ItemIcon className="w-4 h-4 flex-shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )
          )}

          {/* Standalone Navigation Items (excluding Dashboard) */}
          {filteredStandaloneNav
            .filter(item => item.href !== '/system/dashboard')
            .map((item) => {
              const ItemIcon = item.icon;
              const active = isActiveRoute(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => isMobile && setIsSidebarOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center rounded-lg text-sm font-medium transition-all duration-200',
                    collapsed ? 'justify-center w-11 h-11 mx-auto' : 'gap-3 px-3 py-2.5',
                    active ? 'sidebar-item-active' : 'sidebar-item'
                  )}
                >
                  <ItemIcon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
        </nav>

        {/* Sidebar Footer — Logout + Collapse Toggle */}
        <div className="border-t border-panel">
          {/* Logout */}
          <div className={cn(collapsed ? 'px-2 pt-3 pb-1' : 'px-3 pt-3 pb-1')}>
            <button
              onClick={handleLogout}
              title={collapsed ? t('nav.logout') : undefined}
              className={cn(
                'w-full flex items-center rounded-lg text-sm font-medium sidebar-item transition-colors',
                collapsed ? 'justify-center w-11 h-11 mx-auto' : 'gap-3 px-3 py-2.5'
              )}
            >
              <LogOut className="w-5 h-5" />
              {!collapsed && <span>{t('nav.logout')}</span>}
            </button>
          </div>

          {/* Collapse Toggle (desktop only) */}
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
                  ? <PanelLeftOpen className={cn('w-5 h-5', isRTL && 'rotate-180')} />
                  : <PanelLeftClose className={cn('w-5 h-5', isRTL && 'rotate-180')} />
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
        {/* Header */}
        <header
          className="h-16 border-b flex items-center px-6 flex-shrink-0 sticky top-0 z-10"
          style={{
            backgroundColor: 'var(--header-bg, var(--color-surface))',
            borderColor: 'var(--header-border, var(--color-border))',
            color: 'var(--header-text, var(--color-text))',
          }}
        >
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg transition-colors btn-ghost"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Panel badge + title */}
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-bold rounded bg-accent/20 text-accent">SYSTEM</span>
              <h2 className="text-lg font-semibold text-panel hidden sm:block">
                {t('nav.systemControlPanel')}
              </h2>
            </div>
          </div>

          {/* Right side: ThemeToggle → Name → Bell → Avatar dropdown */}
          <div className="flex items-center gap-3">
            <ThemeToggle variant="cycle" size="sm" />

            <span className="text-sm font-medium text-panel hidden md:block">{userName}</span>

            {/* Notifications bell */}
            <button
              className="relative p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              title={t('nav.notifications')}
            >
              <Bell className="w-5 h-5" />
            </button>

            {/* User menu dropdown */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={cn(
                  'flex items-center gap-1.5 p-1 rounded-lg transition-colors'
                )}
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
                onMouseLeave={(e) => { if (!isUserMenuOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold bg-accent">
                  {userInitial}
                </div>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', isUserMenuOpen && 'rotate-180')} />
              </button>

              {/* Dropdown menu */}
              {isUserMenuOpen && (
                <div
                  className={cn(
                    'absolute top-full mt-2 w-52 rounded-lg border shadow-lg overflow-hidden z-50',
                    'end-0'
                  )}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
                  }}
                >
                  {/* User info */}
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{userName}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{user?.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setIsUserMenuOpen(false); navigate('/system/settings'); }}
                      className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors')}
                      style={{ color: 'var(--color-text)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <User className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                      <span>{t('profile.title')}</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors')}
                      style={{ color: 'var(--color-text-danger)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('nav.logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-panel">
          <ErrorBoundary fallback={<SystemErrorFallback />}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* AI Assistant */}
      <AiAssistantChat
        locale={isRTL ? 'ar' : 'en'}
        currentPage={location.pathname}
        currentModule="SYSTEM"
        isEnabled={true}
      />
    </div>
  );
}
