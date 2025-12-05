import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
  ChevronRight,
  LogOut,
  Globe
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SystemAdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isRTL, setIsRTL] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    document.documentElement.setAttribute('data-panel', 'system');
    return () => {
      document.documentElement.removeAttribute('data-panel');
    };
  }, []);

  useEffect(() => {
    const checkRTL = () => {
      const dir = document.documentElement.getAttribute('dir') || 'ltr';
      const lang = document.documentElement.lang || 'en';
      setIsRTL(dir === 'rtl' || lang === 'ar');
    };

    checkRTL();
    const observer = new MutationObserver(checkRTL);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir', 'lang'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigation = [
    { name: 'System Dashboard', href: '/system/dashboard', icon: LayoutDashboard, nameAr: 'لوحة النظام' },
    { name: 'Tenants', href: '/system/tenants', icon: Building2, nameAr: 'العملاء' },
    { name: 'Platform Users', href: '/system/users', icon: Users, nameAr: 'مستخدمو النظام' },
    { name: 'Roles & Permissions', href: '/system/roles', icon: Shield, nameAr: 'الأدوار والصلاحيات' },
    { name: 'DPF Manager', href: '/system/dpf', icon: Database, nameAr: 'إدارة DPF' },
    { name: 'Platform Metrics', href: '/system/metrics', icon: Activity, nameAr: 'مقاييس النظام' },
    { name: 'System Settings', href: '/system/settings', icon: Settings, nameAr: 'إعدادات النظام' },
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/system/dashboard') {
      return location.pathname === '/system/dashboard' || location.pathname === '/system';
    }
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`min-h-screen flex bg-panel ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      <aside
        className={`
          ${isSidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'}
          ${isMobile ? 'fixed inset-y-0 z-50 w-64' : 'relative w-64'}
          ${isRTL ? 'border-l' : 'border-r'}
          transition-transform duration-300 ease-in-out
          flex flex-col bg-surface border-panel
        `}
      >
        <div className={`h-16 flex items-center px-6 border-b border-panel ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h1 className="text-sm font-bold text-panel">
                {isRTL ? 'لوحة النظام' : 'System Admin'}
              </h1>
              <p className="text-xs text-secondary">
                {isRTL ? 'إدارة المنصة' : 'Platform Control'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(item.href);
            
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => isMobile && setIsSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isRTL ? 'flex-row-reverse' : ''}
                  ${active ? 'sidebar-item-active' : 'sidebar-item'}
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{isRTL ? item.nameAr : item.name}</span>
                {active && (
                  <ChevronRight className={`w-4 h-4 ml-auto ${isRTL ? 'rotate-180' : ''}`} />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-panel">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium sidebar-item transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>{isRTL ? 'تسجيل الخروج' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 modal-overlay z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-panel flex items-center px-6 bg-surface">
          <div className={`flex items-center gap-4 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg transition-colors btn-ghost"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-bold rounded bg-accent/20 text-accent">
                SYSTEM
              </span>
              <h2 className="text-lg font-semibold text-panel">
                {isRTL ? 'لوحة تحكم النظام' : 'System Control Panel'}
              </h2>
            </div>
          </div>

          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="text-sm text-secondary">
              {user?.email || 'System Admin'}
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold bg-accent">
              S
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-panel">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
