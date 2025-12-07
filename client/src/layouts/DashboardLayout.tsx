import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  GitBranch, 
  Briefcase,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isRTL, setIsRTL] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-panel', 'tenant');
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
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, nameAr: 'لوحة التحكم' },
    { name: 'Tenants', href: '/tenants', icon: Building2, nameAr: 'العملاء' },
    { name: 'Business Lines', href: '/business-lines', icon: Briefcase, nameAr: 'خطوط الأعمال' },
    { name: 'Branches', href: '/branches', icon: GitBranch, nameAr: 'الفروع' },
    { name: 'Users', href: '/users', icon: Users, nameAr: 'المستخدمين' },
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={`min-h-screen bg-panel flex ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      <aside
        className={`
          ${isSidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'}
          ${isMobile ? 'fixed inset-y-0 z-50 w-64' : 'relative w-64'}
          bg-surface border-panel
          ${isRTL ? 'border-l' : 'border-r'}
          transition-transform duration-300 ease-in-out
          flex flex-col
        `}
      >
        <div className={`h-16 flex items-center px-6 border-b border-panel ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent"
            >
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h1 className="text-sm font-bold text-panel">
                {isRTL ? 'نظام ERP البيطري' : 'Veterinary ERP'}
              </h1>
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
          <div className="text-xs text-center text-muted">
            {isRTL ? 'الإصدار 1.0.0' : 'Version 1.0.0'}
          </div>
        </div>
      </aside>

      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 modal-overlay z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-surface border-b border-panel flex items-center px-6">
          <div className={`flex items-center gap-4 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg btn-ghost transition-colors"
            >
              {isSidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            <h2 className="text-lg font-semibold text-panel">
              {isRTL ? 'لوحة التحكم' : 'Dashboard'}
            </h2>
          </div>

          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="text-sm text-secondary">
              {isRTL ? 'مستخدم تجريبي' : 'Demo User'}
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
